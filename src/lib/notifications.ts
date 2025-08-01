import { User } from '@/types';

export interface EmailNotificationRequest {
  type: 'admin-match-ready';
  data: {
    gameDate: string;
    adminEmails: string[];
    playerCount: number;
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

  // Simplified helper method for admin match ready notification
  async notifyAdminMatchReady(gameDate: Date, adminUsers: User[], playerCount: number): Promise<boolean> {
    const adminEmails = adminUsers.map(user => user.email);
    
    return this.sendEmailNotification({
      type: 'admin-match-ready',
      data: {
        gameDate: gameDate.toISOString(),
        adminEmails,
        playerCount,
      },
    });
  }

}

export const notificationService = NotificationService.getInstance();