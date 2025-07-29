import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';

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

    console.log('🧪 Testing email system...');
    
    // Test the complete email flow
    const testGameDate = new Date();
    testGameDate.setDate(testGameDate.getDate() + 1); // Tomorrow
    
    const testPlayerCount = 10;
    
    // Get admin users from database
    const adminUsers = await DatabaseService.getUsers();
    const admins = adminUsers.filter(u => u.isAdmin);
    const adminEmails = admins.map(admin => admin.email);
    
    console.log('🔍 Admin users found:', admins.length);
    console.log('📧 Admin emails:', adminEmails);
    
    if (adminEmails.length === 0) {
      return NextResponse.json({ 
        error: 'No admin users found',
        debug: { adminUsers: adminUsers.length, admins: admins.length }
      }, { status: 400 });
    }
    
    // Test email sending
    console.log('📧 Testing email sending...');
    const emailSent = await emailService.sendAdminMatchReadyNotification(
      adminEmails,
      testGameDate,
      testPlayerCount
    );
    
    return NextResponse.json({ 
      success: true,
      emailSent,
      message: `Email test ${emailSent ? 'successful' : 'failed'}`,
      debug: {
        adminCount: admins.length,
        adminEmails,
        gameDate: testGameDate.toISOString(),
        playerCount: testPlayerCount,
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL
      }
    });
  } catch (error: unknown) {
    console.error('Error in email test:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    }, { status: 500 });
  }
}