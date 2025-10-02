import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin AND whitelisted
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin || !user.isWhitelisted) {
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        details: 'Only whitelisted administrators can manage game results'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const gameId = resolvedParams.id;
    const body = await request.json();
    const { team1Score, team2Score, notes } = body;

    // Validate input
    if (typeof team1Score !== 'number' || typeof team2Score !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid input - team scores must be numbers' 
      }, { status: 400 });
    }

    if (team1Score < 0 || team2Score < 0) {
      return NextResponse.json({ 
        error: 'Invalid input - scores cannot be negative' 
      }, { status: 400 });
    }

    // Get the game to verify it exists and can have results added
    const game = await DatabaseService.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Only allow results for completed games
    if (game.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Can only add results to completed games. Change game status to "completed" first.' 
      }, { status: 400 });
    }

    // Update the game with the result
    await DatabaseService.updateGame(gameId, {
      result: {
        team1Score,
        team2Score,
        notes: notes?.trim() || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Match result updated successfully',
      result: {
        team1Score,
        team2Score,
        notes: notes?.trim() || undefined
      }
    });

  } catch (error) {
    console.error('Error updating match result:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin AND whitelisted
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin || !user.isWhitelisted) {
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        details: 'Only whitelisted administrators can manage game results'
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const gameId = resolvedParams.id;

    // Get the game to verify it exists
    const game = await DatabaseService.getGame(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Remove the result
    await DatabaseService.updateGame(gameId, {
      result: null
    });

    return NextResponse.json({
      success: true,
      message: 'Match result removed successfully'
    });

  } catch (error) {
    console.error('Error removing match result:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}