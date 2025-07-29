import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Basic auth
    let authResult;
    try {
      authResult = await auth();
      console.log('Auth test passed:', !!authResult.userId);
    } catch (authError) {
      console.error('Auth test failed:', authError);
      return NextResponse.json({ 
        error: 'Auth failed',
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 500 });
    }

    // Test 2: Database connection with simple query
    try {
      console.log('Testing database connection...');
      const result = await db.execute('SELECT 1 as test');
      console.log('Database connection test passed:', result);
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

    // Test 3: Check if users table exists
    try {
      console.log('Checking users table...');
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      console.log('Users table exists:', tableCheck);
    } catch (tableError) {
      console.error('Table check failed:', tableError);
      return NextResponse.json({ 
        error: 'Table check failed',
        details: tableError instanceof Error ? tableError.message : String(tableError)
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      auth: !!authResult.userId,
      userId: authResult.userId,
      database: 'connected',
      message: 'All tests passed'
    });

  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}