import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    console.log('Check admin API called');
    
    // Step 1: Check auth
    let userId;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      console.log('Auth result:', { userId });
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ 
        error: 'Auth failed',
        details: authError instanceof Error ? authError.message : 'Unknown auth error',
        userId: null,
        isAdmin: false
      }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ 
        error: 'Unauthorized - no userId',
        userId: null,
        isAdmin: false
      }, { status: 401 });
    }

    // Step 2: Try to get user from database
    let user;
    try {
      console.log('Attempting to get user from database:', userId);
      user = await DatabaseService.getUserById(userId);
      console.log('Database result:', user ? 'User found' : 'User not found');
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        userId,
        isAdmin: false,
        userExists: false
      });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found in database',
        userId,
        isAdmin: false,
        userExists: false
      });
    }

    console.log('User found, admin status:', user.isAdmin);
    return NextResponse.json({ 
      success: true,
      userId,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isWhitelisted: user.isWhitelisted
      },
      isAdmin: user.isAdmin,
      userExists: true
    });
  } catch (error) {
    console.error('Unexpected error in check-admin:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}