import { db } from './connection';
import { users, monthlyAvailability, reminderStatus, settings } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import type { User } from '@/types';

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
      ...user,
      createdAt: user.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  static async updateUser(updatedUser: User): Promise<void> {
    await db.update(users)
      .set({ 
        ...updatedUser, 
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
}