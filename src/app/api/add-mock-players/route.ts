import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

const mockPlayers = [
  {
    id: 'mock_player_1',
    email: 'carlos.rodriguez@example.com',
    name: 'Carlos Rodríguez',
    nickname: 'Carlitos',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_2',
    email: 'miguel.santos@example.com',
    name: 'Miguel Santos',
    nickname: 'Migue',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_3',
    email: 'fernando.lopez@example.com',
    name: 'Fernando López',
    nickname: 'Fer',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_4',
    email: 'alejandro.martinez@example.com',
    name: 'Alejandro Martínez',
    nickname: 'Alex',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_5',
    email: 'ricardo.herrera@example.com',
    name: 'Ricardo Herrera',
    nickname: 'Ricky',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_6',
    email: 'diego.morales@example.com',
    name: 'Diego Morales',
    nickname: 'Dieguito',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_7',
    email: 'pablo.garcia@example.com',
    name: 'Pablo García',
    nickname: 'Pablito',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_8',
    email: 'andres.torres@example.com',
    name: 'Andrés Torres',
    nickname: 'Andy',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  },
  {
    id: 'mock_player_9',
    email: 'sebastian.ruiz@example.com',
    name: 'Sebastián Ruiz',
    nickname: 'Seba',
    imageUrl: null,
    isAdmin: false,
    isWhitelisted: true
  }
];

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

    // Get current active month
    const { month, year } = await DatabaseService.getCurrentActiveMonth();
    
    // Get all Sundays for the current month
    const getSundaysInMonth = (month: number, year: number): number[] => {
      const sundays: number[] = [];
      const date = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
      
      // Find first Sunday
      while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
      }
      
      // Add all Sundays in the month
      while (date.getMonth() === month - 1) {
        sundays.push(date.getDate());
        date.setDate(date.getDate() + 7);
      }
      
      return sundays;
    };

    const allSundays = getSundaysInMonth(month, year);
    let playersAdded = 0;
    
    console.log(`Setting up mock players for active month: ${month}/${year}`);
    console.log(`Available Sundays in ${month}/${year}:`, allSundays);

    // Add each mock player
    for (const player of mockPlayers) {
      try {
        await DatabaseService.addUser({
          ...player,
          createdAt: new Date()
        });

        // Make ALL mock players available on the FIRST Sunday for easy testing
        let availableSundays;
        if (allSundays.length > 0) {
          // All players available on the first Sunday of the month
          const firstSunday = allSundays[0];
          availableSundays = [firstSunday];
          
          // Also add them to a couple more Sundays for variety
          if (allSundays.length > 1) {
            availableSundays.push(allSundays[1]);
          }
          if (allSundays.length > 2) {
            availableSundays.push(allSundays[2]);
          }
        } else {
          // Fallback if no Sundays found
          availableSundays = [];
        }

        console.log(`Setting availability for ${player.name}:`, availableSundays);

        await DatabaseService.updateMonthlyAvailability(
          player.id,
          month,
          year,
          availableSundays,
          false
        );

        playersAdded++;
      } catch (error) {
        // Player might already exist, try to update their availability anyway
        console.log(`Player ${player.name} might already exist, trying to set availability...`);
        try {
          // Use the same availability logic as above
          let availableSundays;
          if (allSundays.length > 0) {
            const firstSunday = allSundays[0];
            availableSundays = [firstSunday];
            
            if (allSundays.length > 1) {
              availableSundays.push(allSundays[1]);
            }
            if (allSundays.length > 2) {
              availableSundays.push(allSundays[2]);
            }
          } else {
            availableSundays = [];
          }

          await DatabaseService.updateMonthlyAvailability(
            player.id,
            month,
            year,
            availableSundays,
            false
          );
        } catch (availabilityError) {
          console.log(`Failed to set availability for ${player.name}:`, availabilityError);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${playersAdded} mock players added with availability for ${month}/${year}. ALL players available on first Sunday: ${allSundays.length > 0 ? allSundays[0] : 'none'}`,
      players: mockPlayers.map(p => ({ name: p.name, email: p.email })),
      availabilityDetails: {
        month,
        year,
        allSundaysInMonth: allSundays,
        playersWithAvailability: playersAdded,
        totalSundaysInMonth: allSundays.length
      }
    });
  } catch (error) {
    console.error('Error adding mock players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}