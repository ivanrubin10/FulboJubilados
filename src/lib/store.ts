import { User, Game, MonthlyAvailability, ReminderStatus } from '@/types';

const STORAGE_KEYS = {
  USERS: 'futbol-users',
  GAMES: 'futbol-games',
  AVAILABILITY: 'futbol-availability',
  MONTHLY_AVAILABILITY: 'futbol-monthly-availability',
  REMINDER_STATUS: 'futbol-reminder-status',
  SETTINGS: 'futbol-settings',
} as const;

export class LocalStorage {
  static getUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static getGames(): Game[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.GAMES);
    return data ? JSON.parse(data) : [];
  }

  static saveGames(games: Game[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
  }

  static getMonthlyAvailability(): MonthlyAvailability[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.MONTHLY_AVAILABILITY);
    return data ? JSON.parse(data) : [];
  }

  static saveMonthlyAvailability(availability: MonthlyAvailability[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.MONTHLY_AVAILABILITY, JSON.stringify(availability));
  }

  static getUserById(id: string): User | undefined {
    return this.getUsers().find(user => user.id === id);
  }

  static updateUser(updatedUser: User): void {
    const users = this.getUsers();
    const index = users.findIndex(user => user.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      this.saveUsers(users);
    }
  }

  static addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  }

  static updateMonthlyAvailability(
    userId: string, 
    month: number, 
    year: number, 
    availableSundays: number[], 
    cannotPlayAnyDay: boolean = false
  ): void {
    // Check for confirmed games that would prevent availability
    const filteredSundays = cannotPlayAnyDay ? [] : this.filterAvailableSundays(availableSundays, month, year);
    
    const availability = this.getMonthlyAvailability();
    const existingIndex = availability.findIndex(
      a => a.userId === userId && a.month === month && a.year === year
    );

    const newAvailability: MonthlyAvailability = {
      userId,
      month,
      year,
      availableSundays: filteredSundays,
      cannotPlayAnyDay,
      hasVoted: true,
      updatedAt: new Date(),
    };

    if (existingIndex !== -1) {
      availability[existingIndex] = newAvailability;
    } else {
      availability.push(newAvailability);
    }

    this.saveMonthlyAvailability(availability);
    
    // Stop reminders for this user/month when they vote
    this.deactivateReminders(userId, month, year);
  }

  // Helper function to filter out Sundays that already have confirmed games
  static filterAvailableSundays(requestedSundays: number[], month: number, year: number): number[] {
    const games = this.getGames();
    const blockedSundays = new Set<number>();
    
    // Find confirmed games with 10 players for the given month/year
    games.forEach(game => {
      const gameDate = new Date(game.date);
      if (gameDate.getFullYear() === year && 
          gameDate.getMonth() + 1 === month &&
          game.status === 'confirmed' &&
          game.participants.length >= 10) {
        blockedSundays.add(gameDate.getDate());
      }
    });
    
    // Filter out blocked Sundays and warn user if any were blocked
    const filteredSundays = requestedSundays.filter(sunday => !blockedSundays.has(sunday));
    const blockedDays = requestedSundays.filter(sunday => blockedSundays.has(sunday));
    
    if (blockedDays.length > 0 && typeof window !== 'undefined') {
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
      alert(
        `⚠️ Algunos domingos ya tienen partidos confirmados con 10 jugadores:\n\n` +
        `🚫 ${monthName}: ${blockedDays.join(', ')}\n\n` +
        `Estos días han sido removidos de tu disponibilidad automáticamente.`
      );
    }
    
    return filteredSundays;
  }

  // Get list of blocked Sundays for a specific month/year
  static getBlockedSundays(month: number, year: number): number[] {
    const games = this.getGames();
    const blockedSundays: number[] = [];
    
    games.forEach(game => {
      const gameDate = new Date(game.date);
      if (gameDate.getFullYear() === year && 
          gameDate.getMonth() + 1 === month &&
          game.status === 'confirmed' &&
          game.participants.length >= 10) {
        blockedSundays.push(gameDate.getDate());
      }
    });
    
    return blockedSundays.sort((a, b) => a - b);
  }

  static getUserMonthlyAvailability(userId: string, month: number, year: number): number[] {
    const availability = this.getMonthlyAvailability();
    const userAvailability = availability.find(
      a => a.userId === userId && a.month === month && a.year === year
    );
    return userAvailability?.availableSundays || [];
  }

  static getUserVotingStatus(userId: string, month: number, year: number): { hasVoted: boolean; cannotPlayAnyDay: boolean } {
    const availability = this.getMonthlyAvailability();
    const userAvailability = availability.find(
      a => a.userId === userId && a.month === month && a.year === year
    );
    return {
      hasVoted: userAvailability?.hasVoted || false,
      cannotPlayAnyDay: userAvailability?.cannotPlayAnyDay || false
    };
  }

  // Reminder Status Management
  static getReminderStatuses(): ReminderStatus[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.REMINDER_STATUS);
    return data ? JSON.parse(data) : [];
  }

  static saveReminderStatuses(statuses: ReminderStatus[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.REMINDER_STATUS, JSON.stringify(statuses));
  }

  static updateReminderStatus(userId: string, month: number, year: number): void {
    const statuses = this.getReminderStatuses();
    const existingIndex = statuses.findIndex(
      s => s.userId === userId && s.month === month && s.year === year
    );

    const newStatus: ReminderStatus = {
      userId,
      month,
      year,
      lastReminderSent: new Date(),
      reminderCount: existingIndex !== -1 ? statuses[existingIndex].reminderCount + 1 : 1,
      isActive: true,
    };

    if (existingIndex !== -1) {
      statuses[existingIndex] = newStatus;
    } else {
      statuses.push(newStatus);
    }

    this.saveReminderStatuses(statuses);
  }

  static deactivateReminders(userId: string, month: number, year: number): void {
    const statuses = this.getReminderStatuses();
    const existingIndex = statuses.findIndex(
      s => s.userId === userId && s.month === month && s.year === year
    );

    if (existingIndex !== -1) {
      statuses[existingIndex].isActive = false;
      this.saveReminderStatuses(statuses);
    }
  }

  static getUsersNeedingReminders(month: number, year: number): User[] {
    const users = this.getUsers().filter(u => !u.isAdmin && u.isWhitelisted); // Only whitelisted, non-admin users
    const availability = this.getMonthlyAvailability();
    const reminderStatuses = this.getReminderStatuses();

    return users.filter(user => {
      // Check if user has voted for this month
      const userAvailability = availability.find(
        a => a.userId === user.id && a.month === month && a.year === year
      );
      
      if (userAvailability?.hasVoted) {
        return false; // User has already voted
      }

      // Check if reminders are still active
      const reminderStatus = reminderStatuses.find(
        s => s.userId === user.id && s.month === month && s.year === year
      );

      return reminderStatus?.isActive !== false; // Send if no status or still active
    });
  }

  static toggleUserWhitelist(userId: string): void {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      users[userIndex].isWhitelisted = !users[userIndex].isWhitelisted;
      this.saveUsers(users);
    }
  }

  static getWhitelistedUsers(): User[] {
    return this.getUsers().filter(u => u.isWhitelisted && !u.isAdmin);
  }

  static getWhitelistedUserCount(): number {
    return this.getWhitelistedUsers().length;
  }

  static getSettings(): { currentMonth?: number; currentYear?: number } {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  static saveSettings(settings: { currentMonth?: number; currentYear?: number }): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getCurrentActiveMonth(): { month: number; year: number } {
    const settings = this.getSettings();
    const now = new Date();
    return {
      month: settings.currentMonth || now.getMonth() + 1,
      year: settings.currentYear || now.getFullYear(),
    };
  }

  static setCurrentActiveMonth(month: number, year: number): void {
    const settings = this.getSettings();
    this.saveSettings({ ...settings, currentMonth: month, currentYear: year });
  }
}