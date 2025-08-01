import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year parameters are required' }, { status: 400 });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get all users and their availability for the specific month
    const allUsers = await DatabaseService.getUsers();
    const monthlyAvailability = [];
    
    for (const user of allUsers) {
      try {
        const userAvailability = await DatabaseService.getUserMonthlyAvailability(
          user.id, 
          monthNum, 
          yearNum
        );
        const votingStatus = await DatabaseService.getUserVotingStatus(
          user.id,
          monthNum,
          yearNum
        );
        
        if (userAvailability.length > 0 || votingStatus.hasVoted) {
          monthlyAvailability.push({
            userId: user.id,
            month: monthNum,
            year: yearNum,
            availableSundays: userAvailability,
            cannotPlayAnyDay: votingStatus.cannotPlayAnyDay,
            hasVoted: votingStatus.hasVoted
          });
        }
      } catch {
        // Skip users without availability
      }
    }
    
    console.log(`📅 Fetched availability for ${month}/${year}: ${monthlyAvailability.length} entries`);
    return NextResponse.json(monthlyAvailability);
  } catch (error) {
    console.error('Error fetching monthly availability:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly availability' }, { status: 500 });
  }
}