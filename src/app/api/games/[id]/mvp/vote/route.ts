import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/connection';
import { games, mvpVotes, mvpVoteStatus, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;
    const { votedForId } = await request.json();

    if (!votedForId) {
      return NextResponse.json({ error: 'votedForId is required' }, { status: 400 });
    }

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

    // Check if game is completed and has a result
    if (gameData.status !== 'completed' || !gameData.result) {
      return NextResponse.json({ 
        error: 'Can only vote MVP for completed games with results' 
      }, { status: 400 });
    }

    // Verify the current user participated in the game
    if (!gameData.participants.includes(userId)) {
      return NextResponse.json({ 
        error: 'Only players who participated can vote for MVP' 
      }, { status: 403 });
    }

    // Verify the voted-for player also participated in the game
    if (!gameData.participants.includes(votedForId)) {
      return NextResponse.json({ 
        error: 'Can only vote for players who participated in the game' 
      }, { status: 400 });
    }

    // Check if user has already voted for this game
    const existingVoteStatus = await db
      .select()
      .from(mvpVoteStatus)
      .where(and(eq(mvpVoteStatus.gameId, gameId), eq(mvpVoteStatus.voterId, userId)))
      .limit(1);

    if (existingVoteStatus.length > 0) {
      return NextResponse.json({ 
        error: 'You have already voted for MVP in this game' 
      }, { status: 400 });
    }

    // Verify the voted-for user exists
    const votedForUser = await db
      .select()
      .from(users)
      .where(eq(users.id, votedForId))
      .limit(1);

    if (!votedForUser.length) {
      return NextResponse.json({ error: 'Voted user not found' }, { status: 404 });
    }

    // First, let's try inserting just the MVP vote to isolate the issue
    try {
      console.log('Inserting MVP vote:', { gameId, votedForId });
      
      // Insert the anonymous vote
      await db.insert(mvpVotes).values({
        gameId,
        votedForId,
      });
      
      console.log('MVP vote inserted successfully');

      // Now try to insert vote status
      console.log('Inserting MVP vote status:', { gameId, voterId: userId });
      
      await db.insert(mvpVoteStatus).values({
        gameId,
        voterId: userId,
        hasVoted: true,
      });
      
      console.log('MVP vote status inserted successfully');
      
    } catch (insertError) {
      console.error('Insert failed:', insertError);
      console.error('Insert error details:', {
        message: insertError instanceof Error ? insertError.message : 'Unknown error',
        cause: insertError instanceof Error ? insertError.cause : undefined,
        stack: insertError instanceof Error ? insertError.stack : undefined
      });
      throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'MVP vote submitted successfully' 
    });

  } catch (error) {
    console.error('Error submitting MVP vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}