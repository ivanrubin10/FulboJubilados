import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/connection';
import { games, mvpVoteStatus, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser.length || !currentUser[0].isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: gameId } = await params;

    // Verify the game exists and is completed
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game.length) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameData = game[0];

    if (gameData.status !== 'completed') {
      return NextResponse.json({ 
        error: 'MVP voting only available for completed games' 
      }, { status: 400 });
    }

    // Check if MVP is already finalized
    if (gameData.result?.mvp) {
      return NextResponse.json({ 
        error: 'MVP voting has already been finalized for this game' 
      }, { status: 400 });
    }

    // Get all participants
    const participants = gameData.participants;

    if (participants.length === 0) {
      return NextResponse.json({
        gameId,
        totalParticipants: 0,
        votersCount: 0,
        nonVotersCount: 0,
        nonVoters: []
      });
    }

    // Get list of users who have voted
    const votedUsers = await db
      .select({
        voterId: mvpVoteStatus.voterId
      })
      .from(mvpVoteStatus)
      .where(eq(mvpVoteStatus.gameId, gameId));

    const votedUserIds = votedUsers.map(v => v.voterId);

    // Find participants who haven't voted
    const nonVoterIds = participants.filter(participantId => !votedUserIds.includes(participantId));

    // Get user details for non-voters
    const nonVoters = nonVoterIds.length > 0 
      ? await db
          .select({
            id: users.id,
            name: users.name,
            nickname: users.nickname,
            imageUrl: users.imageUrl
          })
          .from(users)
          .where(inArray(users.id, nonVoterIds))
      : [];

    return NextResponse.json({
      gameId,
      totalParticipants: participants.length,
      votersCount: votedUserIds.length,
      nonVotersCount: nonVoterIds.length,
      nonVoters: nonVoters.map(user => ({
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        imageUrl: user.imageUrl,
        displayName: user.nickname || user.name
      }))
    });

  } catch (error) {
    console.error('Error fetching non-voters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}