import { db } from './connection';
import { users, monthlyAvailability, reminderStatus, settings, games, adminNotifications } from './schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import type { User } from '@/types';
import type { Game, AdminNotification, NewGame, NewAdminNotification } from './schema';
import { calendarService } from '../calendar';
import { notificationService } from '../notifications';
import { emailService } from '../email';

// Interface for reservation info
interface ReservationInfo {
  location: string;
  time: string;
  cost?: number;
  reservedBy: string;
}

export class DatabaseService {
  // User management
  static async getUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return result.map(user => ({
      ...user,
      nickname: user.nickname ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
      createdAt: new Date(user.createdAt),
    }));
  }

  static async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    return {
      ...result[0],
      nickname: result[0].nickname ?? undefined,
      imageUrl: result[0].imageUrl ?? undefined,
      updatedAt: result[0].updatedAt ? new Date(result[0].updatedAt) : undefined,
      createdAt: new Date(result[0].createdAt),
    };
  }

  static async addUser(user: Omit<User, 'createdAt'> & { createdAt?: Date }): Promise<void> {
    await db.insert(users).values({
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname || null,
      imageUrl: user.imageUrl || null,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted,
      createdAt: user.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  static async updateUser(updatedUser: User): Promise<void> {
    await db.update(users)
      .set({ 
        email: updatedUser.email,
        name: updatedUser.name,
        nickname: updatedUser.nickname || null,
        imageUrl: updatedUser.imageUrl || null,
        isAdmin: updatedUser.isAdmin,
        isWhitelisted: updatedUser.isWhitelisted,
        updatedAt: new Date() 
      })
      .where(eq(users.id, updatedUser.id));
  }

  static async saveUsers(userList: User[]): Promise<void> {
    // This is a batch operation - for migration purposes
    for (const user of userList) {
      await db.insert(users)
        .values({
          ...user,
          nickname: user.nickname || null,
          imageUrl: user.imageUrl || null,
          updatedAt: user.updatedAt || new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...user,
            nickname: user.nickname || null,
            imageUrl: user.imageUrl || null,
            updatedAt: new Date(),
          }
        });
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  static async toggleUserWhitelist(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      await db.update(users)
        .set({ 
          isWhitelisted: !user.isWhitelisted,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }
  }

  static async getWhitelistedUsers(): Promise<User[]> {
    const result = await db.select()
      .from(users)
      .where(and(eq(users.isWhitelisted, true), eq(users.isAdmin, false)));
    
    return result.map(user => ({
      ...user,
      nickname: user.nickname ?? undefined,
      imageUrl: user.imageUrl ?? undefined,
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined,
      createdAt: new Date(user.createdAt),
    }));
  }

  static async getWhitelistedUserCount(): Promise<number> {
    const result = await this.getWhitelistedUsers();
    return result.length;
  }

  // Monthly availability management
  static async updateMonthlyAvailability(
    userId: string,
    month: number,
    year: number,
    availableSundays: number[],
    cannotPlayAnyDay: boolean = false
  ): Promise<void> {
    // Check for confirmed games that would prevent availability
    const filteredSundays = cannotPlayAnyDay ? [] : await this.filterAvailableSundays(availableSundays, month, year);
    
    await db.insert(monthlyAvailability)
      .values({
        userId,
        month,
        year,
        availableSundays: filteredSundays,
        cannotPlayAnyDay,
        hasVoted: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [monthlyAvailability.userId, monthlyAvailability.month, monthlyAvailability.year],
        set: {
          availableSundays: filteredSundays,
          cannotPlayAnyDay,
          hasVoted: true,
          updatedAt: new Date(),
        }
      });

    // Stop reminders for this user/month when they vote
    await this.deactivateReminders(userId, month, year);
  }

  // Helper function to filter out Sundays that already have confirmed games
  static async filterAvailableSundays(requestedSundays: number[], month: number, year: number): Promise<number[]> {
    // TODO: Implement games filtering for database version
    // For now, return all requested Sundays since games management is not yet implemented in database
    return requestedSundays;
  }

  static async getUserMonthlyAvailability(userId: string, month: number, year: number): Promise<number[]> {
    const result = await db.select()
      .from(monthlyAvailability)
      .where(and(
        eq(monthlyAvailability.userId, userId),
        eq(monthlyAvailability.month, month),
        eq(monthlyAvailability.year, year)
      ))
      .limit(1);

    return result.length > 0 ? result[0].availableSundays : [];
  }

  static async getUserVotingStatus(userId: string, month: number, year: number): Promise<{ hasVoted: boolean; cannotPlayAnyDay: boolean }> {
    const result = await db.select()
      .from(monthlyAvailability)
      .where(and(
        eq(monthlyAvailability.userId, userId),
        eq(monthlyAvailability.month, month),
        eq(monthlyAvailability.year, year)
      ))
      .limit(1);

    if (result.length === 0) {
      return { hasVoted: false, cannotPlayAnyDay: false };
    }

    return {
      hasVoted: result[0].hasVoted,
      cannotPlayAnyDay: result[0].cannotPlayAnyDay
    };
  }

  // Reminder status management
  static async updateReminderStatus(userId: string, month: number, year: number): Promise<void> {
    const existing = await db.select()
      .from(reminderStatus)
      .where(and(
        eq(reminderStatus.userId, userId),
        eq(reminderStatus.month, month),
        eq(reminderStatus.year, year)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(reminderStatus)
        .set({
          lastReminderSent: new Date(),
          reminderCount: existing[0].reminderCount + 1,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(reminderStatus.id, existing[0].id));
    } else {
      await db.insert(reminderStatus).values({
        userId,
        month,
        year,
        lastReminderSent: new Date(),
        reminderCount: 1,
        isActive: true,
        updatedAt: new Date(),
      });
    }
  }

  static async deactivateReminders(userId: string, month: number, year: number): Promise<void> {
    await db.update(reminderStatus)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(reminderStatus.userId, userId),
        eq(reminderStatus.month, month),
        eq(reminderStatus.year, year)
      ));
  }

  static async getUsersNeedingReminders(month: number, year: number): Promise<User[]> {
    // Get whitelisted, non-admin users
    const whitelistedUsers = await this.getWhitelistedUsers();
    
    // Filter users who haven't voted or don't have active reminders disabled
    const usersNeedingReminders: User[] = [];
    
    for (const user of whitelistedUsers) {
      // Check if user has voted for this month
      const votingStatus = await this.getUserVotingStatus(user.id, month, year);
      
      if (votingStatus.hasVoted) {
        continue; // User has already voted
      }

      // Check if reminders are still active (default to true if no record)
      const reminderRecord = await db.select()
        .from(reminderStatus)
        .where(and(
          eq(reminderStatus.userId, user.id),
          eq(reminderStatus.month, month),
          eq(reminderStatus.year, year)
        ))
        .limit(1);

      const isActive = reminderRecord.length === 0 || reminderRecord[0].isActive;
      
      if (isActive) {
        usersNeedingReminders.push(user);
      }
    }

    return usersNeedingReminders;
  }

  // Settings management
  static async getSetting(key: string): Promise<unknown> {
    const result = await db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    
    return result.length > 0 ? result[0].value : null;
  }

  static async setSetting(key: string, value: unknown): Promise<void> {
    await db.insert(settings)
      .values({
        key,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: new Date(),
        }
      });
  }

  static async getCurrentActiveMonth(): Promise<{ month: number; year: number }> {
    const currentMonth = await this.getSetting('currentMonth');
    const currentYear = await this.getSetting('currentYear');
    
    if (currentMonth && currentYear && typeof currentMonth === 'number' && typeof currentYear === 'number') {
      return { month: currentMonth, year: currentYear };
    }

    // Default to current month/year
    const now = new Date();
    const defaultMonth = now.getMonth() + 1;
    const defaultYear = now.getFullYear();
    
    await this.setSetting('currentMonth', defaultMonth);
    await this.setSetting('currentYear', defaultYear);
    
    return { month: defaultMonth, year: defaultYear };
  }

  static async setCurrentActiveMonth(month: number, year: number): Promise<void> {
    await this.setSetting('currentMonth', month);
    await this.setSetting('currentYear', year);
  }

  // Game management
  static async createGame(gameData: Omit<NewGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const result = await db.insert(games).values({
        ...gameData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning({ id: games.id });
      
      return result[0].id;
    } catch (error: unknown) {
      console.error('Error creating game:', error);
      // If it's a column issue, try creating with basic columns only
      if (error instanceof Error && error.message && error.message.includes('does not exist')) {
        console.log('Attempting to create game with basic columns only...');
        const basicGameData = {
          date: gameData.date,
          participants: gameData.participants,
          status: gameData.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await db.insert(games).values(basicGameData).returning({ id: games.id });
        return result[0].id;
      }
      throw error;
    }
  }

  static async getGame(gameId: string): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  }

  static async updateGame(gameId: string, updates: Partial<Omit<Game, 'id' | 'createdAt'>>): Promise<void> {
    console.log('🔄 updateGame called:', { gameId, updates });
    
    try {
      const result = await db.update(games)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(games.id, gameId))
        .returning({ id: games.id, status: games.status });
      
      console.log('💾 Database update result:', result);
      
      // Verify the update worked
      const updatedGame = await this.getGame(gameId);
      console.log('🔍 Game after update:', updatedGame);
      
    } catch (error) {
      console.error('❌ Error updating game:', error);
      throw error;
    }
  }

  static async getAllGames(): Promise<Game[]> {
    try {
      const allGames = await db.select().from(games);
      return allGames;
    } catch (error: unknown) {
      // If the table doesn't exist, return empty array
      if (error instanceof Error && error.message && (
        error.message.includes('relation "games" does not exist') ||
        error.message.includes('column "admin_notification_sent" does not exist')
      )) {
        console.log('Games table does not exist yet - returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getGamesWithFullParticipants(): Promise<Game[]> {
    try {
      const allGames = await this.getAllGames();
      return allGames.filter(game => game.participants.length >= 10);
    } catch (error: any) {
      // If the table doesn't exist, return empty array
      if (error.message && (
        error.message.includes('relation "games" does not exist') ||
        error.message.includes('column "admin_notification_sent" does not exist')
      )) {
        console.log('Games table does not exist yet or missing columns - returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async checkAndNotifyAdminsForFullGames(): Promise<void> {
    const fullGames = await this.getGamesWithFullParticipants();
    
    for (const game of fullGames) {
      // Check if notification already sent and timeout hasn't expired
      if (game.adminNotificationSent && game.adminNotificationTimeout) {
        const now = new Date();
        if (now < game.adminNotificationTimeout) {
          continue; // Still in timeout period
        }
      }

      // Create admin notification
      await this.createAdminNotification({
        type: 'match_ready',
        gameId: game.id,
        message: `Match on ${new Date(game.date).toLocaleDateString()} has reached 10 players and needs confirmation`,
        actionRequired: true,
        isRead: false
      });

      // Update game with notification sent and set timeout (5 minutes)
      const timeoutDate = new Date();
      timeoutDate.setMinutes(timeoutDate.getMinutes() + 5);
      
      await this.updateGame(game.id, {
        adminNotificationSent: true,
        adminNotificationTimeout: timeoutDate
      });
    }
  }

  // Admin notifications management
  static async createAdminNotification(notification: Omit<NewAdminNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const result = await db.insert(adminNotifications).values({
      ...notification,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: adminNotifications.id });
    
    return result[0].id;
  }

  static async getUnreadAdminNotifications(): Promise<AdminNotification[]> {
    try {
      return await db.select()
        .from(adminNotifications)
        .where(eq(adminNotifications.isRead, false))
        .orderBy(desc(adminNotifications.createdAt));
    } catch (error: any) {
      // If the table doesn't exist, return empty array
      if (error.message && error.message.includes('relation "admin_notifications" does not exist')) {
        console.log('Admin notifications table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  static async markAdminNotificationAsRead(notificationId: string): Promise<void> {
    await db.update(adminNotifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(adminNotifications.id, notificationId));
  }

  static async createVotingReminderNotification(month: number, year: number): Promise<void> {
    const usersNeedingReminders = await this.getUsersNeedingReminders(month, year);
    
    if (usersNeedingReminders.length > 0) {
      await this.createAdminNotification({
        type: 'voting_reminder',
        month,
        year,
        message: `${usersNeedingReminders.length} players haven't voted for ${new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
        actionRequired: true,
        isRead: false
      });
    }
  }

  // Calendar integration methods
  static async updateGameCalendarEvent(gameId: string, calendarEventId: string): Promise<void> {
    await this.updateGame(gameId, { calendarEventId });
  }

  static async confirmGame(gameId: string, customTime?: string, reservationInfo?: ReservationInfo): Promise<void> {
    console.log('🎯 confirmGame called with:', { gameId, customTime, reservationInfo });
    
    // Get the game and participants
    const game = await this.getGame(gameId);
    console.log('🎮 Found game:', game);
    
    if (!game) {
      console.error('❌ Game not found:', gameId);
      throw new Error('Game not found');
    }

    const participants: User[] = [];
    for (const participantId of game.participants) {
      const user = await this.getUserById(participantId);
      if (user) participants.push(user);
    }
    console.log(`👥 Found ${participants.length} participants:`, participants.map(p => p.name));

    // Create calendar event
    console.log('📅 Creating calendar event...');
    const calendarEventId = await calendarService.createEvent(
      game.date,
      participants,
      customTime,
      reservationInfo?.location
    );
    console.log('📅 Calendar event ID:', calendarEventId);

    const updateData: Partial<Game> = {
      status: 'confirmed' as const,
      updatedAt: new Date()
    };

    if (customTime) {
      updateData.customTime = customTime;
    }

    if (reservationInfo) {
      updateData.reservationInfo = reservationInfo;
    }

    if (calendarEventId) {
      updateData.calendarEventId = calendarEventId;
    }

    console.log('💾 Updating game with data:', updateData);
    await this.updateGame(gameId, updateData);
    console.log('✅ Game updated successfully');

    // Notify all participants about the confirmed match
    console.log('📧 Sending match confirmation notifications...');
    try {
      await notificationService.notifyMatchConfirmed(
        game.date,
        participants,
        customTime,
        reservationInfo,
        calendarEventId || undefined
      );
      console.log('✅ Notifications sent successfully');
    } catch (notificationError) {
      console.error('❌ Error sending notifications:', notificationError);
      // Don't fail the confirmation if notifications fail
    }
    
    console.log('🎉 Game confirmation completed successfully');
  }

  // Admin notification methods
  static async createAdminNotification(notificationData: Omit<NewAdminNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log(`📝 Creating admin notification: ${notificationData.message}`);
      
      const result = await db.insert(adminNotifications).values({
        ...notificationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning({ id: adminNotifications.id });
      
      const notificationId = result[0].id;
      console.log(`✅ Admin notification created with ID: ${notificationId}`);
      
      return notificationId;
    } catch (error: any) {
      console.error('❌ Error creating admin notification:', error);
      // If it's a table issue, handle gracefully but still log
      if (error.message && error.message.includes('does not exist')) {
        console.log('⚠️ Admin notifications table does not exist - notification not saved to DB');
        return 'mock-notification-id';
      }
      throw error;
    }
  }

  static async getUnreadAdminNotifications(): Promise<AdminNotification[]> {
    try {
      const notifications = await db.select()
        .from(adminNotifications)
        .where(eq(adminNotifications.isRead, false))
        .orderBy(desc(adminNotifications.createdAt));
        
      console.log(`📨 Found ${notifications.length} unread admin notifications`);
      return notifications;
    } catch (error: any) {
      // If the table doesn't exist, return empty array
      if (error.message && error.message.includes('relation "admin_notifications" does not exist')) {
        console.log('Admin notifications table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  static async markAdminNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await db.update(adminNotifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(adminNotifications.id, notificationId));
        
      console.log(`✅ Marked notification ${notificationId} as read`);
    } catch (error: any) {
      console.error('❌ Error marking notification as read:', error);
      if (error.message && error.message.includes('does not exist')) {
        console.log('⚠️ Admin notifications table does not exist - cannot mark as read');
      }
    }
  }

  static async checkAndNotifyAdminsForFullGames(): Promise<void> {
    try {
      console.log('🔔 checkAndNotifyAdminsForFullGames called');
      
      // Get all games that have 10+ participants but haven't sent admin notifications yet
      const fullGames = await this.getGamesWithFullParticipants();
      console.log(`📊 Found ${fullGames.length} games with full participants`);
      
      for (const game of fullGames) {
        console.log(`🎮 Processing game ${game.id} with ${game.participants.length} participants`);
        
        // Check if we should send notification (not sent yet or timeout has passed)
        // Handle missing columns gracefully
        const adminNotificationSent = game.adminNotificationSent || false;
        const shouldNotify = !adminNotificationSent || 
          (game.adminNotificationTimeout && new Date() > new Date(game.adminNotificationTimeout));
        
        console.log(`📋 Should notify: ${shouldNotify} (notification sent: ${adminNotificationSent})`);
        
        if (shouldNotify && game.participants.length >= 10) {
          console.log(`📧 Creating admin notification for game ${game.id}`);
          // Create admin notification in database
          await this.createAdminNotification({
            type: 'match_ready',
            gameId: game.id,
            message: `Match ready with ${game.participants.length} players on ${new Date(game.date).toLocaleDateString('es-ES')}`,
            actionRequired: true,
            isRead: false
          });

          // Send email to all admin users
          try {
            console.log('🔍 Starting email sending process...');
            const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true));
            console.log(`📊 Found ${adminUsers.length} admin users in database`);
            console.log(`👥 Admin users:`, adminUsers.map(u => ({ id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin })));
            
            const adminEmails = adminUsers.map(admin => admin.email);
            
            if (adminEmails.length > 0) {
              console.log(`📧 Attempting to send admin emails to: ${adminEmails.join(', ')}`);
              
              // Check if RESEND_API_KEY is available
              const hasApiKey = !!process.env.RESEND_API_KEY;
              console.log(`🔑 RESEND_API_KEY configured: ${hasApiKey}`);
              console.log(`📮 FROM_EMAIL configured: ${process.env.FROM_EMAIL || 'not set'}`);
              
              const emailSent = await emailService.sendAdminMatchReadyNotification(
                adminEmails,
                game.date,
                game.participants.length
              );

              if (emailSent) {
                console.log('✅ Admin emails sent successfully');
              } else {
                console.error('❌ Failed to send admin emails - check email service logs');
              }
            } else {
              console.log('⚠️ No admin users found to notify');
            }
          } catch (emailError) {
            console.error('❌ Error sending admin emails:', emailError);
            console.error('❌ Email error stack:', emailError instanceof Error ? emailError.stack : 'No stack trace');
          }

          // Update game to mark notification as sent and set timeout (24 hours)
          const timeout = new Date();
          timeout.setHours(timeout.getHours() + 24);
          
          await this.updateGame(game.id, {
            adminNotificationSent: true,
            adminNotificationTimeout: timeout
          });
        }
      }
    } catch (error) {
      console.error('Error checking and notifying admins for full games:', error);
    }
  }
}