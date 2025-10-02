import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin AND whitelisted
    const currentUser = await DatabaseService.getUserById(currentUserId);
    if (!currentUser || !currentUser.isAdmin || !currentUser.isWhitelisted) {
      return NextResponse.json({
        error: 'Forbidden - Admin access required',
        details: 'Only whitelisted administrators can change admin status'
      }, { status: 403 });
    }

    const { id: userId } = await params;
    await HybridStore.toggleAdminStatus(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    return NextResponse.json({ error: 'Failed to toggle admin status' }, { status: 500 });
  }
}