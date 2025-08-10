import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { mvpVotes, users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get MVP votes count for each player across all games
    const voteCounts = await db
      .select({
        playerId: mvpVotes.votedForId,
        totalVotes: sql<number>`count(*)::int`,
      })
      .from(mvpVotes)
      .groupBy(mvpVotes.votedForId)
      .orderBy(sql`count(*) desc`);

    // Get player information for each player who received votes
    const playerVotes = await Promise.all(
      voteCounts.map(async (voteData) => {
        const player = await db
          .select()
          .from(users)
          .where(sql`${users.id} = ${voteData.playerId}`)
          .limit(1);

        return {
          playerId: voteData.playerId,
          totalVotes: voteData.totalVotes,
          playerName: player[0]?.name || 'Unknown Player',
          playerNickname: player[0]?.nickname || null,
          playerImageUrl: player[0]?.imageUrl || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      playerVotes
    });

  } catch (error) {
    console.error('Error fetching MVP votes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}