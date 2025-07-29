import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailNotificationData {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static instance: EmailService;
  private readonly fromEmail = process.env.FROM_EMAIL || 'noreply@fulbojubilados.com';

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(data: EmailNotificationData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured. Email not sent.');
        return false;
      }

      const { data: result, error } = await resend.emails.send({
        from: data.from || this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      if (error) {
        console.error('Error sending email:', error);
        return false;
      }

      console.log('Email sent successfully:', result?.id);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Game notification methods
  async sendGameCreatedNotification(gameDate: Date, players: string[]): Promise<boolean> {
    const subject = `🎯 Nuevo partido programado - ${gameDate.toLocaleDateString('es-ES')}`;
    const html = this.generateGameCreatedEmail(gameDate);
    
    return this.sendEmail({
      to: players,
      subject,
      html,
    });
  }

  async sendGameReminderNotification(gameDate: Date, players: string[]): Promise<boolean> {
    const subject = `⚽ Recordatorio: Partido mañana - ${gameDate.toLocaleDateString('es-ES')}`;
    const html = this.generateGameReminderEmail(gameDate);
    
    return this.sendEmail({
      to: players,
      subject,
      html,
    });
  }

  async sendTeamAssignmentNotification(gameDate: Date, teams: { team1: string[], team2: string[] }): Promise<boolean> {
    const allPlayers = [...teams.team1, ...teams.team2];
    const subject = `👥 Equipos asignados - ${gameDate.toLocaleDateString('es-ES')}`;
    const html = this.generateTeamAssignmentEmail(gameDate, teams);
    
    return this.sendEmail({
      to: allPlayers,
      subject,
      html,
    });
  }

  async sendDailyVotingReminder(month: number, year: number, players: string[]): Promise<boolean> {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
    const subject = `🗳️ Recordatorio: Marca tu disponibilidad para ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    const html = this.generateDailyReminderEmail(month, year);
    
    return this.sendEmail({
      to: players,
      subject,
      html,
    });
  }

  // Email template generators
  private generateGameCreatedEmail(gameDate: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚽ ¡Nuevo Partido Programado!</h1>
              <p>Se ha creado un nuevo partido para el domingo</p>
            </div>
            <div class="content">
              <h2>📅 Detalles del Partido</h2>
              <p><strong>Fecha:</strong> ${gameDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Hora:</strong> 10:00 AM</p>
              <p><strong>Ubicación:</strong> Cancha habitual</p>
              
              <p>¡Prepárate para un gran partido! Los equipos se asignarán automáticamente una vez que se confirmen 10 jugadores.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                  Ver Detalles del Partido
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - Organizando tu diversión dominical</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateGameReminderEmail(gameDate: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
            .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 ¡Recordatorio de Partido!</h1>
              <p>Tu partido es mañana</p>
            </div>
            <div class="content">
              <div class="highlight">
                <h2>⚽ No olvides tu partido de mañana</h2>
                <p><strong>Fecha:</strong> ${gameDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>Hora:</strong> 10:00 AM</p>
              </div>
              
              <h3>📋 Preparativos:</h3>
              <ul>
                <li>✅ Botines o zapatillas deportivas</li>
                <li>✅ Ropa cómoda para hacer deporte</li>
                <li>✅ Botella de agua</li>
                <li>✅ ¡Muchas ganas de jugar!</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/games" class="button">
                  Ver Equipos y Detalles
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - ¡Nos vemos en la cancha!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateTeamAssignmentEmail(gameDate: Date, teams: { team1: string[], team2: string[] }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .team { background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e2e8f0; }
            .team1 { border-color: #10b981; }
            .team2 { border-color: #3b82f6; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👥 ¡Equipos Asignados!</h1>
              <p>Los equipos para el partido del domingo están listos</p>
            </div>
            <div class="content">
              <h2>📅 ${gameDate.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} - 10:00 AM</h2>
              
              <div class="teams">
                <div class="team team1">
                  <h3>🟢 Equipo 1</h3>
                  <ul>
                    ${teams.team1.map(player => `<li>${player}</li>`).join('')}
                  </ul>
                </div>
                <div class="team team2">
                  <h3>🔵 Equipo 2</h3>
                  <ul>
                    ${teams.team2.map(player => `<li>${player}</li>`).join('')}
                  </ul>
                </div>
              </div>
              
              <p style="text-align: center; font-weight: bold; color: #059669;">¡Que gane el mejor equipo! 🏆</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/games" class="button">
                  Ver Detalles del Partido
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - ¡Que comience la diversión!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateDailyReminderEmail(month: number, year: number): string {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px; }
            .button-red { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .options { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗳️ ¡Recordatorio de Disponibilidad!</h1>
              <p>Aún no has marcado tu disponibilidad para ${monthCapitalized}</p>
            </div>
            <div class="content">
              <div class="highlight">
                <h2>📅 Marca tu disponibilidad para ${monthCapitalized} ${year}</h2>
                <p>¿Qué domingos puedes jugar este mes? Es importante que marques tu disponibilidad para que podamos organizar los partidos.</p>
              </div>
              
              <h3>🤔 ¿Qué necesitas hacer?</h3>
              <p>Tienes <strong>dos opciones</strong>:</p>
              
              <ul style="margin: 20px 0; padding-left: 20px;">
                <li><strong>✅ Marcar los domingos disponibles:</strong> Selecciona cada domingo que puedes jugar</li>
                <li><strong>❌ "No puedo ningún día":</strong> Si no estarás disponible en ningún domingo del mes</li>
              </ul>
              
              <div class="options">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                  ✅ Marcar Disponibilidad
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button-red">
                  ❌ No Puedo Ningún Día
                </a>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #475569;">💡 ¿Por qué es importante?</h4>
                <ul style="margin: 10px 0; padding-left: 20px; color: #64748b;">
                  <li>Nos ayuda a planificar mejor los partidos</li>
                  <li>Asegura que tengamos suficientes jugadores</li>
                  <li>Evita la cancelación de partidos por falta de confirmación</li>
                </ul>
              </div>
              
              <p style="text-align: center; margin: 30px 0; font-weight: bold; color: #059669;">
                ⏰ ¡Solo te tomará 30 segundos!
              </p>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - Organizando tu diversión dominical</p>
              <p style="font-size: 12px; color: #94a3b8;">Recibirás este recordatorio diariamente hasta que marques tu disponibilidad</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = EmailService.getInstance();