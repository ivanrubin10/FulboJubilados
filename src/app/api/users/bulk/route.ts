import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';
import { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const users: User[] = await request.json();
    await HybridStore.saveUsers(users);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving users:', error);
    return NextResponse.json({ error: 'Failed to save users' }, { status: 500 });
  }
} 