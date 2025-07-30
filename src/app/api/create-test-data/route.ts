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
    const { gamesCount = 3, createPlayers = true } = body;

    const results = {
      playersAdded: 0,
      gamesCreated: 0,
      games: [] as Array<{
        gameId: string;
        date: string;
        participants: number | string[];
        sunday: number;
        type?: string;
        result?: string;
      }>,
      errors: [] as string[]
    };

    // Step 1: Add mock players if requested
    if (createPlayers) {
      try {
        const mockPlayersResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/add-mock-players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          }
        });

        if (mockPlayersResponse.ok) {
          const mockData = await mockPlayersResponse.json();
          results.playersAdded = mockData.availabilityDetails?.playersWithAvailability || 9;
        } else {
          results.errors.push('Failed to add mock players');
        }
      } catch (error) {
        results.errors.push(`Error adding mock players: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Step 2: Create multiple test games
    for (let i = 0; i < gamesCount; i++) {
      try {
        // Wait a bit between game creations to avoid conflicts
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const gameResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/create-test-game`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({ participantCount: 10 })
        });

        if (gameResponse.ok) {
          const gameData = await gameResponse.json();
          results.gamesCreated++;
          results.games.push({
            gameId: gameData.gameId,
            date: gameData.gameDate,
            participants: gameData.participants,
            sunday: gameData.selectedSunday
          });
        } else {
          const errorData = await gameResponse.json();
          results.errors.push(`Game ${i + 1}: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        results.errors.push(`Game ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Step 3: Create some historical games (with different dates)
    try {
      const { month, year } = await DatabaseService.getCurrentActiveMonth();
      
      // Create games for previous months to populate history
      const historicalMonths = [
        { month: month > 1 ? month - 1 : 12, year: month > 1 ? year : year - 1 },
        { month: month > 2 ? month - 2 : month > 1 ? 11 : 10, year: month > 2 ? year : year - 1 }
      ];

      for (const { month: histMonth, year: histYear } of historicalMonths) {
        try {
          // Get first Sunday of historical month
          const date = new Date(histYear, histMonth - 1, 1);
          while (date.getDay() !== 0) {
            date.setDate(date.getDate() + 1);
          }
          
          if (date.getMonth() === histMonth - 1) { // Still in the target month
            const gameDate = new Date(histYear, histMonth - 1, date.getDate(), 10, 0, 0, 0);
            
            // Get some users for the historical game
            const allUsers = await DatabaseService.getUsers();
            const availableUsers = allUsers.filter(u => u.isWhitelisted).slice(0, 10);
            
            if (availableUsers.length >= 10) {
              // Create game with random result
              const team1Score = Math.floor(Math.random() * 6);
              const team2Score = Math.floor(Math.random() * 6);
              const sampleNotes = [
                'Partido muy reñido hasta el final',
                'Gran actuación del portero',
                'Muchos goles en el segundo tiempo',
                'Partido físico pero limpio',
                'Excelente nivel de juego de ambos equipos'
              ];
              const randomNotes = Math.random() > 0.5 ? sampleNotes[Math.floor(Math.random() * sampleNotes.length)] : undefined;

              const gameId = await DatabaseService.createGame({
                date: gameDate,
                participants: availableUsers.map(u => u.id).slice(0, 10),
                status: 'completed',
                teams: {
                  team1: availableUsers.slice(0, 5).map(u => u.id),
                  team2: availableUsers.slice(5, 10).map(u => u.id)
                },
                result: {
                  team1Score,
                  team2Score,
                  notes: randomNotes
                }
              });

              results.gamesCreated++;
              results.games.push({
                gameId,
                date: gameDate.toISOString(),
                participants: 10,
                sunday: date.getDate(),
                type: 'historical',
                result: `${team1Score}-${team2Score}`
              });
            }
          }
        } catch (error) {
          results.errors.push(`Historical game for ${histMonth}/${histYear}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      results.errors.push(`Historical games creation: ${error instanceof Error ? error.message : String(error)}`);
    }

    return NextResponse.json({
      success: true,
      message: `Test data created: ${results.playersAdded} players added, ${results.gamesCreated} games created`,
      details: results
    });

  } catch (error) {
    console.error('Error creating test data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}