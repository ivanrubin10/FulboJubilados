import { DatabaseService } from './db/service';
import type { User, Game, MonthlyAvailability } from '@/types';

export class HybridStore {
  // User management
  static async getUsers(): Promise<User[]> {
    return await DatabaseService.getUsers();
  }

  static async getUserById(id: string): Promise<User | undefined> {
    return await DatabaseService.getUserById(id);
  }

  static async addUser(user: User): Promise<void> {
    await DatabaseService.addUser(user);
  }

  static async updateUser(user: User): Promise<void> {
    await DatabaseService.updateUser(user);
  }

  static async saveUsers(users: User[]): Promise<void> {
    await DatabaseService.saveUsers(users);
  }

  static async toggleUserWhitelist(userId: string): Promise<void> {
    await DatabaseService.toggleUserWhitelist(userId);
  }

  static async getWhitelistedUsers(): Promise<User[]> {
    return await DatabaseService.getWhitelistedUsers();
  }

  static async getWhitelistedUserCount(): Promise<number> {
    return await DatabaseService.getWhitelistedUserCount();
  }

  // Monthly availability
  static async updateMonthlyAvailability(
    userId: string,
    month: number,
    year: number,
    availableSundays: number[],
    cannotPlayAnyDay: boolean = false
  ): Promise<void> {
    await DatabaseService.updateMonthlyAvailability(userId, month, year, availableSundays, cannotPlayAnyDay);
  }

  static async getUserMonthlyAvailability(userId: string, month: number, year: number): Promise<number[]> {
    return await DatabaseService.getUserMonthlyAvailability(userId, month, year);
  }

  static async getUserVotingStatus(userId: string, month: number, year: number): Promise<{ hasVoted: boolean; cannotPlayAnyDay: boolean }> {
    return await DatabaseService.getUserVotingStatus(userId, month, year);
  }

  // Reminder management
  static async updateReminderStatus(userId: string, month: number, year: number): Promise<void> {
    await DatabaseService.updateReminderStatus(userId, month, year);
  }

  static async deactivateReminders(userId: string, month: number, year: number): Promise<void> {
    await DatabaseService.deactivateReminders(userId, month, year);
  }

  static async getUsersNeedingReminders(month: number, year: number): Promise<User[]> {
    return await DatabaseService.getUsersNeedingReminders(month, year);
  }

  // Settings
  static async getCurrentActiveMonth(): Promise<{ month: number; year: number }> {
    return await DatabaseService.getCurrentActiveMonth();
  }

  static async setCurrentActiveMonth(month: number, year: number): Promise<void> {
    await DatabaseService.setCurrentActiveMonth(month, year);
  }

  // Games management
  static async getGames(): Promise<Game[]> {
    // TODO: Implement games in DatabaseService
    return [];
  }

  static async saveGames(games: Game[]): Promise<void> {
    // TODO: Implement games in DatabaseService
    return;
  }

  // Monthly availability data access
  static async getMonthlyAvailability(): Promise<MonthlyAvailability[]> {
    // TODO: Implement in DatabaseService
    return [];
  }

  // Get blocked Sundays (days with confirmed games)
  static async getBlockedSundays(month: number, year: number): Promise<number[]> {
    // TODO: Implement in DatabaseService using games data
    return [];
  }

  // Settings management (for backward compatibility)
  static async getSettings(): Promise<{ currentMonth?: number; currentYear?: number }> {
    const activeMonth = await DatabaseService.getCurrentActiveMonth();
    return { currentMonth: activeMonth.month, currentYear: activeMonth.year };
  }
}