import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await DatabaseService.getUsers();
    const currentUser = users.find(u => u.id === userId);

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    console.log('🔍 Admin checking for Sundays with 10+ votes that need games...');

    // Get all whitelisted users
    const whitelistedUsers = users.filter(user => user.isWhitelisted);
    console.log(`📊 Found ${whitelistedUsers.length} whitelisted users`);

    // Get the current date and check up to 3 months ahead
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const monthsToCheck = [];
    for (let i = 0; i < 3; i++) {
      let month = currentMonth + i;
      let year = currentYear;
      if (month > 12) {
        month = month - 12;
        year = year + 1;
      }
      monthsToCheck.push({ month, year });
    }

    console.log(`📅 Checking months:`, monthsToCheck);

    const gamesCreated = [];
    const gamesUpdated = [];

    for (const { month, year } of monthsToCheck) {
      console.log(`\n🗓️  Processing ${month}/${year}...`);

      // Get all day votes for this month
      const allDayVotes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/day-votes?year=${year}&month=${month}`).then(r => r.json());

      // Group votes by day
      const votesByDay: Record<number, Array<{ userId: string; voteType: string; votedAt: Date }>> = {};

      for (const vote of allDayVotes) {
        if (!votesByDay[vote.day]) {
          votesByDay[vote.day] = [];
        }
        votesByDay[vote.day].push({
          userId: vote.userId,
          voteType: vote.voteType,
          votedAt: new Date(vote.votedAt)
        });
      }

      // Check each day
      for (const [dayStr, votes] of Object.entries(votesByDay)) {
        const day = parseInt(dayStr);
        const yesVotes = votes.filter(v => v.voteType === 'yes' && whitelistedUsers.some(wu => wu.id === v.userId));

        console.log(`📅 Day ${day}/${month}/${year}: ${yesVotes.length} yes votes from whitelisted users`);

        if (yesVotes.length >= 10) {
          // Check if game already exists
          const gameDate = new Date(year, month - 1, day, 10, 0, 0, 0);
          const existingGames = await DatabaseService.getAllGames();
          const gameExists = existingGames.find(game => {
            const existingGameDate = new Date(game.date);
            return existingGameDate.getFullYear() === gameDate.getFullYear() &&
                   existingGameDate.getMonth() === gameDate.getMonth() &&
                   existingGameDate.getDate() === gameDate.getDate();
          });

          if (!gameExists) {
            // Sort voters by voting time
            yesVotes.sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime());

            const participants = yesVotes.slice(0, 10).map(v => v.userId);
            const waitlist = yesVotes.slice(10).map(v => v.userId);

            console.log(`🎮 Creating game for ${day}/${month}/${year}`);
            console.log(`   Participants: ${participants.length}`);
            console.log(`   Waitlist: ${waitlist.length}`);

            const gameId = await DatabaseService.createGame({
              date: gameDate,
              participants,
              waitlist,
              status: 'scheduled'
            });

            console.log(`✅ Game created with ID: ${gameId} (retroactive - no email sent)`);

            // Mark admin notification as sent to prevent emails for retroactive games
            // The admin will see the game and can manage it, but we don't spam emails for old votes
            await DatabaseService.updateGame(gameId, {
              adminNotificationSent: true
            });

            gamesCreated.push({
              date: `${day}/${month}/${year}`,
              gameId,
              participants: participants.length,
              waitlist: waitlist.length
            });
          } else {
            console.log(`   Game already exists: ${gameExists.id}`);

            // Check if we need to update participants/waitlist based on current votes
            yesVotes.sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime());
            const expectedParticipants = yesVotes.slice(0, 10).map(v => v.userId);
            const expectedWaitlist = yesVotes.slice(10).map(v => v.userId);

            const participantsMatch = JSON.stringify(gameExists.participants.sort()) === JSON.stringify(expectedParticipants.sort());
            const waitlistMatch = JSON.stringify((gameExists.waitlist || []).sort()) === JSON.stringify(expectedWaitlist.sort());

            if (!participantsMatch || !waitlistMatch) {
              console.log(`   Updating participants/waitlist for game ${gameExists.id}`);
              await DatabaseService.updateGame(gameExists.id, {
                participants: expectedParticipants,
                waitlist: expectedWaitlist
              });

              gamesUpdated.push({
                date: `${day}/${month}/${year}`,
                gameId: gameExists.id,
                participants: expectedParticipants.length,
                waitlist: expectedWaitlist.length
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      gamesCreated: gamesCreated.length,
      gamesUpdated: gamesUpdated.length,
      details: {
        created: gamesCreated,
        updated: gamesUpdated
      }
    });
  } catch (error) {
    console.error('Error checking and creating games:', error);
    return NextResponse.json({
      error: 'Failed to check and create games',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
