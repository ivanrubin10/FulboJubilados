import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';
import { User } from '@/types';

export async function GET() {
  try {
    const users = await HybridStore.getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user: User = await request.json();
    await HybridStore.addUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user: User = await request.json();
    console.log('Updating user:', user);
    await HybridStore.updateUser(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 