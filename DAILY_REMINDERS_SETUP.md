# Daily Voting Reminders Setup Guide

This system automatically sends daily email reminders to users who haven't marked their availability for the current month.

## ✅ Features Implemented

### 1. **"No puedo ningún día" Option**
- Users can now select "No puedo ningún día este mes" if they're unavailable all month
- This counts as voting and stops reminder emails
- Shows voting status with green confirmation

### 2. **Automated Daily Reminders**
- Beautiful email template explaining the voting process
- Only sent to users who haven't voted for the current month
- Stops automatically when users vote (either selecting days or "can't play any day")
- Admin can manually trigger and check status

### 3. **GitHub Actions Scheduling**
- Automated daily execution at 10:00 AM UTC
- Secure token-based authentication
- Manual trigger capability for testing

## 🚀 Setup Instructions

### Step 1: GitHub Repository Secrets
Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
CRON_SECRET=your-secure-random-token-here
APP_URL=https://your-deployed-app.vercel.app
```

### Step 2: Environment Variables
Update your `.env.local` and production environment:

```bash
# Daily Reminders
CRON_SECRET=your-secure-random-token-here
NEXT_PUBLIC_APP_URL=https://your-deployed-app.vercel.app

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### Step 3: Deploy to Production
The GitHub Actions workflow will only work with a deployed app. Deploy to:
- Vercel (recommended)
- Netlify
- Any other hosting platform

### Step 4: Test the System
1. Go to Admin Panel → Email Notifications
2. Click "📊 Ver Estado de Recordatorios" to see who needs reminders
3. Click "📧 Enviar Recordatorios Diarios" to test manually
4. Check the GitHub Actions tab to see automated runs

## 📧 Email Flow

### When Reminders Are Sent:
- Daily at 10:00 AM UTC (adjust in `.github/workflows/daily-reminders.yml`)
- Only to users who haven't voted for the current active month
- Stops when user votes (selects days OR selects "no puedo ningún día")

### Email Content:
- Explains the two voting options
- Direct links to the dashboard
- Professional design matching your app
- Clear call-to-action buttons

## 🔧 Admin Controls

### Available Actions:
- **📧 Enviar Recordatorios Diarios**: Manual trigger for testing
- **📊 Ver Estado de Recordatorios**: See who needs reminders
- **🧪 Email de Prueba**: Test general email functionality

### Monitoring:
- Check GitHub Actions logs for automated runs
- Use "Ver Estado de Recordatorios" to see current status
- Monitor email delivery in Resend dashboard

## 🕐 Schedule Customization

Edit `.github/workflows/daily-reminders.yml` to change timing:

```yaml
# Every day at 8:00 AM UTC (5:00 AM Argentina)
- cron: '0 8 * * *'

# Every day at 12:00 PM UTC (9:00 AM Argentina)  
- cron: '0 12 * * *'

# Only weekdays
- cron: '0 10 * * 1-5'

# Twice daily
- cron: '0 10,18 * * *'
```

## 🔒 Security

- **Token Protection**: API endpoint requires `CRON_SECRET` bearer token
- **User Filtering**: Only sends to non-admin users
- **Rate Limiting**: Once per day maximum per user
- **Auto-stop**: Reminders stop when user votes

## 🧪 Testing

### Local Testing:
```bash
# Check who needs reminders
curl http://localhost:3000/api/send-daily-reminders

# Send reminders (requires auth)
curl -X POST \
  -H "Authorization: Bearer your-test-token" \
  http://localhost:3000/api/send-daily-reminders
```

### Production Testing:
- Use admin panel manual triggers
- Check GitHub Actions logs
- Monitor Resend email delivery

## 📊 System Flow

1. **User Registration**: New users automatically need to vote
2. **Monthly Reset**: When admin advances month, all users need to vote again
3. **Daily Check**: GitHub Actions checks who needs reminders
4. **Email Sending**: Reminders sent to pending users
5. **Vote Recording**: When user votes, reminders stop automatically
6. **Status Tracking**: Admin can monitor who still needs to vote

## 🎯 Benefits

- **Increased Participation**: Automatic reminders boost voting rates
- **Reduced Admin Work**: No manual reminder management needed
- **Clear Options**: Users can explicitly opt out for entire month
- **Professional Look**: Beautiful, branded email templates
- **Secure & Reliable**: Token-protected, automated scheduling

The system is now fully automated and will help ensure all players mark their availability each month! 🚀