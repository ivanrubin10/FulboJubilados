import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { User } from '@/types'
import { LocalStorage } from './store'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSundaysInMonth(year: number, month: number): number[] {
  const sundays: number[] = [];
  const date = new Date(year, month - 1, 1);
  
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 0) {
      sundays.push(date.getDate());
    }
    date.setDate(date.getDate() + 1);
  }
  
  return sundays;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getNextSunday(): Date {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return nextSunday;
}

export function getNextAvailableMonth(): { month: number; year: number } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // getMonth() is 0-indexed
  
  const sundaysInCurrentMonth = getSundaysInMonth(currentYear, currentMonth);
  const todayDate = today.getDate();
  
  // Check if there are any Sundays left in the current month
  const futureSundays = sundaysInCurrentMonth.filter(sunday => sunday > todayDate);
  
  if (futureSundays.length > 0) {
    return { month: currentMonth, year: currentYear };
  } else {
    // Move to next month
    if (currentMonth === 12) {
      return { month: 1, year: currentYear + 1 };
    } else {
      return { month: currentMonth + 1, year: currentYear };
    }
  }
}

export function generateTeams(players: string[]): { team1: string[]; team2: string[] } {
  if (players.length !== 10) {
    throw new Error('Exactly 10 players are required to form teams');
  }
  
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return {
    team1: shuffled.slice(0, 5),
    team2: shuffled.slice(5, 10),
  };
}

// Mock users utility for testing
export function createMockUsers(): void {
  if (typeof window === 'undefined') return;
  
  const mockUsers: User[] = [
    {
      id: 'mock-user-1',
      email: 'carlos@example.com',
      name: 'Carlos Rodríguez',
      nickname: 'Carlitos',
      imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-2',
      email: 'diego@example.com',
      name: 'Diego Martínez',
      nickname: 'Dieguito',
      imageUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-3',
      email: 'fernando@example.com',
      name: 'Fernando López',
      nickname: 'Fer',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-4',
      email: 'gabriel@example.com',
      name: 'Gabriel Sánchez',
      nickname: 'Gabi',
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-5',
      email: 'hector@example.com',
      name: 'Héctor Vargas',
      nickname: 'Tito',
      imageUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-6',
      email: 'ignacio@example.com',
      name: 'Ignacio Torres',
      nickname: 'Nacho',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-7',
      email: 'javier@example.com',
      name: 'Javier Morales',
      nickname: 'Javi',
      imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-8',
      email: 'kevin@example.com',
      name: 'Kevin Jiménez',
      nickname: 'Kev',
      imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-9',
      email: 'leonardo@example.com',
      name: 'Leonardo Ruiz',
      nickname: 'Leo',
      imageUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-10',
      email: 'mario@example.com',
      name: 'Mario Castillo',
      nickname: 'Mariito',
      imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-11',
      email: 'nicolas@example.com',
      name: 'Nicolás Herrera',
      nickname: 'Nico',
      imageUrl: 'https://images.unsplash.com/photo-1503919436773-c7bbab8b3d91?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-12',
      email: 'oscar@example.com',
      name: 'Óscar Delgado',
      nickname: 'Oscarito',
      imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-13',
      email: 'pablo@example.com',
      name: 'Pablo Mendoza',
      nickname: 'Pablito',
      imageUrl: 'https://images.unsplash.com/photo-1503919436773-c7bbab8b3d91?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    },
    {
      id: 'mock-user-14',
      email: 'ricardo@example.com',
      name: 'Ricardo Guerrero',
      nickname: 'Ricky',
      imageUrl: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150',
      isAdmin: false,
      isWhitelisted: true,
      createdAt: new Date(),
    }
  ];

  // Get existing users to avoid duplicates
  const existingUsers = LocalStorage.getUsers();
  const newUsers = mockUsers.filter(mockUser => 
    !existingUsers.some(existing => existing.id === mockUser.id)
  );

  // Add new mock users
  newUsers.forEach(user => LocalStorage.addUser(user));

  // Create availability for current and next month for all mock users
  const { month, year } = getNextAvailableMonth();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Get all Sundays for current, next month, and August
  const currentSundays = getSundaysInMonth(currentYear, currentMonth);
  const nextSundays = getSundaysInMonth(year, month);
  const augustSundays = getSundaysInMonth(currentYear, 8); // August is month 8

  // Apply availability to ALL mock users (including existing ones) to ensure August is covered
  const allMockUsers = LocalStorage.getUsers().filter(u => u.id.startsWith('mock-user-'));
  
  allMockUsers.forEach(user => {
    // GUARANTEE: All Sundays in August available for ALL mock users
    LocalStorage.updateMonthlyAvailability(
      user.id,
      8, // August
      currentYear,
      augustSundays, // ALL Sundays in August
      false
    );

    // Current month availability (random 2-4 Sundays)
    if (currentMonth !== 8) { // Don't override August with random data
      const availableDays = currentSundays
        .filter(() => Math.random() > 0.3) // 70% chance to be available each Sunday
        .slice(0, Math.floor(Math.random() * 3) + 2); // Take 2-4 Sundays

      if (availableDays.length > 0) {
        LocalStorage.updateMonthlyAvailability(
          user.id,
          currentMonth,
          currentYear,
          availableDays,
          false
        );
      }
    }

    // Next month availability (random 2-4 Sundays)
    if (month !== 8) { // Don't override August with random data
      const nextAvailableDays = nextSundays
        .filter(() => Math.random() > 0.2) // 80% chance to be available each Sunday
        .slice(0, Math.floor(Math.random() * 3) + 2); // Take 2-4 Sundays

      if (nextAvailableDays.length > 0) {
        LocalStorage.updateMonthlyAvailability(
          user.id,
          month,
          year,
          nextAvailableDays,
          false
        );
      }
    }
  });

  console.log(`✅ Added ${newUsers.length} new mock users`);
  console.log(`✅ Set ALL Sundays in August availability for ${allMockUsers.length} mock users`);
  console.log(`📅 August ${currentYear} Sundays: ${augustSundays.join(', ')}`);
  console.log('New mock users created:', newUsers.map(u => u.name));
}