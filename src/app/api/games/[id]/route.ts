import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';
import { emailService } from '@/lib/email';
import type { Game } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;
    const updates = await request.json();

    console.log(`🔄 Updating game ${gameId} with:`, updates);

    // Get the game before updating to check if this is a result completion
    const gameBeforeUpdate = await DatabaseService.getGame(gameId);
    if (!gameBeforeUpdate) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if this update is completing the game with results
    const isCompletingGame = 
      updates.status === 'completed' && 
      updates.result && 
      gameBeforeUpdate.status !== 'completed';

    // Update the game
    await DatabaseService.updateGame(gameId, {
      ...updates,
      updatedAt: new Date()
    });

    // If this is completing a game with results, send email notifications
    if (isCompletingGame && gameBeforeUpdate.participants && gameBeforeUpdate.participants.length > 0) {
      console.log(`📧 Sending MVP voting and payment reminder emails for completed game ${gameId}`);
      
      // Send emails to all participants in the background (don't block the response)
      sendMvpVotingEmails(gameId, gameBeforeUpdate as Game, updates.result).catch(error => {
        console.error(`❌ Error sending MVP voting emails for game ${gameId}:`, error);
      });
    }

    console.log(`✅ Game ${gameId} updated successfully`);
    return NextResponse.json({ success: true });

  } catch (error) {
    const { id } = await params;
    console.error(`❌ Error updating game ${id}:`, error);
    return NextResponse.json({ 
      error: 'Failed to update game' 
    }, { status: 500 });
  }
}

// Helper function to send MVP voting and payment reminder emails
async function sendMvpVotingEmails(gameId: string, game: Game, result: { team1Score: number; team2Score: number; notes?: string }) {
  try {
    console.log(`🚀 Starting email sending process for game ${gameId}`);
    
    // Get all users to build email data
    const allUsers = await DatabaseService.getUsers();
    const userMap = new Map(allUsers.map(user => [user.id, user]));
    
    // Get the organizer (admin who confirmed the game)
    const organizer = allUsers.find(user => user.isAdmin);
    const organizerName = organizer?.nickname || organizer?.name || 'Organizador';
    
    // Get reservation info for payment details
    const location = game.reservationInfo?.location || 'Cancha';
    const time = game.reservationInfo?.time || 'Horario no disponible';
    const cost = game.reservationInfo?.cost;
    const paymentAlias = game.reservationInfo?.paymentAlias;
    
    // Prepare the final score string
    const finalScore = `${result.team1Score} - ${result.team2Score}`;
    
    // Send emails to all participants with rate limiting
    const emailPromises = game.participants.map(async (participantId: string, index: number) => {
      const participant = userMap.get(participantId);
      if (!participant?.email) {
        console.warn(`⚠️ No email found for participant ${participantId}`);
        return;
      }
      
      // Determine which team the participant was on
      let teamName = 'Equipo';
      if (game.teams) {
        if (game.teams.team1.includes(participantId)) {
          teamName = 'Equipo 1';
        } else if (game.teams.team2.includes(participantId)) {
          teamName = 'Equipo 2';
        }
      }
      
      // Add delay to respect rate limits (improved to 2 second delay)
      if (index > 0) {
        const rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT || '2000');
        await new Promise(resolve => setTimeout(resolve, rateLimit));
      }
      
      console.log(`📧 Sending MVP voting email to ${participant.nickname || participant.name} (${participant.email})`);
      
      return await emailService.sendMvpVotingAndPaymentReminder({
        to: participant.email,
        name: participant.nickname || participant.name || 'Jugador',
        gameDate: game.date,
        location,
        time,
        cost,
        paymentAlias,
        organizerName,
        teamName,
        finalScore
      });
    });
    
    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);
    
    // Log results
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;
    
    console.log(`✅ MVP voting emails sent: ${successful} successful, ${failed} failed out of ${game.participants.length} total`);
    
    if (failed > 0) {
      console.error(`❌ Some MVP voting emails failed to send for game ${gameId}`);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Email ${index + 1} failed:`, result.reason);
        }
      });
    }
    
  } catch (error) {
    console.error(`❌ Critical error sending MVP voting emails for game ${gameId}:`, error);
  }
}