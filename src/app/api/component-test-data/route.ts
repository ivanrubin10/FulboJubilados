import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      // Get all users
      const allUsers = await DatabaseService.getUsers();
      const availableUsers = allUsers.filter(u => u.isWhitelisted);

      if (availableUsers.length < 12) {
        return NextResponse.json({
          error: `Not enough users. Need at least 12, have ${availableUsers.length}. Add mock players first.`
        }, { status: 400 });
      }

      // Get next Sunday
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
      nextSunday.setHours(10, 0, 0, 0);

      const createdGames = [];

      // Game 1: Scheduled with 10 players (yellow card)
      const game1Id = await DatabaseService.createGame({
        date: new Date(nextSunday),
        participants: availableUsers.slice(0, 10).map(u => u.id),
        status: 'scheduled'
      });
      createdGames.push({ id: game1Id, type: 'scheduled_10' });

      // Game 2: Scheduled with 12 players (10 + 2 waitlist)
      const scheduledDate2 = new Date(nextSunday);
      scheduledDate2.setDate(nextSunday.getDate() + 7);
      const game2Id = await DatabaseService.createGame({
        date: scheduledDate2,
        participants: availableUsers.slice(0, 10).map(u => u.id),
        waitlist: availableUsers.slice(10, 12).map(u => u.id),
        status: 'scheduled'
      });
      createdGames.push({ id: game2Id, type: 'scheduled_waitlist' });

      // Game 3: Confirmed with reservation info
      const confirmedDate = new Date(nextSunday);
      confirmedDate.setDate(nextSunday.getDate() + 14);
      const game3Id = await DatabaseService.createGame({
        date: confirmedDate,
        participants: availableUsers.slice(0, 10).map(u => u.id),
        status: 'confirmed',
        reservationInfo: {
          location: 'Cancha Test Component',
          time: '10:00',
          cost: 200,
          reservedBy: userId,
          mapsLink: 'https://maps.google.com',
        }
      });
      createdGames.push({ id: game3Id, type: 'confirmed' });

      // Game 4: Confirmed with teams
      const teamsDate = new Date(nextSunday);
      teamsDate.setDate(nextSunday.getDate() + 21);
      const game4Id = await DatabaseService.createGame({
        date: teamsDate,
        participants: availableUsers.slice(0, 10).map(u => u.id),
        status: 'confirmed',
        reservationInfo: {
          location: 'Cancha Test Component',
          time: '10:00',
          cost: 200,
          reservedBy: userId,
        },
        teams: {
          team1: availableUsers.slice(0, 5).map(u => u.id),
          team2: availableUsers.slice(5, 10).map(u => u.id),
        }
      });
      createdGames.push({ id: game4Id, type: 'confirmed_teams' });

      return NextResponse.json({
        success: true,
        message: 'Component test games created',
        games: createdGames
      });
    } else if (action === 'cleanup') {
      // Get all games
      const allGames = await DatabaseService.getAllGames();

      // Filter test games (those with "Test Component" in location or recent scheduled/confirmed games)
      const testGames = allGames.filter(game =>
        game.reservationInfo?.location?.includes('Test Component') ||
        (game.status === 'scheduled' && !game.reservationInfo)
      );

      // Delete each test game
      for (const game of testGames) {
        await DatabaseService.deleteGame(game.id);
      }

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${testGames.length} test games`,
        deletedCount: testGames.length
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "create" or "cleanup"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing component test data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
