import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const day = searchParams.get('day');

    if (!year || !month) {
      return NextResponse.json({ error: 'year and month are required' }, { status: 400 });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // If day is provided, get votes for that specific day
    if (day) {
      const dayNum = parseInt(day);
      const dayVotes = await DatabaseService.getDayVotesForDay(yearNum, monthNum, dayNum);
      return NextResponse.json(dayVotes);
    }

    // Otherwise, get all votes for the month
    const monthVotes = await DatabaseService.getDayVotesForMonth(yearNum, monthNum);
    return NextResponse.json(monthVotes);
  } catch (error) {
    console.error('Error fetching day votes:', error);
    return NextResponse.json({ error: 'Failed to fetch day votes' }, { status: 500 });
  }
}
