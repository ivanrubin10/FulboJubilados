import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  
  // Capitalize the first letter (weekday) and the month
  return formatted.replace(/^(\w)/, (match) => match.toUpperCase())
                  .replace(/ de (\w)/, (match, monthFirst) => ` de ${monthFirst.toUpperCase()}`);
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

// Utility functions for proper Spanish month capitalization
export function getCapitalizedMonthName(year: number, month: number): string {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

export function getCapitalizedMonthYear(year: number, month: number): string {
  const monthYear = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
}

export function getCapitalizedDateWithMonth(date: Date): string {
  const formatted = date.toLocaleDateString('es-ES', { month: 'long' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

