import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET() {
  try {
    // Test database connection
    const users = await DatabaseService.getUsers();
    console.log('Found users:', users.length);
    
    return NextResponse.json({ 
      success: true, 
      userCount: users.length,
      users: users.map(u => ({ id: u.id, email: u.email, nickname: u.nickname }))
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}