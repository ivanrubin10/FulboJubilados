import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body to get selected participants and game ID
    const body = await request.json();
    const { selectedParticipants, gameId } = body;

    console.log('🚀 Starting manual MVP reminder process');
    console.log('📝 Selected participants:', selectedParticipants?.length || 0);
    console.log('🎮 Game ID:', gameId);

    // Find the latest completed game with results
    const allGames = await DatabaseService.getAllGames();
    const completedGames = allGames
      .filter(game => game.status === 'completed' && game.result && game.participants?.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (completedGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay partidos completados con resultados para enviar recordatorios MVP'
      });
    }

    const latestGame = completedGames[0];
    console.log(`📧 Sending MVP reminders for game ${latestGame.id} from ${latestGame.date}`);

    // Get all users to build email data
    const allUsers = await DatabaseService.getUsers();
    const userMap = new Map(allUsers.map(user => [user.id, user]));

    // Get the organizer (admin)
    const organizer = allUsers.find(user => user.isAdmin);
    const organizerName = organizer?.nickname || organizer?.name || 'Organizador';

    // Get reservation info for payment details
    const location = latestGame.reservationInfo?.location || 'Cancha';
    const time = latestGame.reservationInfo?.time || 'Horario no disponible';
    const cost = latestGame.reservationInfo?.cost;
    const paymentAlias = latestGame.reservationInfo?.paymentAlias;

    // Prepare the final score string
    const finalScore = latestGame.result 
      ? `${latestGame.result.team1Score} - ${latestGame.result.team2Score}`
      : 'N/A';

    // Determine which participants to send emails to
    let participantsToEmail = latestGame.participants;
    if (selectedParticipants && selectedParticipants.length > 0) {
      // Only send to selected participants
      participantsToEmail = selectedParticipants.filter((id: string) => 
        latestGame.participants.includes(id)
      );
      console.log('📧 Filtering to selected participants:', participantsToEmail.length);
    }

    // Send emails to participants with rate limiting
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < participantsToEmail.length; i++) {
      const participantId = participantsToEmail[i];
      const participant = userMap.get(participantId);

      if (!participant?.email) {
        console.warn(`⚠️ No email found for participant ${participantId}`);
        failed++;
        continue;
      }

      // Determine which team the participant was on
      let teamName = 'Equipo';
      if (latestGame.teams) {
        if (latestGame.teams.team1.includes(participantId)) {
          teamName = 'Equipo 1';
        } else if (latestGame.teams.team2.includes(participantId)) {
          teamName = 'Equipo 2';
        }
      }

      // Add delay to respect rate limits (2 emails per second = 500ms delay)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`📧 Sending MVP reminder to ${participant.nickname || participant.name} (${participant.email})`);

      try {
        const emailSent = await emailService.sendMvpVotingAndPaymentReminder({
          to: participant.email,
          name: participant.nickname || participant.name || 'Jugador',
          gameDate: latestGame.date,
          location,
          time,
          cost,
          paymentAlias,
          organizerName,
          teamName,
          finalScore
        });

        if (emailSent) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`❌ Failed to send MVP reminder to ${participant.email}:`, error);
        failed++;
      }
    }

    console.log(`✅ MVP reminders sent: ${successful} successful, ${failed} failed out of ${latestGame.participants.length} total`);

    return NextResponse.json({
      success: true,
      gameDate: latestGame.date.toLocaleDateString('es-ES'),
      finalScore,
      successful,
      failed,
      totalParticipants: participantsToEmail.length,
      selectedParticipants: participantsToEmail.length,
      gameLocation: location,
      message: `MVP reminders sent successfully to ${successful} participants${selectedParticipants ? ' (selected)' : ''} for the latest completed game`
    });

  } catch (error) {
    console.error('❌ Error sending MVP reminders:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}