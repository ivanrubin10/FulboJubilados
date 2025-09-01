import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { emailMonitoring } from '@/lib/email-monitoring';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (in a real app, verify this from database)
    // For now, we'll assume any authenticated user can see email health
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await emailMonitoring.getEmailStats();
        return NextResponse.json(stats);

      case 'report':
        const report = await emailMonitoring.generateDeliverabilityReport();
        return NextResponse.json(report);

      case 'problems':
        const problems = await emailMonitoring.getProblemEmails();
        return NextResponse.json(problems);

      default:
        // Return basic health check
        const basicHealth = {
          status: 'operational',
          lastCheck: new Date(),
          emailProvider: 'Resend',
          authenticationStatus: {
            spf: process.env.SPF_CONFIGURED === 'true',
            dkim: process.env.DKIM_ENABLED === 'true',
            dmarc: process.env.DMARC_POLICY !== undefined,
            domainVerified: process.env.DOMAIN_VERIFIED === 'true'
          }
        };

        return NextResponse.json(basicHealth);
    }

  } catch (error) {
    console.error('Error fetching email health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email health' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, email } = body;

    switch (action) {
      case 'test-deliverability':
        if (!email) {
          return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const testResult = await emailMonitoring.testEmailDeliverability(email);
        return NextResponse.json(testResult);

      case 'validate-email':
        if (!email) {
          return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        const validation = await emailMonitoring.validateEmailDeliverability(email);
        return NextResponse.json(validation);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in email health POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}