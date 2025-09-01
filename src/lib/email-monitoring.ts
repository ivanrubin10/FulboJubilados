// import { DatabaseService } from './db/service';

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'admin_notification' | 'voting_reminder' | 'match_confirmation' | 'mvp_voting';
  status: 'sent' | 'failed' | 'bounced' | 'complained';
  resendId?: string;
  errorMessage?: string;
  sentAt: Date;
  gameId?: string;
}

export interface EmailStats {
  totalSent: number;
  successRate: number;
  bounceRate: number;
  complaintRate: number;
  recentFailures: EmailLog[];
  topFailureReasons: { reason: string; count: number; }[];
}

export class EmailMonitoringService {
  private static instance: EmailMonitoringService;

  public static getInstance(): EmailMonitoringService {
    if (!EmailMonitoringService.instance) {
      EmailMonitoringService.instance = new EmailMonitoringService();
    }
    return EmailMonitoringService.instance;
  }

  // Log email send attempts
  async logEmailSent(data: {
    to: string;
    subject: string;
    type: EmailLog['type'];
    resendId?: string;
    gameId?: string;
  }): Promise<string> {
    const emailLog: Omit<EmailLog, 'id'> = {
      ...data,
      status: 'sent',
      sentAt: new Date()
    };

    // In a real implementation, this would save to database
    // For now, we'll log to console and return a mock ID
    console.log('📊 Email logged:', emailLog);
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log email failures
  async logEmailFailure(data: {
    to: string;
    subject: string;
    type: EmailLog['type'];
    errorMessage: string;
    gameId?: string;
  }): Promise<string> {
    const emailLog: Omit<EmailLog, 'id'> = {
      ...data,
      status: 'failed',
      sentAt: new Date()
    };

    console.error('📊 Email failure logged:', emailLog);
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update email status (for webhooks)
  async updateEmailStatus(logId: string, status: 'bounced' | 'complained', errorMessage?: string): Promise<void> {
    console.log(`📊 Email status updated: ${logId} -> ${status}`, errorMessage);
    // In real implementation, update database record
  }

  // Get email statistics
  async getEmailStats(days: number = 30): Promise<EmailStats> {
    // Mock implementation - in real app, query database for last ${days} days
    console.log(`Getting email stats for last ${days} days`);
    return {
      totalSent: 150,
      successRate: 0.95,
      bounceRate: 0.03,
      complaintRate: 0.02,
      recentFailures: [],
      topFailureReasons: [
        { reason: 'Invalid email address', count: 3 },
        { reason: 'Mailbox full', count: 2 },
        { reason: 'Spam filter rejection', count: 1 }
      ]
    };
  }

  // Check for problem domains/emails
  async getProblemEmails(): Promise<{ email: string; issues: string[]; lastFailure: Date }[]> {
    // Mock implementation
    return [
      {
        email: 'example@domain.com',
        issues: ['Hard bounce', 'Spam complaint'],
        lastFailure: new Date(Date.now() - 86400000) // 1 day ago
      }
    ];
  }

  // Validate email deliverability before sending
  async validateEmailDeliverability(email: string): Promise<{
    isValid: boolean;
    reason?: string;
    shouldSend: boolean;
  }> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        reason: 'Invalid email format',
        shouldSend: false
      };
    }

    // Check if email has been problematic
    const problemEmails = await this.getProblemEmails();
    const isProblem = problemEmails.some(p => p.email === email);

    if (isProblem) {
      return {
        isValid: true,
        reason: 'Email has history of bounces/complaints',
        shouldSend: false
      };
    }

    return {
      isValid: true,
      shouldSend: true
    };
  }

  // Test email sending capability
  async testEmailDeliverability(testEmail: string): Promise<{
    success: boolean;
    deliveredToInbox: boolean;
    spamScore?: number;
    warnings: string[];
  }> {
    // This would integrate with email testing services like Mail-Tester
    console.log(`Testing email deliverability to: ${testEmail}`);
    // For now, return mock data
    return {
      success: true,
      deliveredToInbox: true,
      spamScore: 2.5, // Out of 10, lower is better
      warnings: [
        'Subject line contains suspicious keywords',
        'High image-to-text ratio detected'
      ]
    };
  }

  // Generate deliverability report
  async generateDeliverabilityReport(): Promise<{
    overallHealth: 'excellent' | 'good' | 'poor' | 'critical';
    recommendations: string[];
    dnsStatus: {
      spf: boolean;
      dkim: boolean;
      dmarc: boolean;
    };
    recentStats: EmailStats;
  }> {
    const stats = await this.getEmailStats();
    
    let overallHealth: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
    const recommendations: string[] = [];

    if (stats.successRate < 0.9) {
      overallHealth = 'poor';
      recommendations.push('Success rate below 90% - check email content and authentication');
    } else if (stats.successRate < 0.95) {
      overallHealth = 'good';
      recommendations.push('Success rate could be improved - review email templates');
    }

    if (stats.bounceRate > 0.05) {
      overallHealth = 'poor';
      recommendations.push('High bounce rate - clean up email list');
    }

    if (stats.complaintRate > 0.01) {
      overallHealth = 'poor';
      recommendations.push('High complaint rate - review email content and frequency');
    }

    // Check DNS status (mock for now)
    const dnsStatus = {
      spf: process.env.SPF_CONFIGURED === 'true',
      dkim: process.env.DKIM_ENABLED === 'true',
      dmarc: process.env.DMARC_POLICY !== undefined
    };

    if (!dnsStatus.spf || !dnsStatus.dkim || !dnsStatus.dmarc) {
      overallHealth = 'critical';
      recommendations.push('Missing email authentication records (SPF/DKIM/DMARC)');
    }

    return {
      overallHealth,
      recommendations,
      dnsStatus,
      recentStats: stats
    };
  }
}

export const emailMonitoring = EmailMonitoringService.getInstance();