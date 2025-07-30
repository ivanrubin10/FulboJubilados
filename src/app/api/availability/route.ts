import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (type === 'user' && userId && month && year) {
      // Get user monthly availability from database
      const availability = await DatabaseService.getUserMonthlyAvailability(
        userId, 
        parseInt(month), 
        parseInt(year)
      );
      return NextResponse.json(availability);
    } else if (type === 'voting' && userId && month && year) {
      // Get user voting status from database
      const votingStatus = await DatabaseService.getUserVotingStatus(
        userId, 
        parseInt(month), 
        parseInt(year)
      );
      return NextResponse.json(votingStatus);
    } else if (type === 'blocked' && month && year) {
      // Get blocked Sundays (dates with confirmed games)
      try {
        const allGames = await DatabaseService.getAllGames();
        const blockedSundays: number[] = [];
        
        for (const game of allGames) {
          const gameDate = new Date(game.date);
          // Check if game is in the requested month/year and has confirmed status or 10+ participants
          if (gameDate.getFullYear() === parseInt(year) && 
              gameDate.getMonth() + 1 === parseInt(month) &&
              (game.status === 'confirmed' || game.participants.length >= 10)) {
            const sunday = gameDate.getDate();
            if (!blockedSundays.includes(sunday)) {
              blockedSundays.push(sunday);
            }
          }
        }
        
        console.log(`🚫 Found ${blockedSundays.length} blocked Sundays for ${month}/${year}:`, blockedSundays);
        return NextResponse.json(blockedSundays);
      } catch (error) {
        console.error('Error getting blocked Sundays:', error);
        return NextResponse.json([]);
      }
    } else if (type === 'monthly') {
      // Get all monthly availability from database only
      try {
        const { month: currentMonth, year: currentYear } = await DatabaseService.getCurrentActiveMonth();
        const allUsers = await DatabaseService.getUsers();
        
        const dbAvailability = [];
        for (const user of allUsers) {
          try {
            const userAvailability = await DatabaseService.getUserMonthlyAvailability(
              user.id, 
              currentMonth, 
              currentYear
            );
            const votingStatus = await DatabaseService.getUserVotingStatus(
              user.id,
              currentMonth,
              currentYear
            );
            
            if (userAvailability.length > 0 || votingStatus.hasVoted) {
              dbAvailability.push({
                userId: user.id,
                month: currentMonth,
                year: currentYear,
                availableSundays: userAvailability,
                cannotPlayAnyDay: votingStatus.cannotPlayAnyDay,
                hasVoted: votingStatus.hasVoted
              });
            }
          } catch (error) {
            // Skip users without availability
          }
        }
        
        console.log(`Database availability: ${dbAvailability.length} entries`);
        return NextResponse.json(dbAvailability);
      } catch (error) {
        console.error('Error getting availability from database:', error);
        return NextResponse.json({ error: 'Failed to fetch availability from database' }, { status: 500 });
      }
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
    
    // Validate that the month is within the 3-month voting limit
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Calculate 3 months from current date
    let maxMonth = currentMonth + 3;
    let maxYear = currentYear;
    
    if (maxMonth > 12) {
      maxMonth = maxMonth - 12;
      maxYear = maxYear + 1;
    }
    
    const isBeyondLimit = year > maxYear || (year === maxYear && month > maxMonth);
    const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
    
    if (isBeyondLimit) {
      return NextResponse.json({
        error: 'Fuera del período de votación',
        details: 'Solo puedes votar hasta 3 meses en el futuro'
      }, { status: 400 });
    }
    
    if (isPastMonth) {
      return NextResponse.json({
        error: 'Mes cerrado',
        details: 'No puedes votar en meses pasados'
      }, { status: 400 });
    }
    
    // Update availability in database only
    await DatabaseService.updateMonthlyAvailability(
      userId,
      month,
      year,
      availableSundays,
      cannotPlayAnyDay
    );
    
    // Check if any Sunday now has 10+ players and create games/notifications
    console.log(`🗳️ User ${userId} voted for ${month}/${year}, Sundays: ${availableSundays.join(', ')}`);
    try {
      await checkAndCreateGamesForFullSundays(month, year, availableSundays);
    } catch (gameError) {
      console.error('❌ Error checking for full games:', gameError);
      // Don't fail the main request if game creation fails
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}

// Helper function to check if Sundays reached 10+ players and create games
async function checkAndCreateGamesForFullSundays(month: number, year: number, newAvailableSundays: number[]) {
  try {
    console.log(`🔍 Checking for full games in ${month}/${year} for Sundays: ${newAvailableSundays.join(', ')}`);
    
    // Get all users and their availability
    const allUsers = await DatabaseService.getUsers();
    
    console.log(`📊 Found ${allUsers.length} total users`);
    
    // Get users from database with availability
    const dbAvailability = [];
    for (const user of allUsers) {
      try {
        const userAvailability = await DatabaseService.getUserMonthlyAvailability(user.id, month, year);
        const votingStatus = await DatabaseService.getUserVotingStatus(user.id, month, year);
        
        if (userAvailability.length > 0 || votingStatus.hasVoted) {
          dbAvailability.push({
            userId: user.id,
            month,
            year,
            availableSundays: userAvailability,
            cannotPlayAnyDay: votingStatus.cannotPlayAnyDay,
            hasVoted: votingStatus.hasVoted
          });
        }
      } catch (error) {
        // User doesn't have availability in DB, skip
      }
    }
    
    console.log(`🧮 Database availability: ${dbAvailability.length} total entries for ${month}/${year}`);
    
    // Check each Sunday that the user just voted for
    for (const sunday of newAvailableSundays) {
      const playersAvailableOnSunday = dbAvailability.filter(
        entry => entry.availableSundays.includes(sunday) && !entry.cannotPlayAnyDay
      );
      
      console.log(`📅 Sunday ${sunday}/${month}/${year}: ${playersAvailableOnSunday.length} players available`);
    console.log(`👥 Players: ${playersAvailableOnSunday.map(p => p.userId).join(', ')}`);
      
      if (playersAvailableOnSunday.length >= 10) {
        console.log(`🎯 THRESHOLD REACHED! ${playersAvailableOnSunday.length} >= 10 players for ${sunday}/${month}/${year}`);
        // Check if game already exists for this date
        const gameDate = new Date(year, month - 1, sunday, 10, 0, 0, 0);
        const existingGames = await DatabaseService.getAllGames();
        const gameExists = existingGames.some(game => {
          const existingGameDate = new Date(game.date);
          // Compare only year, month, and day (ignore time)
          return existingGameDate.getFullYear() === gameDate.getFullYear() &&
                 existingGameDate.getMonth() === gameDate.getMonth() &&
                 existingGameDate.getDate() === gameDate.getDate();
        });
        
        if (!gameExists) {
          // Create a new game with the first 10 available players
          const participants = playersAvailableOnSunday.slice(0, 10).map(p => p.userId);
          
          console.log(`🎮 Creating game for ${sunday}/${month}/${year} with ${participants.length} participants`);
          console.log(`🎮 Participants: ${participants.join(', ')}`);
          
          const gameId = await DatabaseService.createGame({
            date: gameDate,
            participants,
            status: 'scheduled'
          });
          
          console.log(`✅ Game created with ID: ${gameId}`);
          
          // Trigger admin notifications
          console.log(`📧 Triggering admin notifications...`);
          await DatabaseService.checkAndNotifyAdminsForFullGames();
          
          console.log('✅ Admin notifications triggered successfully!');
        } else {
          console.log(`Game already exists for ${sunday}/${month}/${year}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndCreateGamesForFullSundays:', error);
    throw error;
  }
} 