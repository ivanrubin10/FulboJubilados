import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';

export async function POST() {
  try {
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
      
      // Get participant details
      const participants = game.participants
        .map(participantId => userMap.get(participantId))
        .filter(user => user !== undefined);
      
      // Send email to each participant
      for (const participant of participants) {
        try {
          const success = await emailService.sendMatchConfirmation({
            to: participant.email,
            name: participant.name,
            gameDate: new Date(game.date),
            location: game.reservationInfo?.location || 'Ubicación por confirmar',
            time: game.reservationInfo?.time || '10:00',
            cost: game.reservationInfo?.cost,
            reservedBy: game.reservationInfo?.reservedBy || 'Administrador'
          });
          
          if (success) {
            emailsSent.push(participant.email);
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