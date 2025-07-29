export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Game {
  id: string;
  date: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  participants: string[]; // User IDs
  teams?: {
    team1: string[];
    team2: string[];
  };
  result?: {
    team1Score: number;
    team2Score: number;
    notes?: string;
  };
  reservationInfo?: {
    location: string;
    time: string;
    cost?: number;
    reservedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  id: string;
  userId: string;
  gameId: string;
  status: 'available' | 'unavailable';
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyAvailability {
  userId: string;
  month: number;
  year: number;
  availableSundays: number[]; // Day numbers of the month
  cannotPlayAnyDay: boolean; // "No puedo ningún día" option
  hasVoted: boolean; // Track if user has submitted their availability
  updatedAt: Date;
}

export interface ReminderStatus {
  userId: string;
  month: number;
  year: number;
  lastReminderSent: Date;
  reminderCount: number;
  isActive: boolean; // Stop sending when user votes or opts out
}