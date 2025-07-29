import { User } from '@/types';

// Interface for reservation info
interface ReservationInfo {
  location: string;
  time: string;
  cost?: number;
  reservedBy: string;
}

export interface EmailNotificationRequest {
  type: 'game-created' | 'game-reminder' | 'team-assignment' | 'match-confirmed' | 'voting-reminder';
  data: {
    gameDate?: string;
    players?: string[];
    teams?: {
      team1: string[];
      team2: string[];
    };
    customTime?: string;
    reservationInfo?: {
      location: string;
      time: string;
      cost?: number;
      reservedBy: string;
    };
    calendarEventId?: string;
    month?: number;
    year?: number;
  };
}

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendEmailNotification(request: EmailNotificationRequest): Promise<boolean> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Failed to send email notification:', result.error);
        return false;
      }

      console.log('Email notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  // Helper methods for specific notifications
  async notifyGameCreated(gameDate: Date, participants: User[]): Promise<boolean> {
    const playerEmails = participants.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'game-created',
      data: {
        gameDate: gameDate.toISOString(),
        players: playerEmails,
      },
    });
  }

  async notifyGameReminder(gameDate: Date, participants: User[]): Promise<boolean> {
    const playerEmails = participants.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'game-reminder',
      data: {
        gameDate: gameDate.toISOString(),
        players: playerEmails,
      },
    });
  }

  async notifyTeamAssignments(
    gameDate: Date, 
    team1: User[], 
    team2: User[]
  ): Promise<boolean> {
    const team1Emails = team1.map(user => user.email);
    const team2Emails = team2.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'team-assignment',
      data: {
        gameDate: gameDate.toISOString(),
        teams: {
          team1: team1Emails,
          team2: team2Emails,
        },
      },
    });
  }

  // Utility method to get users available for a specific date
  getUsersAvailableForDate(date: Date, allUsers: User[]): User[] {
    // This would integrate with your availability system
    // For now, return all users as a placeholder
    return allUsers.filter(user => !user.isAdmin); // Exclude admins from game notifications
  }

  // New notification methods
  async notifyMatchConfirmed(
    gameDate: Date, 
    participants: User[], 
    customTime?: string, 
    reservationInfo?: ReservationInfo,
    calendarEventId?: string
  ): Promise<boolean> {
    const playerEmails = participants.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'match-confirmed',
      data: {
        gameDate: gameDate.toISOString(),
        players: playerEmails,
        customTime,
        reservationInfo,
        calendarEventId,
      },
    });
  }

  async notifyVotingReminder(users: User[], month: number, year: number): Promise<boolean> {
    const playerEmails = users.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'voting-reminder',
      data: {
        players: playerEmails,
        month,
        year,
      },
    });
  }

  // Calendar integration
  async createCalendarEvent(gameDate: Date, participants: User[], customTime?: string): Promise<string | null> {
    try {
      // This would integrate with Google Calendar API
      // For now, return a mock calendar event ID
      const mockEventId = `event_${Date.now()}_${gameDate.getTime()}`;
      console.log(`Calendar event created: ${mockEventId} for ${gameDate.toISOString()}`);
      return mockEventId;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  // Schedule reminder emails (would need a cron job or similar in production)
  async scheduleGameReminders(gameDate: Date, participants: User[]): Promise<void> {
    // In a real app, you'd use a job queue or cron service
    // For now, this is a placeholder for the scheduling logic
    console.log(`Reminder scheduled for ${gameDate.toISOString()} for ${participants.length} players`);
  }
}

export const notificationService = NotificationService.getInstance();