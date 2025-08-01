import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type and data' },
        { status: 400 }
      );
    }

    let success = false;

    switch (type) {
      case 'admin-match-ready':
        success = await emailService.sendAdminMatchReadyNotification(
          data.adminEmails,
          new Date(data.gameDate),
          data.playerCount
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}. Only 'admin-match-ready' is supported through this endpoint.` },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}