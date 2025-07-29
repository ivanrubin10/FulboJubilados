import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';

export async function POST(request: NextRequest) {
  try {
    // Simple admin check - only allow if admin secret is provided
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'admin-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    await HybridStore.migrateToDatabase();

    return NextResponse.json({
      success: true,
      message: 'Migration from LocalStorage to Database completed successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}