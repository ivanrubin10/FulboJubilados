import { Resend } from 'resend';
import { getCapitalizedMonthName } from './utils';
import { calendarService } from './calendar';

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
      console.log('📧 EmailService.sendEmail called with:', {
        to: data.to,
        subject: data.subject,
        from: data.from || this.fromEmail,
        hasHtml: !!data.html,
        htmlLength: data.html?.length || 0
      });

      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY not configured. Email not sent.');
        console.error('❌ Available env vars:', Object.keys(process.env).filter(key => key.includes('RESEND')));
        return false;
      }

      console.log('✅ RESEND_API_KEY is configured');
      console.log('📮 Sending email via Resend...');

      const { data: result, error } = await resend.emails.send({
        from: data.from || this.fromEmail,
        to: data.to,
        subject: data.subject,
        html: data.html,
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return false;
      }

      console.log('✅ Email sent successfully via Resend');
      console.log('📧 Email ID:', result?.id);
      console.log('📧 Result:', JSON.stringify(result, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Failed to send email - caught exception:', error);
      console.error('❌ Exception details:', error instanceof Error ? error.stack : 'No stack trace');
      return false;
    }
  }

  // Simplified email notification methods - only 3 needed

  async sendAdminMatchReadyNotification(adminEmails: string[], gameDate: Date, playerCount: number): Promise<boolean> {
    console.log('🚨 sendAdminMatchReadyNotification called');
    console.log('📧 Admin emails:', adminEmails);
    console.log('📅 Game date:', gameDate);
    console.log('👥 Player count:', playerCount);
    
    const subject = `🚨 ADMIN: Partido listo con ${playerCount} jugadores - ${gameDate.toLocaleDateString('es-ES')}`;
    const html = this.generateAdminMatchReadyEmail(gameDate, playerCount);
    
    console.log('📝 Email subject:', subject);
    console.log('📄 HTML length:', html.length);
    
    const result = await this.sendEmail({
      to: adminEmails,
      subject,
      html,
    });
    
    console.log('📧 Email sending result:', result);
    return result;
  }

  // Email template generators - only keeping the 3 needed templates

  private generateAdminMatchReadyEmail(gameDate: Date, playerCount: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; }
            .button-confirm { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
            .alert-box { background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0; }
            .details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 ACCIÓN REQUERIDA</h1>
              <p>Un partido ha alcanzado ${playerCount} jugadores</p>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2 style="margin-top: 0; color: #dc2626;">⚽ ¡Partido Listo para Confirmación!</h2>
                <p>Un partido para el <strong>${gameDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong> ha alcanzado <strong>${playerCount} jugadores</strong> y está listo para ser confirmado.</p>
              </div>
              
              <div class="details">
                <h3>📋 Detalles del Partido</h3>
                <p><strong>📅 Fecha:</strong> ${gameDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>👥 Jugadores confirmados:</strong> ${playerCount}</p>
                <p><strong>⏰ Estado:</strong> Esperando confirmación del administrador</p>
              </div>
              
              <h3>🚨 Acción Requerida:</h3>
              <ul>
                <li><strong>✅ Confirmar el partido:</strong> Reserva la cancha y confirma el horario</li>
                <li><strong>👥 Organizar equipos:</strong> Los equipos se pueden generar automáticamente</li>
                <li><strong>📧 Notificar jugadores:</strong> Una vez confirmado, se notificará a todos los participantes</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/games" class="button-confirm" style="color: white; text-decoration: none;">
                  🚨 CONFIRMAR PARTIDO AHORA
                </a>
              </div>
              
              <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h4 style="margin-top: 0; color: #d97706;">💡 Recordatorio</h4>
                <p style="margin-bottom: 0; color: #92400e;">Si no confirmas el partido dentro de las próximas 24 horas, recibirás otro recordatorio. Los jugadores están esperando la confirmación.</p>
              </div>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - Panel de Administración</p>
              <p style="font-size: 12px; color: #94a3b8;">Este es un email automático enviado cuando un partido alcanza 10 jugadores</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Individual notification methods for the 3 simplified email types
  async sendVotingReminder(data: { to: string; name: string; month: number; year: number }): Promise<boolean> {
    const monthCapitalized = getCapitalizedMonthName(data.year, data.month);
    const subject = `🗳️ Recordatorio: Marca tu disponibilidad para ${monthCapitalized}`;
    const html = this.generateIndividualVotingReminderEmail(data.name, data.month, data.year);
    
    return this.sendEmail({
      to: [data.to],
      subject,
      html,
    });
  }

  async sendMatchConfirmation(data: { 
    to: string; 
    name: string; 
    gameDate: Date; 
    location: string; 
    time: string; 
    cost?: number; 
    reservedBy: string;
    mapsLink?: string;
    paymentAlias?: string;
  }): Promise<boolean> {
    const subject = `⚽ Partido confirmado - ${data.gameDate.toLocaleDateString('es-ES')}`;
    const html = this.generateIndividualMatchConfirmationEmail(data);
    
    return this.sendEmail({
      to: [data.to],
      subject,
      html,
    });
  }

  private generateIndividualVotingReminderEmail(name: string, month: number, year: number): string {
    const monthCapitalized = getCapitalizedMonthName(year, month);
    
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
              <h1>🗳️ ¡Hola ${name}!</h1>
              <p>Recordatorio de disponibilidad para ${monthCapitalized}</p>
            </div>
            <div class="content">
              <div class="highlight">
                <h2>📅 Marca tu disponibilidad para ${monthCapitalized} ${year}</h2>
                <p>Aún no has marcado qué domingos puedes jugar este mes. ¡Tu participación es importante para organizar los partidos!</p>
              </div>
              
              <div class="options">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">
                  ✅ Marcar Disponibilidad
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button-red">
                  ❌ No Puedo Ningún Día
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

  private generateIndividualMatchConfirmationEmail(data: { 
    name: string; 
    gameDate: Date; 
    location: string; 
    time: string; 
    cost?: number; 
    reservedBy: string;
    mapsLink?: string;
    paymentAlias?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
            .confirmed-box { background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
            .details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚽ ¡Hola ${data.name}!</h1>
              <p>Tu partido ha sido confirmado</p>
            </div>
            <div class="content">
              <div class="confirmed-box">
                <h2 style="margin-top: 0; color: #059669;">🎉 ¡Partido Confirmado!</h2>
                <p>El administrador ha confirmado el partido y ha reservado la cancha. ¡Todo listo para jugar!</p>
              </div>
              
              <div class="details">
                <h3>📋 Detalles del Partido</h3>
                <p><strong>📅 Fecha:</strong> ${data.gameDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p><strong>🕒 Hora:</strong> ${data.time}</p>
                <p><strong>📍 Ubicación:</strong> ${data.location}${data.mapsLink ? ` (<a href="${data.mapsLink}" target="_blank" style="color: #10b981; text-decoration: none;">🗺️ Ver en Maps</a>)` : ''}</p>
                ${data.cost ? `<p><strong>💰 Costo:</strong> ARS $${data.cost}</p>` : ''}
                <p><strong>👤 Reservado por:</strong> ${data.reservedBy}</p>
                ${data.paymentAlias ? `<p><strong>💳 Alias para transferir:</strong> ${data.paymentAlias}${data.cost ? ` <span style="color: #059669; font-weight: bold;">(ARS $${(data.cost / 10).toFixed(0)} por persona)</span>` : ''}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/games" class="button" style="margin-right: 10px;">
                  Ver Detalles del Partido
                </a>
                <a href="${this.generateCalendarLink(data)}" target="_blank" class="button" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                  📅 Agregar al Calendario
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

  private generateCalendarLink(data: { 
    gameDate: Date; 
    location: string; 
    time: string; 
    mapsLink?: string;
  }): string {
    return calendarService.generateGoogleCalendarUrl(
      data.gameDate,
      data.time,
      data.mapsLink ? `${data.location} - ${data.mapsLink}` : data.location
    );
  }
}

export const emailService = EmailService.getInstance();