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
        details: 'Only whitelisted administrators can change whitelist status'
      }, { status: 403 });
    }

    const { id } = await params;
    await HybridStore.toggleUserWhitelist(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling user whitelist:', error);
    return NextResponse.json({ error: 'Failed to toggle whitelist' }, { status: 500 });
  }
} 