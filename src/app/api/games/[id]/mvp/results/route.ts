import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db/connection';
import { games, mvpVotes, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

    // Verify the game exists
    const game = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    if (!game.length) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const gameData = game[0];

    // Check if game is completed
    if (gameData.status !== 'completed') {
      return NextResponse.json({ 
        error: 'MVP voting only available for completed games' 
      }, { status: 400 });
    }

    // Verify the current user participated in the game (only participants can see results)
    if (!gameData.participants.includes(userId)) {
      return NextResponse.json({ 
        error: 'Only players who participated can view MVP results' 
      }, { status: 403 });
    }

    // Get vote counts for each player
    const voteResults = await db
      .select({
        votedForId: mvpVotes.votedForId,
        voteCount: sql<number>`count(*)::int`,
        playerName: users.name,
        playerNickname: users.nickname,
        playerImageUrl: users.imageUrl,
      })
      .from(mvpVotes)
      .innerJoin(users, eq(mvpVotes.votedForId, users.id))
      .where(eq(mvpVotes.gameId, gameId))
      .groupBy(mvpVotes.votedForId, users.name, users.nickname, users.imageUrl)
      .orderBy(sql`count(*) desc`);

    // Get total number of participants for vote percentage calculation
    const totalParticipants = gameData.participants.length;

    // Calculate MVP (player with most votes)
    const mvpResult = voteResults.length > 0 ? {
      playerId: voteResults[0].votedForId,
      playerName: voteResults[0].playerName,
      playerNickname: voteResults[0].playerNickname,
      playerImageUrl: voteResults[0].playerImageUrl,
      voteCount: voteResults[0].voteCount,
      votePercentage: Math.round((voteResults[0].voteCount / Math.max(voteResults.length, 1)) * 100)
    } : null;

    return NextResponse.json({
      gameId,
      totalParticipants,
      totalVotes: voteResults.reduce((sum, result) => sum + result.voteCount, 0),
      mvp: mvpResult,
      finalizedMvp: gameData.result?.mvp || null,
      voteResults: voteResults.map(result => ({
        playerId: result.votedForId,
        playerName: result.playerName,
        playerNickname: result.playerNickname,
        playerImageUrl: result.playerImageUrl,
        voteCount: result.voteCount,
        votePercentage: Math.round((result.voteCount / Math.max(voteResults.length, 1)) * 100)
      }))
    });

  } catch (error) {
    console.error('Error fetching MVP results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}