import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
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

    console.log('📧 Admin requesting test email...');
    
    // Get all admin users
    const allUsers = await DatabaseService.getUsers();
    const adminUsers = allUsers.filter(u => u.isAdmin);
    const adminEmails = adminUsers.map(admin => admin.email);

    console.log(`📊 Found ${adminUsers.length} admin users: ${adminEmails.join(', ')}`);

    if (adminEmails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No admin users found to send test email'
      }, { status: 400 });
    }

    // Generate test email content
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 12px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
            .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧪 Email de Prueba</h1>
              <p>Test del sistema de emails</p>
            </div>
            <div class="content">
              <div class="success-box">
                <h2 style="margin-top: 0; color: #059669;">✅ ¡Email funcionando correctamente!</h2>
                <p>Este es un email de prueba del sistema Fulbo Jubilados. Si recibes este mensaje, significa que:</p>
                <ul>
                  <li>✅ La configuración de email está correcta</li>
                  <li>✅ El servicio Resend está funcionando</li>
                  <li>✅ Los emails llegan correctamente a los admins</li>
                  <li>✅ El sistema de notificaciones está operativo</li>
                </ul>
              </div>
              
              <p><strong>Detalles del test:</strong></p>
              <ul>
                <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</li>
                <li><strong>Enviado por:</strong> ${user.name} (${user.email})</li>
                <li><strong>Tipo:</strong> Test manual desde panel de administración</li>
              </ul>
            </div>
            <div class="footer">
              <p>Fulbo Jubilados - Sistema de Emails</p>
            </div>
          </div>
        </body>
      </html>
    `;

    let successCount = 0;
    const errors: string[] = [];

    // Send test email to each admin
    for (const adminEmail of adminEmails) {
      try {
        console.log(`📧 Sending test email to: ${adminEmail}`);
        const success = await emailService.sendEmail({
          to: [adminEmail],
          subject: '🧪 Test Email - Fulbo Jubilados',
          html: testEmailHtml
        });

        if (success) {
          successCount++;
          console.log(`✅ Test email sent successfully to: ${adminEmail}`);
        } else {
          errors.push(`Failed to send to ${adminEmail}`);
          console.log(`❌ Failed to send test email to: ${adminEmail}`);
        }
      } catch (error) {
        const errorMsg = `Error sending to ${adminEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    const response = {
      success: successCount > 0,
      count: successCount,
      total: adminEmails.length,
      adminEmails: adminEmails,
      errors: errors.length > 0 ? errors : undefined,
      message: `Test email sent to ${successCount}/${adminEmails.length} admin(s)`
    };

    console.log('📧 Test email results:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in send test email API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}