import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== DEBUG ADMIN API START ===');
    
    // Step 1: Check if we can import auth
    let authModule;
    try {
      authModule = await import('@clerk/nextjs/server');
      console.log('✅ Clerk auth module imported successfully');
    } catch (authError) {
      console.error('❌ Failed to import Clerk auth:', authError);
      return NextResponse.json({ 
        error: 'Auth import failed',
        details: String(authError),
        step: 'import_auth'
      }, { status: 500 });
    }

    // Step 2: Try to call auth
    let authResult;
    try {
      authResult = await authModule.auth();
      console.log('✅ Auth called successfully, result:', { userId: authResult?.userId });
    } catch (authCallError) {
      console.error('❌ Auth call failed:', authCallError);
      return NextResponse.json({ 
        error: 'Auth call failed',
        details: String(authCallError),
        step: 'call_auth'
      }, { status: 500 });
    }

    // Step 3: Check if we can import database
    let dbModule;
    try {
      dbModule = await import('@/lib/db/connection');
      console.log('✅ Database module imported successfully');
    } catch (dbError) {
      console.error('❌ Failed to import database:', dbError);
      return NextResponse.json({ 
        error: 'Database import failed',
        details: String(dbError),
        step: 'import_db'
      }, { status: 500 });
    }

    // Step 4: Try simple database query
    try {
      const result = await dbModule.db.execute('SELECT 1 as test');
      console.log('✅ Database query successful:', result);
    } catch (dbQueryError) {
      console.error('❌ Database query failed:', dbQueryError);
      return NextResponse.json({ 
        error: 'Database query failed',
        details: String(dbQueryError),
        step: 'db_query'
      }, { status: 500 });
    }

    // Step 5: Try to import DatabaseService
    let dbService;
    try {
      dbService = await import('@/lib/db/service');
      console.log('✅ DatabaseService imported successfully');
    } catch (serviceError) {
      console.error('❌ Failed to import DatabaseService:', serviceError);
      return NextResponse.json({ 
        error: 'DatabaseService import failed',
        details: String(serviceError),
        step: 'import_service'
      }, { status: 500 });
    }

    console.log('=== DEBUG ADMIN API SUCCESS ===');
    
    return NextResponse.json({ 
      success: true,
      userId: authResult?.userId,
      steps: [
        'import_auth ✅',
        'call_auth ✅', 
        'import_db ✅',
        'db_query ✅',
        'import_service ✅'
      ],
      message: 'All debug steps passed'
    });

  } catch (error) {
    console.error('=== DEBUG ADMIN API ERROR ===', error);
    return NextResponse.json({ 
      error: 'Unexpected error in debug',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}