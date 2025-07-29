import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { Game } from '@/types';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    
    if (type === 'full-participants') {
      // Get games with 10+ participants for admin notifications
      const fullGames = await DatabaseService.getGamesWithFullParticipants();
      return NextResponse.json(fullGames);
    }
    
    // Get all games from database only
    try {
      const dbGames = await DatabaseService.getAllGames();
      console.log(`📊 Found ${dbGames.length} games in database`);
      
      // Format games with proper date objects
      const formattedGames = dbGames.map(game => ({
        ...game,
        date: new Date(game.date),
        createdAt: new Date(game.createdAt),
        updatedAt: new Date(game.updatedAt)
      }));
      
      console.log(`📊 Returning ${formattedGames.length} games from database`);
      formattedGames.forEach(game => {
        console.log(`  - Game ${game.id}: ${new Date(game.date).toLocaleDateString()}, status: ${game.status}`);
      });
      
      return NextResponse.json(formattedGames);
      
    } catch (dbError) {
      console.error('Error fetching from database:', dbError);
      return NextResponse.json({ error: 'Failed to fetch games from database' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a single game creation request
    if (body.date && body.participants !== undefined) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const gameId = await DatabaseService.createGame({
        date: new Date(body.date),
        participants: body.participants || [],
        status: 'scheduled'
      });

      // Check if we need to notify admins
      if (body.participants && body.participants.length >= 10) {
        await DatabaseService.checkAndNotifyAdminsForFullGames();
      }

      return NextResponse.json({ gameId, success: true });
    }
    
    // Save games array to database
    const games: Game[] = body;
    console.log('💾 Saving games array to database:', games.length, 'games');
    
    try {
      // Get existing games from database
      const existingDbGames = await DatabaseService.getAllGames();
      console.log(`🗄️ Found ${existingDbGames.length} existing games in database`);
      
      for (const game of games) {
        // Check if game already exists in database (check by date only, ignoring time)
        const existingGame = existingDbGames.find(dbGame => {
          const gameDate = new Date(game.date);
          const dbGameDate = new Date(dbGame.date);
          
          // Compare only year, month, and day (ignore time)
          return gameDate.getFullYear() === dbGameDate.getFullYear() &&
                 gameDate.getMonth() === dbGameDate.getMonth() &&
                 gameDate.getDate() === dbGameDate.getDate();
        });
        
        if (existingGame) {
          // Update existing game
          console.log(`🔄 Updating existing game: ${existingGame.id}`);
          await DatabaseService.updateGame(existingGame.id, {
            status: game.status,
            participants: game.participants,
            teams: game.teams,
            result: game.result,
            reservationInfo: game.reservationInfo,
            customTime: game.customTime
          });
        } else {
          // Create new game
          console.log(`➕ Creating new game for date: ${game.date}`);
          await DatabaseService.createGame({
            date: new Date(game.date),
            participants: game.participants,
            status: game.status || 'scheduled',
            teams: game.teams,
            result: game.result,
            reservationInfo: game.reservationInfo,
            customTime: game.customTime
          });
        }
      }
      
      console.log('✅ All games saved to database successfully');
      return NextResponse.json({ success: true });
      
    } catch (dbError) {
      console.error('❌ Error saving games to database:', dbError);
      return NextResponse.json({ error: 'Failed to save games to database' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling games request:', error);
    return NextResponse.json({ error: 'Failed to handle games request' }, { status: 500 });
  }
} 