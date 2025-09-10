import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!userId || !month || !year) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const record = await DatabaseService.getUserMonthlyAvailabilityRecord(
      userId, 
      parseInt(month), 
      parseInt(year)
    );
    
    if (!record) {
      return NextResponse.json({ error: 'No record found' }, { status: 404 });
    }
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching monthly availability record:', error);
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
  }
}