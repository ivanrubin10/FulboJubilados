import { NextResponse } from 'next/server';
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

export async function POST() {
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

    let playersAdded = 0;
    
    console.log(`Adding mock players without availability votes`);

    // Add each mock player
    for (const player of mockPlayers) {
      try {
        await DatabaseService.addUser({
          ...player,
          imageUrl: player.imageUrl || undefined,
          createdAt: new Date()
        });

        console.log(`Added mock player: ${player.name}`);
        playersAdded++;
      } catch (error) {
        // Player might already exist, just log and continue
        console.log(`Player ${player.name} might already exist:`, error instanceof Error ? error.message : String(error));
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${playersAdded} mock players added without any availability votes`,
      players: mockPlayers.map(p => ({ name: p.name, email: p.email })),
      playersAdded
    });
  } catch (error) {
    console.error('Error adding mock players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}