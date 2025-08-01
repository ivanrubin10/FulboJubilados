import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('🧹 Admin requesting game cleanup...');
    const result = await DatabaseService.cleanUpGamesWithNonWhitelistedUsers();

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${result.updated} games updated`,
      updated: result.updated,
      details: result.details
    });
  } catch (error) {
    console.error('Error in cleanup games API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clean up games',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}