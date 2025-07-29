import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';
import { HybridStore } from '@/lib/hybrid-store';

export async function POST(request: NextRequest) {
  try {
    // Verify this is being called by GitHub Actions or admin
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current active month
    const activeMonth = await HybridStore.getCurrentActiveMonth();
    const { month, year } = activeMonth;

    // Get users who need reminders
    const usersNeedingReminders = await HybridStore.getUsersNeedingReminders(month, year);
    
    if (usersNeedingReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users need reminders',
        count: 0
      });
    }

    // Extract email addresses
    const emailAddresses = usersNeedingReminders.map(user => user.email);

    // Send reminder emails
    const success = await emailService.sendDailyVotingReminder(month, year, emailAddresses);

    if (success) {
      // Update reminder status for each user
      for (const user of usersNeedingReminders) {
        await HybridStore.updateReminderStatus(user.id, month, year);
      }

      return NextResponse.json({
        success: true,
        message: `Daily reminders sent successfully`,
        count: usersNeedingReminders.length,
        recipients: usersNeedingReminders.map(u => ({ name: u.name, email: u.email }))
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send reminder emails' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-daily-reminders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for testing purposes
export async function GET() {
  try {
    const activeMonth = await HybridStore.getCurrentActiveMonth();
    const { month, year } = activeMonth;
    const usersNeedingReminders = await HybridStore.getUsersNeedingReminders(month, year);

    return NextResponse.json({
      success: true,
      activeMonth: { month, year },
      usersNeedingReminders: usersNeedingReminders.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email
      })),
      count: usersNeedingReminders.length
    });
  } catch (error) {
    console.error('Error in send-daily-reminders GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}