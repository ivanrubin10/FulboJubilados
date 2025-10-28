import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function POST(request: NextRequest) {
  try {
    const { userId, year, month, day, voteType } = await request.json();

    if (!userId || !year || !month || !day || !voteType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (voteType !== 'yes' && voteType !== 'no') {
      return NextResponse.json({ error: 'Invalid vote type. Must be "yes" or "no"' }, { status: 400 });
    }

    // Validate that the date hasn't passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const voteDate = new Date(year, month - 1, day);
    voteDate.setHours(0, 0, 0, 0);

    if (voteDate < today) {
      return NextResponse.json({
        error: 'Fecha pasada',
        details: 'No puedes votar por una fecha que ya ha pasado'
      }, { status: 400 });
    }

    // Record the day vote
    await DatabaseService.recordDayVote(userId, year, month, day, voteType);

    // If it's a "yes" vote, also update monthly availability
    if (voteType === 'yes') {
      // Get current availability for this month
      const currentAvailability = await DatabaseService.getUserMonthlyAvailability(userId, month, year);

      // Add this day if not already included
      const updatedSundays = currentAvailability.includes(day)
        ? currentAvailability
        : [...currentAvailability, day];

      await DatabaseService.updateMonthlyAvailability(
        userId,
        month,
        year,
        updatedSundays,
        false // cannotPlayAnyDay is false for individual yes votes
      );
    } else {
      // If it's a "no" vote, remove from monthly availability if present
      const currentAvailability = await DatabaseService.getUserMonthlyAvailability(userId, month, year);
      const updatedSundays = currentAvailability.filter(d => d !== day);

      await DatabaseService.updateMonthlyAvailability(
        userId,
        month,
        year,
        updatedSundays,
        false
      );
    }

    return NextResponse.json({ success: true, voteType });
  } catch (error) {
    console.error('Error recording day vote:', error);
    return NextResponse.json({ error: 'Failed to record day vote' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const day = searchParams.get('day');

    if (!userId || !year || !month || !day) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Remove the day vote
    await DatabaseService.removeDayVote(userId, parseInt(year), parseInt(month), parseInt(day));

    // Also remove from monthly availability
    const currentAvailability = await DatabaseService.getUserMonthlyAvailability(
      userId,
      parseInt(month),
      parseInt(year)
    );
    const updatedSundays = currentAvailability.filter(d => d !== parseInt(day));

    await DatabaseService.updateMonthlyAvailability(
      userId,
      parseInt(month),
      parseInt(year),
      updatedSundays,
      false
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing day vote:', error);
    return NextResponse.json({ error: 'Failed to remove day vote' }, { status: 500 });
  }
}
