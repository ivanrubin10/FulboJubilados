import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { mvpVotes, mvpVoteStatus } from '@/lib/db/schema';

export async function GET() {
  try {
    console.log('Testing MVP tables...');
    
    // Test if we can query the MVP tables
    const votesCount = await db.select().from(mvpVotes).limit(1);
    console.log('MVP votes table query successful:', votesCount);
    
    const statusCount = await db.select().from(mvpVoteStatus).limit(1);
    console.log('MVP vote status table query successful:', statusCount);
    
    return NextResponse.json({
      success: true,
      message: 'MVP tables are accessible',
      tables: {
        mvpVotes: 'accessible',
        mvpVoteStatus: 'accessible'
      }
    });
    
  } catch (error) {
    console.error('MVP tables test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}