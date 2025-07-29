import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    try {
      const notifications = await DatabaseService.getUnreadAdminNotifications();
      return NextResponse.json(notifications);
    } catch (dbError: unknown) {
      // If the table doesn't exist yet, return empty array
      if (dbError instanceof Error && dbError.message && dbError.message.includes('relation "admin_notifications" does not exist')) {
        console.log('Admin notifications table does not exist yet, returning empty array');
        return NextResponse.json([]);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, notificationId, gameId, customTime, reservationInfo } = body;

    if (action === 'mark_read' && notificationId) {
      await DatabaseService.markAdminNotificationAsRead(notificationId);
      return NextResponse.json({ success: true });
    }

    if (action === 'confirm_match' && gameId) {
      console.log('🎯 Admin confirming match:', { gameId, customTime, reservationInfo, notificationId });
      
      try {
        await DatabaseService.confirmGame(gameId, customTime, reservationInfo);
        console.log('✅ Game confirmed successfully');
        
        // Mark related notification as read
        if (notificationId) {
          await DatabaseService.markAdminNotificationAsRead(notificationId);
          console.log('✅ Notification marked as read');
        }
        
        return NextResponse.json({ success: true, message: 'Match confirmed successfully' });
      } catch (error) {
        console.error('❌ Error confirming match:', error);
        throw error;
      }
    }

    if (action === 'create_voting_reminder') {
      const { month, year } = await DatabaseService.getCurrentActiveMonth();
      await DatabaseService.createVotingReminderNotification(month, year);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling admin notification action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}