import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    await HybridStore.toggleAdminStatus(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    return NextResponse.json({ error: 'Failed to toggle admin status' }, { status: 500 });
  }
}