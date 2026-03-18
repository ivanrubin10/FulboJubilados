import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

// Syncs scheduled games participants with actual YES votes from day_votes table.
// Removes players who no longer have a YES vote, promotes from waitlist,
// and deletes games that drop below 10 players.
export async function POST() {
  try {
    const allGames = await DatabaseService.getAllGames();
    const scheduledGames = allGames.filter(g => g.status === 'scheduled');

    if (scheduledGames.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let synced = 0;

    for (const game of scheduledGames) {
      const gameDate = new Date(game.date);
      const year = gameDate.getFullYear();
      const month = gameDate.getMonth() + 1;
      const day = gameDate.getDate();

      // Get actual YES votes for this day
      const dayVotes = await DatabaseService.getDayVotesForDay(year, month, day);
      const yesVoterIds = new Set(
        dayVotes.filter(v => v.voteType === 'yes').map(v => v.userId)
      );

      const currentParticipants = game.participants || [];
      const currentWaitlist = game.waitlist || [];

      // Find participants/waitlist members who no longer have YES votes
      const staleInParticipants = currentParticipants.filter(id => !yesVoterIds.has(id));
      const staleInWaitlist = currentWaitlist.filter(id => !yesVoterIds.has(id));

      if (staleInParticipants.length === 0 && staleInWaitlist.length === 0) {
        continue; // Game is already in sync
      }

      console.log(`🔄 Syncing game ${game.id} for ${day}/${month}/${year}`);
      console.log(`   Stale participants: ${JSON.stringify(staleInParticipants)}`);
      console.log(`   Stale waitlist: ${JSON.stringify(staleInWaitlist)}`);

      // Remove stale users
      const cleanedParticipants = currentParticipants.filter(id => yesVoterIds.has(id));
      const cleanedWaitlist = currentWaitlist.filter(id => yesVoterIds.has(id));

      // Promote from waitlist to fill participant slots
      while (cleanedParticipants.length < 10 && cleanedWaitlist.length > 0) {
        cleanedParticipants.push(cleanedWaitlist.shift()!);
      }

      if (cleanedParticipants.length < 10) {
        // Not enough players — delete the game
        await DatabaseService.deleteGame(game.id);
        console.log(`🗑️ Deleted game ${game.id} — only ${cleanedParticipants.length} YES voters remain`);
      } else {
        // Clean up teams if they exist
        let updatedTeams = game.teams;
        if (updatedTeams) {
          updatedTeams = {
            team1: updatedTeams.team1.filter(id => yesVoterIds.has(id)),
            team2: updatedTeams.team2.filter(id => yesVoterIds.has(id))
          };
        }

        await DatabaseService.updateGame(game.id, {
          participants: cleanedParticipants,
          waitlist: cleanedWaitlist,
          teams: updatedTeams
        });
        console.log(`✅ Synced game ${game.id} — ${cleanedParticipants.length} participants, ${cleanedWaitlist.length} waitlist`);
      }

      synced++;
    }

    return NextResponse.json({ synced });
  } catch (error) {
    console.error('Error syncing games:', error);
    return NextResponse.json({ error: 'Failed to sync games' }, { status: 500 });
  }
}
