export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
  isAdmin: boolean;
  isWhitelisted: boolean; // For counting towards matches (excludes test users)
  createdAt: Date;
  updatedAt?: Date;
}

export interface Game {
  id: string;
  date: Date;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  participants: string[]; // User IDs
  waitlist: string[]; // User IDs in waitlist order
  teams?: {
    team1: string[];
    team2: string[];
  };
  originalTeams?: {
    team1: string[];
    team2: string[];
  };
  result?: {
    team1Score: number;
    team2Score: number;
    notes?: string;
    mvp?: string | string[]; // User ID(s) of the MVP(s) - array for ties
  };
  reservationInfo?: {
    location: string;
    time: string;
    cost?: number;
    reservedBy: string;
    mapsLink?: string;
    paymentAlias?: string;
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
  votedAt?: Date; // When the user voted (from API response)
}

export interface ReminderStatus {
  userId: string;
  month: number;
  year: number;
  lastReminderSent: Date;
  reminderCount: number;
  isActive: boolean; // Stop sending when user votes or opts out
}

export interface MvpVote {
  id: string;
  gameId: string;
  votedForId: string;
  createdAt: Date;
}

export interface MvpVoteResult {
  playerId: string;
  playerName: string;
  playerNickname?: string;
  playerImageUrl?: string;
  voteCount: number;
  votePercentage: number;
}

export interface NonVoterInfo {
  id: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
  displayName: string;
}

export interface NonVotersData {
  votersCount: number;
  nonVotersCount: number;
  nonVoters: NonVoterInfo[];
}

export interface MvpResults {
  gameId: string;
  totalParticipants: number;
  totalVotes: number;
  mvp: MvpVoteResult | null;
  finalizedMvp: string | string[] | null;
  voteResults: MvpVoteResult[];
  nonVoters?: NonVotersData; // Only available for admins when MVP not finalized
}