import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { participantCount = 10 } = body;

    // Get all users (including the current admin user and mock players)
    console.log('Fetching all users...');
    const allUsers = await DatabaseService.getUsers();
    const availableUsers = allUsers.filter(u => u.isWhitelisted);
    
    console.log(`Found ${allUsers.length} total users, ${availableUsers.length} whitelisted users`);

    if (availableUsers.length < participantCount) {
      return NextResponse.json({ 
        error: `Not enough users. Need ${participantCount}, have ${availableUsers.length}. Add mock players first.` 
      }, { status: 400 });
    }

    // Get current active month to pick a Sunday from it
    console.log('Getting current active month...');
    const { month, year } = await DatabaseService.getCurrentActiveMonth();
    console.log(`Active month: ${month}/${year}`);
    
    // Get all Sundays for the current month
    const getSundaysInMonth = (month: number, year: number): number[] => {
      const sundays: number[] = [];
      const date = new Date(year, month - 1, 1);
      
      while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
      }
      
      while (date.getMonth() === month - 1) {
        sundays.push(date.getDate());
        date.setDate(date.getDate() + 7);
      }
      
      return sundays;
    };

    const sundaysInMonth = getSundaysInMonth(month, year);
    console.log(`Sundays in ${month}/${year}:`, sundaysInMonth);
    
    if (sundaysInMonth.length === 0) {
      return NextResponse.json({ 
        error: `No Sundays found in ${month}/${year}` 
      }, { status: 400 });
    }

    // Pick the first available Sunday (or a random one for variety)
    const selectedSunday = sundaysInMonth[0];
    const gameDate = new Date(year, month - 1, selectedSunday, 10, 0, 0, 0);
    console.log(`Selected Sunday: ${selectedSunday}, Game date: ${gameDate.toISOString()}`);

    // Filter users who are available on this specific date
    console.log('Checking user availability...');
    const usersAvailableOnDate = [];
    for (const user of availableUsers) {
      try {
        const availability = await DatabaseService.getUserMonthlyAvailability(user.id, month, year);
        console.log(`${user.name} availability:`, availability);
        if (availability.includes(selectedSunday)) {
          usersAvailableOnDate.push(user);
          console.log(`✅ ${user.name} is available on ${selectedSunday}`);
        } else {
          console.log(`❌ ${user.name} is NOT available on ${selectedSunday}`);
        }
      } catch (error) {
        // If we can't get availability, include them anyway (might be the admin user)
        console.log(`Couldn't get availability for ${user.name}, including anyway`);
        usersAvailableOnDate.push(user);
      }
    }
    
    console.log(`Users available on ${selectedSunday}:`, usersAvailableOnDate.map(u => u.name));

    if (usersAvailableOnDate.length < participantCount) {
      return NextResponse.json({ 
        error: `Not enough users available on ${selectedSunday}/${month}/${year}. Need ${participantCount}, have ${usersAvailableOnDate.length} available. Make sure mock players have availability set.` 
      }, { status: 400 });
    }

    // Take the first N available users as participants
    const participants = usersAvailableOnDate.slice(0, participantCount).map(u => u.id);
    console.log(`Creating game with ${participants.length} participants:`, participants);

    console.log('Calling DatabaseService.createGame...');
    const gameId = await DatabaseService.createGame({
      date: gameDate,
      participants,
      status: 'scheduled'
    });
    console.log(`Game created with ID: ${gameId}`);

    // Trigger admin notifications if we have 10+ players
    if (participants.length >= 10) {
      console.log('Triggering admin notifications...');
      await DatabaseService.checkAndNotifyAdminsForFullGames();
      console.log('Admin notifications triggered successfully');
    }

    return NextResponse.json({ 
      success: true, 
      gameId,
      message: `Test game created with ${participants.length} participants for ${selectedSunday}/${month}/${year}`,
      gameDate: gameDate.toISOString(),
      participants: participants.length,
      availableUsersFound: usersAvailableOnDate.length,
      selectedSunday: selectedSunday
    });
  } catch (error) {
    console.error('Error creating test game:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}