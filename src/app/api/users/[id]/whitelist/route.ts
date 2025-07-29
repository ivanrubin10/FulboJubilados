import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await HybridStore.toggleUserWhitelist(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling user whitelist:', error);
    return NextResponse.json({ error: 'Failed to toggle whitelist' }, { status: 500 });
  }
} 