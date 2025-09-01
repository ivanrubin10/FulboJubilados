import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';

export async function POST(request: NextRequest) {
  try {
    const { userId, month, year, unavailableSundays } = await request.json();
    
    // Validate that the month is not a past month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const isPastMonth = year < currentYear || (year === currentYear && month < currentMonth);
    
    if (isPastMonth) {
      return NextResponse.json({
        error: 'Mes cerrado',
        details: 'No puedes modificar votos en meses pasados'
      }, { status: 400 });
    }

    // Get current user availability
    const currentAvailability = await DatabaseService.getUserMonthlyAvailability(userId, month, year);
    
    // Remove the unavailable Sundays from current availability
    const updatedAvailability = currentAvailability.filter(sunday => !unavailableSundays.includes(sunday));
    
    // Update availability in database
    const votingStatus = await DatabaseService.getUserVotingStatus(userId, month, year);
    await DatabaseService.updateMonthlyAvailability(
      userId,
      month,
      year,
      updatedAvailability,
      votingStatus.cannotPlayAnyDay
    );
    
    // Check for waitlist promotions for affected games
    await promoteFromWaitlistForUnvotedDays(month, year, unavailableSundays, userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating availability (unvote):', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}

// Helper function to promote players from waitlist when someone unvotes
async function promoteFromWaitlistForUnvotedDays(month: number, year: number, unavailableSundays: number[], unvotingUserId: string) {
  try {
    console.log(`🔍 Checking waitlist promotions for ${month}/${year}, Sundays: ${unavailableSundays.join(', ')}, unvoting user: ${unvotingUserId}`);
    
    const allGames = await DatabaseService.getAllGames();
    
    // Check each Sunday that the user unvoted from
    for (const sunday of unavailableSundays) {
      const gameDate = new Date(year, month - 1, sunday, 10, 0, 0, 0);
      
      // Find existing game for this date
      const existingGame = allGames.find(game => {
        const existingGameDate = new Date(game.date);
        return existingGameDate.getFullYear() === gameDate.getFullYear() &&
               existingGameDate.getMonth() === gameDate.getMonth() &&
               existingGameDate.getDate() === gameDate.getDate();
      });
      
      if (existingGame && existingGame.status !== 'confirmed') {
        console.log(`🎮 Found unconfirmed game ${existingGame.id} for ${sunday}/${month}/${year}`);
        
        // Check if the unvoting user was in participants
        const currentParticipants = existingGame.participants || [];
        const currentWaitlist = existingGame.waitlist || [];
        
        if (currentParticipants.includes(unvotingUserId)) {
          console.log(`👤 User ${unvotingUserId} was a participant, promoting from waitlist`);
          
          // Remove user from participants
          const updatedParticipants = currentParticipants.filter(id => id !== unvotingUserId);
          
          // Promote first person from waitlist if available
          if (currentWaitlist.length > 0) {
            const promotedUserId = currentWaitlist[0];
            const updatedWaitlist = currentWaitlist.slice(1);
            
            updatedParticipants.push(promotedUserId);
            
            await DatabaseService.updateGame(existingGame.id, {
              participants: updatedParticipants,
              waitlist: updatedWaitlist
            });
            
            console.log(`✅ Promoted user ${promotedUserId} from waitlist to participant for game ${existingGame.id}`);
          } else {
            // No one in waitlist, just remove the user
            await DatabaseService.updateGame(existingGame.id, {
              participants: updatedParticipants
            });
            
            console.log(`📝 Removed user ${unvotingUserId} from participants, no waitlist available for game ${existingGame.id}`);
          }
        } else if (currentWaitlist.includes(unvotingUserId)) {
          console.log(`👤 User ${unvotingUserId} was in waitlist, removing from waitlist`);
          
          // Remove user from waitlist
          const updatedWaitlist = currentWaitlist.filter(id => id !== unvotingUserId);
          
          await DatabaseService.updateGame(existingGame.id, {
            waitlist: updatedWaitlist
          });
          
          console.log(`📝 Removed user ${unvotingUserId} from waitlist for game ${existingGame.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in promoteFromWaitlistForUnvotedDays:', error);
    throw error;
  }
}