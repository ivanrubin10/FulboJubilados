import { LocalStorage } from './store';
import { DatabaseService } from './db/service';
import type { User } from '@/types';

// Check if we're running on the server and have database access
const USE_DATABASE = typeof window === 'undefined' && process.env.DATABASE_URL;

export class HybridStore {
  // User management
  static async getUsers(): Promise<User[]> {
    if (USE_DATABASE) {
      return await DatabaseService.getUsers();
    }
    return LocalStorage.getUsers();
  }

  static async getUserById(id: string): Promise<User | undefined> {
    if (USE_DATABASE) {
      return await DatabaseService.getUserById(id);
    }
    return LocalStorage.getUserById(id);
  }

  static async addUser(user: User): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.addUser(user);
    } else {
      LocalStorage.addUser(user);
    }
  }

  static async updateUser(user: User): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.updateUser(user);
    } else {
      LocalStorage.updateUser(user);
    }
  }

  static async saveUsers(users: User[]): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.saveUsers(users);
    } else {
      LocalStorage.saveUsers(users);
    }
  }

  static async toggleUserWhitelist(userId: string): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.toggleUserWhitelist(userId);
    } else {
      LocalStorage.toggleUserWhitelist(userId);
    }
  }

  static async getWhitelistedUsers(): Promise<User[]> {
    if (USE_DATABASE) {
      return await DatabaseService.getWhitelistedUsers();
    }
    return LocalStorage.getWhitelistedUsers();
  }

  static async getWhitelistedUserCount(): Promise<number> {
    if (USE_DATABASE) {
      return await DatabaseService.getWhitelistedUserCount();
    }
    return LocalStorage.getWhitelistedUserCount();
  }

  // Monthly availability
  static async updateMonthlyAvailability(
    userId: string,
    month: number,
    year: number,
    availableSundays: number[],
    cannotPlayAnyDay: boolean = false
  ): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.updateMonthlyAvailability(userId, month, year, availableSundays, cannotPlayAnyDay);
    } else {
      LocalStorage.updateMonthlyAvailability(userId, month, year, availableSundays, cannotPlayAnyDay);
    }
  }

  static async getUserMonthlyAvailability(userId: string, month: number, year: number): Promise<number[]> {
    if (USE_DATABASE) {
      return await DatabaseService.getUserMonthlyAvailability(userId, month, year);
    }
    return LocalStorage.getUserMonthlyAvailability(userId, month, year);
  }

  static async getUserVotingStatus(userId: string, month: number, year: number): Promise<{ hasVoted: boolean; cannotPlayAnyDay: boolean }> {
    if (USE_DATABASE) {
      return await DatabaseService.getUserVotingStatus(userId, month, year);
    }
    return LocalStorage.getUserVotingStatus(userId, month, year);
  }

  // Reminder management
  static async updateReminderStatus(userId: string, month: number, year: number): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.updateReminderStatus(userId, month, year);
    } else {
      LocalStorage.updateReminderStatus(userId, month, year);
    }
  }

  static async deactivateReminders(userId: string, month: number, year: number): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.deactivateReminders(userId, month, year);
    } else {
      LocalStorage.deactivateReminders(userId, month, year);
    }
  }

  static async getUsersNeedingReminders(month: number, year: number): Promise<User[]> {
    if (USE_DATABASE) {
      return await DatabaseService.getUsersNeedingReminders(month, year);
    }
    return LocalStorage.getUsersNeedingReminders(month, year);
  }

  // Settings
  static async getCurrentActiveMonth(): Promise<{ month: number; year: number }> {
    if (USE_DATABASE) {
      return await DatabaseService.getCurrentActiveMonth();
    }
    return LocalStorage.getCurrentActiveMonth();
  }

  static async setCurrentActiveMonth(month: number, year: number): Promise<void> {
    if (USE_DATABASE) {
      await DatabaseService.setCurrentActiveMonth(month, year);
    } else {
      LocalStorage.setCurrentActiveMonth(month, year);
    }
  }

  // Migration helper - sync LocalStorage to Database
  static async migrateToDatabase(): Promise<void> {
    if (!USE_DATABASE) {
      throw new Error('Database not available for migration');
    }

    console.log('Starting migration from LocalStorage to Database...');

    // Migrate users
    const localUsers = LocalStorage.getUsers();
    await DatabaseService.saveUsers(localUsers);
    console.log(`Migrated ${localUsers.length} users`);

    // Migrate settings
    const localSettings = LocalStorage.getSettings();
    if (localSettings.currentMonth && localSettings.currentYear) {
      await DatabaseService.setCurrentActiveMonth(localSettings.currentMonth, localSettings.currentYear);
    }

    console.log('Migration completed successfully!');
  }
}