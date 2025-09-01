import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

// Add user to waitlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { userIdToAdd } = await request.json();

    const game = await DatabaseService.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if user is already a participant or in waitlist
    const currentParticipants = game.participants || [];
    const currentWaitlist = game.waitlist || [];

    if (currentParticipants.includes(userIdToAdd)) {
      return NextResponse.json({ error: 'User is already a participant' }, { status: 400 });
    }

    if (currentWaitlist.includes(userIdToAdd)) {
      return NextResponse.json({ error: 'User is already in waitlist' }, { status: 400 });
    }

    // Add to waitlist
    const updatedWaitlist = [...currentWaitlist, userIdToAdd];
    
    await DatabaseService.updateGame(gameId, {
      waitlist: updatedWaitlist
    });

    console.log(`✅ Admin ${userId} added user ${userIdToAdd} to waitlist for game ${gameId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    console.error(`❌ Error adding user to waitlist for game ${id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to add user to waitlist' 
    }, { status: 500 });
  }
}

// Remove user from participants and promote from waitlist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { userIdToRemove, userIdToAdd } = await request.json();

    const game = await DatabaseService.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const currentParticipants = game.participants || [];
    const currentWaitlist = game.waitlist || [];

    // If removing a user from participants
    if (userIdToRemove) {
      if (!currentParticipants.includes(userIdToRemove)) {
        return NextResponse.json({ error: 'User is not a participant' }, { status: 400 });
      }

      const baseParticipants = currentParticipants.filter(id => id !== userIdToRemove);
      let updatedWaitlist = [...currentWaitlist];
      let updatedParticipants = baseParticipants;

      // If adding a specific user (manual replacement)
      if (userIdToAdd) {
        // Check if the user to add is already a participant or in waitlist
        if (currentParticipants.includes(userIdToAdd)) {
          return NextResponse.json({ error: 'Replacement user is already a participant' }, { status: 400 });
        }

        // Remove from waitlist if they're there, then add to participants
        updatedWaitlist = updatedWaitlist.filter(id => id !== userIdToAdd);
        updatedParticipants = [...baseParticipants, userIdToAdd];
        
        console.log(`✅ Admin ${userId} replaced participant ${userIdToRemove} with ${userIdToAdd} in game ${gameId}`);
      } else if (currentWaitlist.length > 0) {
        // Promote first person from waitlist
        const promotedUserId = currentWaitlist[0];
        updatedWaitlist = currentWaitlist.slice(1);
        updatedParticipants = [...baseParticipants, promotedUserId];
        
        console.log(`✅ Admin ${userId} removed participant ${userIdToRemove} and promoted ${promotedUserId} from waitlist in game ${gameId}`);
      } else {
        console.log(`✅ Admin ${userId} removed participant ${userIdToRemove} from game ${gameId}, no waitlist available`);
      }

      await DatabaseService.updateGame(gameId, {
        participants: updatedParticipants,
        waitlist: updatedWaitlist
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    console.error(`❌ Error managing waitlist for game ${id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to manage waitlist' 
    }, { status: 500 });
  }
}

// Remove user from waitlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: gameId } = await params;
    const { searchParams } = new URL(request.url);
    const userIdToRemove = searchParams.get('userId');

    if (!userIdToRemove) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const game = await DatabaseService.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const currentWaitlist = game.waitlist || [];

    if (!currentWaitlist.includes(userIdToRemove)) {
      return NextResponse.json({ error: 'User is not in waitlist' }, { status: 400 });
    }

    // Remove from waitlist
    const updatedWaitlist = currentWaitlist.filter(id => id !== userIdToRemove);
    
    await DatabaseService.updateGame(gameId, {
      waitlist: updatedWaitlist
    });

    console.log(`✅ Admin ${userId} removed user ${userIdToRemove} from waitlist for game ${gameId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    console.error(`❌ Error removing user from waitlist for game ${id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to remove user from waitlist' 
    }, { status: 500 });
  }
}