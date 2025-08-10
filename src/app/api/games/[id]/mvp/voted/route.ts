import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/connection';
import { mvpVoteStatus } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;

    // Check if user has voted for this game
    const voteStatus = await db
      .select()
      .from(mvpVoteStatus)
      .where(and(eq(mvpVoteStatus.gameId, gameId), eq(mvpVoteStatus.voterId, userId)))
      .limit(1);

    return NextResponse.json({
      hasVoted: voteStatus.length > 0,
      gameId
    });

  } catch (error) {
    console.error('Error checking vote status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}