import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;
    const updates = await request.json();

    console.log(`🔄 Updating game ${gameId} with:`, updates);

    await DatabaseService.updateGame(gameId, {
      ...updates,
      updatedAt: new Date()
    });

    console.log(`✅ Game ${gameId} updated successfully`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    console.error(`❌ Error updating game ${id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to update game' 
    }, { status: 500 });
  }
}