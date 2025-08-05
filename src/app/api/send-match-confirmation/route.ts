import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedParticipants } = body;

    // Get all confirmed games (games with status 'confirmed' and participants)
    const allGames = await DatabaseService.getAllGames();
    const confirmedGames = allGames.filter(game => 
      game.status === 'confirmed' && 
      game.participants && 
      game.participants.length >= 10
    );
    
    if (confirmedGames.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay partidos confirmados para notificar'
      }, { status: 400 });
    }
    
    // Get all users for participant lookup
    const allUsers = await DatabaseService.getUsers();
    const userMap = new Map(allUsers.map(user => [user.id, user]));
    
    const emailsSent = [];
    
    // Send confirmation emails for each confirmed game
    for (const game of confirmedGames) {
      console.log(`📧 Sending match confirmation for game on ${new Date(game.date).toLocaleDateString('es-ES')}`);
      
      // Get participant details, filtered by selected participants if provided
      let participants = game.participants
        .map(participantId => userMap.get(participantId))
        .filter(user => user !== undefined);
      
      // If selectedParticipants is provided, filter to only those participants
      if (selectedParticipants && Array.isArray(selectedParticipants)) {
        participants = participants.filter(participant => 
          selectedParticipants.includes(participant.id)
        );
      }
      
      console.log(`📧 Sending to ${participants.length} selected participants`);
      
      // Send email to each participant with rate limiting (2 emails per second max)
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        try {
          const success = await emailService.sendMatchConfirmation({
            to: participant.email,
            name: participant.name,
            gameDate: new Date(game.date),
            location: game.reservationInfo?.location || 'Ubicación por confirmar',
            time: game.reservationInfo?.time || '10:00',
            cost: game.reservationInfo?.cost,
            reservedBy: game.reservationInfo?.reservedBy || 'Administrador',
            mapsLink: game.reservationInfo?.mapsLink,
            paymentAlias: game.reservationInfo?.paymentAlias
          });
          
          if (success) {
            emailsSent.push(participant.email);
          }
          
          // Add delay to respect rate limit (2 emails per second = 1000ms delay for safety)
          if (i < participants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Failed to send match confirmation to ${participant.email}:`, error);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      count: emailsSent.length,
      gamesConfirmed: confirmedGames.length,
      message: `Confirmaciones enviadas a ${emailsSent.length} jugadores para ${confirmedGames.length} partido(s)`
    });
    
  } catch (error) {
    console.error('Error sending match confirmations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send match confirmations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}