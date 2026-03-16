import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json({ error: 'year and month are required' }, { status: 400 });
    }

    const customDates = await DatabaseService.getCustomDatesForMonth(
      parseInt(year),
      parseInt(month)
    );
    return NextResponse.json(customDates);
  } catch (error) {
    console.error('Error fetching custom dates:', error);
    return NextResponse.json({ error: 'Failed to fetch custom dates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { year, month, day, description, userId } = await request.json();

    if (!year || !month || !day || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate the date is valid
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json({ error: 'Cannot add a past date' }, { status: 400 });
    }

    await DatabaseService.addCustomDate(year, month, day, description || null, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding custom date:', error);
    return NextResponse.json({ error: 'Failed to add custom date' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const day = searchParams.get('day');

    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    await DatabaseService.removeCustomDate(parseInt(year), parseInt(month), parseInt(day));

    // Also remove any day votes for this custom date
    // (votes will become orphaned since the date is no longer available)
    const dayVotes = await DatabaseService.getDayVotesForDay(parseInt(year), parseInt(month), parseInt(day));
    for (const vote of dayVotes) {
      await DatabaseService.removeDayVote(vote.userId, parseInt(year), parseInt(month), parseInt(day));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing custom date:', error);
    return NextResponse.json({ error: 'Failed to remove custom date' }, { status: 500 });
  }
}
