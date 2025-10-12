import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { mvpVotes } from '@/lib/db/schema';

export async function GET() {
  try {
    // Get all MVP votes with their game IDs
    const allVotes = await db
      .select({
        id: mvpVotes.id,
        gameId: mvpVotes.gameId,
        votedForId: mvpVotes.votedForId,
        createdAt: mvpVotes.createdAt,
      })
      .from(mvpVotes);

    return NextResponse.json({
      success: true,
      votes: allVotes
    });

  } catch (error) {
    console.error('Error fetching all MVP votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
