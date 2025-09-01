import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { Game } from '@/types';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    
    if (type === 'full-participants') {
      // Get games with 10+ participants for admin notifications (from current month onwards)
      const fullGames = await DatabaseService.getGamesWithFullParticipants();
      
      // Get current active month from settings and filter
      const { month: currentMonth, year: currentYear } = await DatabaseService.getCurrentActiveMonth();
      const filteredFullGames = fullGames.filter(game => {
        const gameDate = new Date(game.date);
        const gameMonth = gameDate.getMonth() + 1;
        const gameYear = gameDate.getFullYear();
        
        // Show games from current month onwards
        return gameYear > currentYear || (gameYear === currentYear && gameMonth >= currentMonth);
      });
      
      return NextResponse.json(filteredFullGames);
    }

    if (type === 'all') {
      // Get ALL games without any filtering (for history page)
      const dbGames = await DatabaseService.getAllGames();
      console.log(`📊 Returning ALL ${dbGames.length} games (unfiltered for history)`);
      
      // Format games with proper date objects
      const formattedGames = dbGames.map(game => ({
        ...game,
        date: new Date(game.date),
        createdAt: new Date(game.createdAt),
        updatedAt: new Date(game.updatedAt)
      }));
      
      const response = NextResponse.json(formattedGames);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }
    
    // Get all games from database and filter by current active month
    try {
      const dbGames = await DatabaseService.getAllGames();
      console.log(`📊 Found ${dbGames.length} total games in database`);
      
      // Get current active month from settings
      const { month: currentMonth, year: currentYear } = await DatabaseService.getCurrentActiveMonth();
      console.log(`📅 Current active month: ${currentMonth}/${currentYear}`);
      
      // Filter games to only show current month and future
      const filteredGames = dbGames.filter(game => {
        const gameDate = new Date(game.date);
        const gameMonth = gameDate.getMonth() + 1;
        const gameYear = gameDate.getFullYear();
        
        // Show games from current month onwards
        return gameYear > currentYear || (gameYear === currentYear && gameMonth >= currentMonth);
      });
      
      console.log(`📊 Filtered to ${filteredGames.length} games from current/future months`);
      
      // Format games with proper date objects
      const formattedGames = filteredGames.map(game => ({
        ...game,
        date: new Date(game.date),
        createdAt: new Date(game.createdAt),
        updatedAt: new Date(game.updatedAt)
      }));
      
      console.log(`📊 Returning ${formattedGames.length} games from database`);
      formattedGames.forEach(game => {
        console.log(`  - Game ${game.id}: ${new Date(game.date).toLocaleDateString()}, status: ${game.status}`);
      });
      
      const response = NextResponse.json(formattedGames);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
      
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
            reservationInfo: game.reservationInfo
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
            reservationInfo: game.reservationInfo
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