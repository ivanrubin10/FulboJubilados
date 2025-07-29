import { User, Game, MonthlyAvailability } from '@/types';

const STORAGE_KEYS = {
  USERS: 'futbol-users',
  GAMES: 'futbol-games',
  AVAILABILITY: 'futbol-availability',
  MONTHLY_AVAILABILITY: 'futbol-monthly-availability',
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

  static updateMonthlyAvailability(userId: string, month: number, year: number, availableSundays: number[]): void {
    const availability = this.getMonthlyAvailability();
    const existingIndex = availability.findIndex(
      a => a.userId === userId && a.month === month && a.year === year
    );

    const newAvailability: MonthlyAvailability = {
      userId,
      month,
      year,
      availableSundays,
      updatedAt: new Date(),
    };

    if (existingIndex !== -1) {
      availability[existingIndex] = newAvailability;
    } else {
      availability.push(newAvailability);
    }

    this.saveMonthlyAvailability(availability);
  }

  static getUserMonthlyAvailability(userId: string, month: number, year: number): number[] {
    const availability = this.getMonthlyAvailability();
    const userAvailability = availability.find(
      a => a.userId === userId && a.month === month && a.year === year
    );
    return userAvailability?.availableSundays || [];
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