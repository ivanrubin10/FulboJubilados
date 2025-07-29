import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (type === 'user' && userId && month && year) {
      // Get user monthly availability
      const availability = await HybridStore.getUserMonthlyAvailability(
        userId, 
        parseInt(month), 
        parseInt(year)
      );
      return NextResponse.json(availability);
    } else if (type === 'voting' && userId && month && year) {
      // Get user voting status
      const votingStatus = await HybridStore.getUserVotingStatus(
        userId, 
        parseInt(month), 
        parseInt(year)
      );
      return NextResponse.json(votingStatus);
    } else if (type === 'blocked' && month && year) {
      // Get blocked Sundays
      const blocked = await HybridStore.getBlockedSundays(
        parseInt(month), 
        parseInt(year)
      );
      return NextResponse.json(blocked);
    } else if (type === 'monthly') {
      // Get all monthly availability
      const monthlyAvailability = await HybridStore.getMonthlyAvailability();
      return NextResponse.json(monthlyAvailability);
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, month, year, availableSundays, cannotPlayAnyDay } = await request.json();
    
    await HybridStore.updateMonthlyAvailability(
      userId,
      month,
      year,
      availableSundays,
      cannotPlayAnyDay
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
} 