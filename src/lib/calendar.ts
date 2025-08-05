import { User } from '@/types';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
}

export class CalendarService {
  private static instance: CalendarService;

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  async createEvent(
    gameDate: Date,
    participants: User[],
    customTime: string = '10:00',
    location?: string,
    mapsLink?: string
  ): Promise<string | null> {
    try {
      // Parse custom time
      const [hours, minutes] = customTime.split(':').map(Number);
      const startTime = new Date(gameDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      // End time is 1 hour later
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const event: CalendarEvent = {
        id: `futbol_${Date.now()}_${gameDate.getTime()}`,
        title: 'Partido de Fútbol',
        description: `Partido organizado automáticamente con ${participants.length} jugadores.\n\nParticipantes:\n${participants.map(p => `• ${p.name} (${p.email})`).join('\n')}`,
        startTime,
        endTime,
        location: mapsLink ? `${location || 'Cancha por definir'} - ${mapsLink}` : (location || 'Cancha por definir'),
        attendees: participants.map(p => p.email)
      };

      // In a real implementation, this would call Google Calendar API
      // For now, we'll simulate the event creation
      console.log('Creating calendar event:', event);
      
      // Generate calendar invite data for email
      const icsData = this.generateICS(event);
      console.log('ICS data generated:', icsData.substring(0, 200) + '...');

      return event.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  private generateICS(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      // Format date in local timezone for ICS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Futbol Organizer//ES',
      'BEGIN:VEVENT',
      `UID:${event.id}@futbol-organizer.com`,
      `DTSTART:${formatDate(event.startTime)}`,
      `DTEND:${formatDate(event.endTime)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      event.location ? `LOCATION:${event.location}` : '',
      `ORGANIZER:mailto:admin@futbol-organizer.com`,
      ...event.attendees.map(email => `ATTENDEE:mailto:${email}`),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line.length > 0).join('\r\n');

    return icsContent;
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<boolean> {
    try {
      // In a real implementation, this would update the Google Calendar event
      console.log(`Updating calendar event ${eventId}:`, updates);
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // In a real implementation, this would delete the Google Calendar event  
      console.log(`Deleting calendar event ${eventId}`);
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  // Generate Google Calendar URL for manual creation
  generateGoogleCalendarUrl(
    gameDate: Date,
    customTime: string = '10:00',
    location?: string,
    participants?: User[]
  ): string {
    const [hours, minutes] = customTime.split(':').map(Number);
    const startTime = new Date(gameDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);

    const formatGoogleDate = (date: Date): string => {
      // Format date in local timezone for Google Calendar
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Partido de Fútbol',
      dates: `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`,
      details: participants 
        ? `Partido organizado con ${participants.length} jugadores.\n\nParticipantes:\n${participants.map(p => `• ${p.name} (${p.email})`).join('\n')}`
        : 'Partido de fútbol organizado automáticamente',
      location: location || 'Cancha por definir'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}

export const calendarService = CalendarService.getInstance();