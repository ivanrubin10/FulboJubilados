import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/service';
import { emailService } from '@/lib/email';

export async function POST() {
  try {
    // Get current active month
    const { month, year } = await DatabaseService.getCurrentActiveMonth();
    console.log(`🗓️ Active month from database: ${month}/${year}`);
    
    // Get all whitelisted users (including admins for testing)
    const allUsers = await DatabaseService.getUsers();
    console.log(`👥 Total users found: ${allUsers.length}`);
    
    const whitelistedUsers = allUsers.filter(user => user.isWhitelisted);
    console.log(`✅ Whitelisted users: ${whitelistedUsers.length}`);
    console.log(`📝 Whitelisted user emails: ${whitelistedUsers.map(u => u.email).join(', ')}`);
    
    // Find users who haven't voted for the current month
    const usersNeedingReminder = [];
    
    for (const user of whitelistedUsers) {
      try {
        const votingStatus = await DatabaseService.getUserVotingStatus(user.id, month, year);
        console.log(`🗳️ User ${user.email} voting status:`, votingStatus);
        if (!votingStatus.hasVoted) {
          usersNeedingReminder.push(user);
          console.log(`➕ Added ${user.email} to reminder list (hasVoted: false)`);
        } else {
          console.log(`✅ User ${user.email} has already voted`);
        }
      } catch {
        // User hasn't voted if no record exists
        console.log(`❌ No voting record for ${user.email}, adding to reminder list`);
        usersNeedingReminder.push(user);
      }
    }
    
    console.log(`📧 Sending voting reminders to ${usersNeedingReminder.length} users for ${month}/${year}`);
    console.log(`📝 Users needing reminders: ${usersNeedingReminder.map(u => u.email).join(', ')}`);
    
    // Send email to users who haven't voted
    const emailsSent = [];
    const emailErrors = [];
    
    for (let i = 0; i < usersNeedingReminder.length; i++) {
      const user = usersNeedingReminder[i];
      try {
        console.log(`📧 Attempting to send email to ${user.email}...`);
        const success = await emailService.sendVotingReminder({
          to: user.email,
          name: user.name,
          month,
          year
        });
        
        if (success) {
          emailsSent.push(user.email);
          console.log(`✅ Email sent successfully to ${user.email}`);
        } else {
          emailErrors.push(user.email);
          console.log(`❌ Email failed to send to ${user.email}`);
        }
        
        // Add delay to respect rate limit (2 emails per second = 500ms delay)
        if (i < usersNeedingReminder.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        emailErrors.push(user.email);
        console.error(`❌ Exception sending voting reminder to ${user.email}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      count: emailsSent.length,
      totalUsersNeedingReminder: usersNeedingReminder.length,
      emailsSent: emailsSent,
      emailErrors: emailErrors,
      message: `Recordatorios enviados a ${emailsSent.length} de ${usersNeedingReminder.length} usuarios`,
      activeMonth: { month, year }
    });
    
  } catch (error) {
    console.error('Error sending voting reminders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send voting reminders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}