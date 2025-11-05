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

      // Check if this day now has 10+ players and create game/send admin notification
      console.log(`🗳️ User ${userId} voted YES for ${day}/${month}/${year}`);
      try {
        await checkAndCreateGameForDay(month, year, day);
      } catch (gameError) {
        console.error('❌ Error checking for full game:', gameError);
        // Don't fail the main request if game creation fails
      }
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

// Helper function to check if a specific day reached 10+ players and create game
async function checkAndCreateGameForDay(month: number, year: number, day: number) {
  try {
    console.log(`🔍 Checking for full game on ${day}/${month}/${year}`);

    // Get all users and filter to only whitelisted users
    const allUsers = await DatabaseService.getUsers();
    const whitelistedUsers = allUsers.filter(user => user.isWhitelisted);

    console.log(`📊 Found ${allUsers.length} total users, ${whitelistedUsers.length} whitelisted users`);

    // Get users from database with availability (only whitelisted users)
    const dbAvailability = [];
    for (const user of whitelistedUsers) {
      try {
        const userAvailability = await DatabaseService.getUserMonthlyAvailability(user.id, month, year);
        const votingStatus = await DatabaseService.getUserVotingStatus(user.id, month, year);
        const monthlyRecord = await DatabaseService.getUserMonthlyAvailabilityRecord(user.id, month, year);

        if (userAvailability.length > 0 || votingStatus.hasVoted) {
          dbAvailability.push({
            userId: user.id,
            month,
            year,
            availableSundays: userAvailability,
            cannotPlayAnyDay: votingStatus.cannotPlayAnyDay,
            hasVoted: votingStatus.hasVoted,
            votedAt: monthlyRecord?.updatedAt || new Date(0) // Use epoch if no record found
          });
        }
      } catch {
        // User doesn't have availability in DB, skip
      }
    }

    console.log(`🧮 Database availability: ${dbAvailability.length} total entries for ${month}/${year}`);

    // Get all players available for this specific day
    const playersAvailableOnSunday = dbAvailability.filter(
      entry => entry.availableSundays.includes(day) && !entry.cannotPlayAnyDay
    );

    // Sort by voting timestamp (earliest votes first)
    playersAvailableOnSunday.sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime());

    console.log(`📅 Day ${day}/${month}/${year}: ${playersAvailableOnSunday.length} players available`);
    console.log(`👥 Players (by voting order): ${playersAvailableOnSunday.map((p, index) => `${index + 1}. ${p.userId}`).join(', ')}`);

    if (playersAvailableOnSunday.length >= 10) {
      console.log(`🎯 THRESHOLD REACHED! ${playersAvailableOnSunday.length} >= 10 players for ${day}/${month}/${year}`);
      // Check if game already exists for this date
      const gameDate = new Date(year, month - 1, day, 10, 0, 0, 0);
      const existingGames = await DatabaseService.getAllGames();
      const gameExists = existingGames.some(game => {
        const existingGameDate = new Date(game.date);
        // Compare only year, month, and day (ignore time)
        return existingGameDate.getFullYear() === gameDate.getFullYear() &&
               existingGameDate.getMonth() === gameDate.getMonth() &&
               existingGameDate.getDate() === gameDate.getDate();
      });

      if (!gameExists) {
        // Create a new game with the first 10 available players and remaining in waitlist
        const allPotentialParticipants = playersAvailableOnSunday.map(p => p.userId);

        // Double-check that all participants are whitelisted users
        const whitelistedUserIds = new Set(whitelistedUsers.map(u => u.id));
        const allValidParticipants = allPotentialParticipants.filter(userId => whitelistedUserIds.has(userId));

        // Split into participants (first 10) and waitlist (remaining)
        const participants = allValidParticipants.slice(0, 10);
        const waitlist = allValidParticipants.slice(10);

        console.log(`🎮 Creating game for ${day}/${month}/${year} with ${participants.length} participants and ${waitlist.length} in waitlist`);
        console.log(`🎮 Participants (first 10 voters): ${participants.join(', ')}`);
        console.log(`⏳ Waitlist (voters 11+): ${waitlist.join(', ')}`);

        // Ensure we still have enough players after filtering
        if (participants.length < 10) {
          console.log(`⚠️ Not enough whitelisted players (${participants.length}/10) after filtering. Skipping game creation.`);
          return;
        }

        const gameId = await DatabaseService.createGame({
          date: gameDate,
          participants,
          waitlist,
          status: 'scheduled'
        });

        console.log(`✅ Game created with ID: ${gameId}`);

        // Trigger admin notifications for this specific game
        console.log(`📧 Triggering admin notifications for game ${gameId}...`);
        await DatabaseService.checkAndNotifyAdminsForSpecificGame(gameId);

        console.log('✅ Admin notifications triggered successfully!');
      } else {
        console.log(`Game already exists for ${day}/${month}/${year} - checking for waitlist updates`);
        // Update existing game's waitlist if new players voted
        const existingGame = existingGames.find(game => {
          const existingGameDate = new Date(game.date);
          return existingGameDate.getFullYear() === gameDate.getFullYear() &&
                 existingGameDate.getMonth() === gameDate.getMonth() &&
                 existingGameDate.getDate() === gameDate.getDate();
        });

        if (existingGame && playersAvailableOnSunday.length > 10) {
          const allPotentialParticipants = playersAvailableOnSunday.map(p => p.userId);
          const whitelistedUserIds = new Set(whitelistedUsers.map(u => u.id));
          const allValidParticipants = allPotentialParticipants.filter(userId => whitelistedUserIds.has(userId));

          // Re-evaluate the entire participant and waitlist structure based on voting order
          const currentParticipants = existingGame.participants || [];
          const currentWaitlist = existingGame.waitlist || [];
          const allCurrentUsers = new Set([...currentParticipants, ...currentWaitlist]);

          // Find new users who weren't previously in the game at all
          const newUsers = allValidParticipants.filter(userId => !allCurrentUsers.has(userId));

          if (newUsers.length > 0) {
            // Re-sort all users (existing + new) by voting order to maintain proper order
            const allUsersForThisDay = playersAvailableOnSunday.filter(p =>
              allValidParticipants.includes(p.userId)
            ).map(p => p.userId);

            // Split into participants (first 10) and waitlist (remaining)
            const newParticipants = allUsersForThisDay.slice(0, 10);
            const newWaitlist = allUsersForThisDay.slice(10);

            await DatabaseService.updateGame(existingGame.id, {
              participants: newParticipants,
              waitlist: newWaitlist
            });
            console.log(`📝 Re-ordered participants and waitlist for existing game ${existingGame.id}`);
            console.log(`🎮 New participants (first 10 voters): ${newParticipants.join(', ')}`);
            console.log(`⏳ New waitlist (voters 11+): ${newWaitlist.join(', ')}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndCreateGameForDay:', error);
    throw error;
  }
}
