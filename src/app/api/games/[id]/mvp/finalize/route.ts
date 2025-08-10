import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/connection';
import { games, mvpVotes, users } from '@/lib/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

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

    if (gameData.status !== 'completed' || !gameData.result) {
      return NextResponse.json({ 
        error: 'Can only finalize MVP for completed games with results' 
      }, { status: 400 });
    }

    // Get all players with their vote counts
    const voteResults = await db
      .select({
        votedForId: mvpVotes.votedForId,
        voteCount: sql<number>`count(*)::int`,
      })
      .from(mvpVotes)
      .where(eq(mvpVotes.gameId, gameId))
      .groupBy(mvpVotes.votedForId)
      .orderBy(sql`count(*) desc`);

    if (!voteResults.length) {
      return NextResponse.json({ 
        error: 'No MVP votes found for this game' 
      }, { status: 400 });
    }

    // Find the highest vote count
    const highestVoteCount = voteResults[0].voteCount;
    
    // Get all players tied for the highest vote count
    const mvpPlayers = voteResults
      .filter(result => result.voteCount === highestVoteCount)
      .map(result => result.votedForId);

    const mvpPlayerId = mvpPlayers.length === 1 ? mvpPlayers[0] : mvpPlayers;

    // Update the game result with MVP
    const updatedResult = {
      ...gameData.result,
      mvp: mvpPlayerId
    };

    await db
      .update(games)
      .set({ 
        result: updatedResult,
        updatedAt: new Date()
      })
      .where(eq(games.id, gameId));

    // Get MVP player(s) info for response
    const mvpPlayerIds = Array.isArray(mvpPlayerId) ? mvpPlayerId : [mvpPlayerId];
    const mvpPlayersData = await db
      .select()
      .from(users)
      .where(inArray(users.id, mvpPlayerIds));

    const isMultipleMVPs = Array.isArray(mvpPlayerId);
    const message = isMultipleMVPs 
      ? `MVP voting ended in a tie - ${mvpPlayerIds.length} players awarded MVP`
      : 'MVP finalized successfully';

    return NextResponse.json({
      success: true,
      message,
      mvp: isMultipleMVPs ? {
        playerIds: mvpPlayerId,
        players: mvpPlayersData.map(player => ({
          playerId: player.id,
          playerName: player.name,
          playerNickname: player.nickname
        })),
        voteCount: highestVoteCount,
        isTie: true
      } : {
        playerId: mvpPlayerId,
        playerName: mvpPlayersData[0]?.name,
        playerNickname: mvpPlayersData[0]?.nickname,
        voteCount: highestVoteCount,
        isTie: false
      }
    });

  } catch (error) {
    console.error('Error finalizing MVP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}