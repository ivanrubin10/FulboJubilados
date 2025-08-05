'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSundaysInMonth, formatDate, getCapitalizedMonthName, getCapitalizedMonthYear } from '@/lib/utils';
import { User } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/theme-context';
import { Calendar, ChevronLeft, ChevronRight, Clock, User as UserIcon, AlertCircle, Lock, CheckCircle, Ban, CalendarCheck } from 'lucide-react';

// API helper functions
const apiClient = {
  async getCurrentActiveMonth() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },
  
  async getUserById(id: string) {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    const user = await res.json();
    return user === null ? undefined : user;
  },
  
  async addUser(user: User) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Failed to add user');
    return res.json();
  },
  
  async getUserMonthlyAvailability(userId: string, month: number, year: number) {
    const res = await fetch(`/api/availability?type=user&userId=${userId}&month=${month}&year=${year}`);
    if (!res.ok) throw new Error('Failed to fetch user availability');
    return res.json();
  },
  
  async getUserVotingStatus(userId: string, month: number, year: number) {
    const res = await fetch(`/api/availability?type=voting&userId=${userId}&month=${month}&year=${year}`);
    if (!res.ok) throw new Error('Failed to fetch voting status');
    return res.json();
  },
  
  async getBlockedSundays(month: number, year: number) {
    const res = await fetch(`/api/availability?type=blocked&month=${month}&year=${year}`);
    if (!res.ok) throw new Error('Failed to fetch blocked sundays');
    return res.json();
  },
  
  async updateMonthlyAvailability(userId: string, month: number, year: number, availableSundays: number[], cannotPlayAnyDay: boolean) {
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, month, year, availableSundays, cannotPlayAnyDay })
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  }
};

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { warning } = useToast();
  const { theme } = useTheme();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());
  const [availableSundays, setAvailableSundays] = useState<number[]>([]);
  const [sundaysInMonth, setSundaysInMonth] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cannotPlayAnyDay, setCannotPlayAnyDay] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [blockedSundays, setBlockedSundays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        // Get active month from database
        const activeMonthData = await apiClient.getCurrentActiveMonth();
        setActiveMonth(activeMonthData.month);
        setActiveYear(activeMonthData.year);
        setSelectedMonth(activeMonthData.month);
        setSelectedYear(activeMonthData.year);

        // Check if user exists, create if not
        const existingUser = await apiClient.getUserById(user.id);
        let currentUserData = existingUser;
        
        if (!existingUser) {
          const userEmail = user.emailAddresses[0]?.emailAddress || '';
          const newUser: User = {
            id: user.id,
            email: userEmail,
            name: user.fullName || user.firstName || 'Usuario',
            imageUrl: user.imageUrl,
            isAdmin: userEmail === 'ivanrubin10@gmail.com',
            isWhitelisted: true, // Auto-whitelist new users (admins can remove later)
            createdAt: new Date(),
          };
          await apiClient.addUser(newUser);
          setCurrentUser(newUser);
          currentUserData = newUser;
        } else {
          setCurrentUser(existingUser);
          currentUserData = existingUser;
        }

        // Check if current user (new or existing) needs nickname setup
        if (!currentUserData?.nickname) {
          router.push('/setup-nickname');
          return;
        }

        // Load user's availability for the active month
        await loadUserAvailability(user.id, activeMonthData.month, activeMonthData.year);
        
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [isLoaded, user, router]);

  // Load user availability when month changes
  useEffect(() => {
    const loadData = async () => {
      if (!user || !currentUser) return;
      
      await loadUserAvailability(user.id, selectedMonth, selectedYear);
    };
    
    loadData();
  }, [user, currentUser, selectedMonth, selectedYear]);

  // Update Sundays when month changes
  useEffect(() => {
    setSundaysInMonth(getSundaysInMonth(selectedYear, selectedMonth));
  }, [selectedMonth, selectedYear]);

  // Helper function to check if a month is beyond the 3-month voting limit
  const isMonthBeyondVotingLimit = (month: number, year: number) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // Calculate 3 months from current date
    let maxMonth = currentMonth + 3;
    let maxYear = currentYear;
    
    if (maxMonth > 12) {
      maxMonth = maxMonth - 12;
      maxYear = maxYear + 1;
    }
    
    return year > maxYear || (year === maxYear && month > maxMonth);
  };

  const loadUserAvailability = async (userId: string, month: number, year: number) => {
    try {
      const [userAvailability, votingStatus, blocked] = await Promise.all([
        apiClient.getUserMonthlyAvailability(userId, month, year),
        apiClient.getUserVotingStatus(userId, month, year),
        apiClient.getBlockedSundays(month, year)
      ]);
      
      setAvailableSundays(userAvailability);
      setCannotPlayAnyDay(votingStatus.cannotPlayAnyDay);
      setHasVoted(votingStatus.hasVoted);
      setBlockedSundays(blocked);
    } catch (error) {
      console.error('Error loading user availability:', error);
    }
  };

  const toggleSundayAvailability = async (sunday: number) => {
    if (!user || cannotPlayAnyDay) return;

    // Check if this is a past month (before active month)
    const isPastMonth = selectedYear < activeYear || (selectedYear === activeYear && selectedMonth < activeMonth);
    if (isPastMonth) {
      warning(
        'Mes cerrado',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${selectedYear}: No puedes votar en meses anteriores al mes activo. El mes activo actual es ${getCapitalizedMonthYear(activeYear, activeMonth)}.`
      );
      return;
    }

    // Check if this specific date has passed
    const sundayDate = new Date(selectedYear, selectedMonth - 1, sunday);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (sundayDate < today) {
      warning(
        'Fecha pasada',
        `${sunday} de ${getCapitalizedMonthName(selectedYear, selectedMonth)} ya ha pasado. No puedes votar por fechas que ya han ocurrido.`
      );
      return;
    }

    // Check if this month is beyond the 3-month voting limit
    if (isMonthBeyondVotingLimit(selectedMonth, selectedYear)) {
      warning(
        'Fuera del período de votación',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${selectedYear}: Solo puedes votar hasta 3 meses en el futuro. Este límite mantiene la flexibilidad del sistema.`
      );
      return;
    }

    // Check if this day is blocked (has confirmed game with 10 players)
    const isBlocked = blockedSundays.includes(sunday);
    
    // If trying to add a blocked day, show warning and prevent selection
    if (!availableSundays.includes(sunday) && isBlocked) {
      warning(
        'Día completo',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${sunday}: Ya hay un partido confirmado con 10 jugadores. Este día está completo y no acepta más jugadores.`
      );
      return;
    }

    // If trying to remove a blocked day, show warning and prevent unvoting
    if (availableSundays.includes(sunday) && isBlocked) {
      warning(
        'No se puede desvotar',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${sunday}: Ya hay un partido confirmado. No puedes cambiar tu voto una vez que el partido ha sido confirmado.`
      );
      return;
    }

    const newAvailability = availableSundays.includes(sunday)
      ? availableSundays.filter(s => s !== sunday)
      : [...availableSundays, sunday];

    // Update UI immediately for better UX
    setAvailableSundays(newAvailability);
    // Set hasVoted to false if user has no days selected and can't play any day is false
    setHasVoted(newAvailability.length > 0 || cannotPlayAnyDay);
    setCannotPlayAnyDay(false);
    
    try {
      await apiClient.updateMonthlyAvailability(
        user.id,
        selectedMonth,
        selectedYear,
        newAvailability,
        false
      );
      
      // Refresh blocked Sundays after voting (voting might create new games)
      const updatedBlocked = await apiClient.getBlockedSundays(selectedMonth, selectedYear);
      setBlockedSundays(updatedBlocked);
    } catch (error) {
      console.error('Error updating availability:', error);
      // Revert UI changes on error
      setAvailableSundays(availableSundays);
    }
  };

  const toggleCannotPlayAnyDay = async () => {
    if (!user) return;

    // Check if this is a past month (before active month)
    const isPastMonth = selectedYear < activeYear || (selectedYear === activeYear && selectedMonth < activeMonth);
    if (isPastMonth) {
      warning(
        'Mes cerrado',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${selectedYear}: No puedes votar en meses anteriores al mes activo. El mes activo actual es ${getCapitalizedMonthYear(activeYear, activeMonth)}.`
      );
      return;
    }

    // Check if this entire month has passed
    const currentDate = new Date();
    const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0);
    currentDate.setHours(0, 0, 0, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    
    if (lastDayOfMonth < currentDate) {
      warning(
        'Mes pasado',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${selectedYear} ya ha terminado. No puedes votar por meses que ya han pasado completamente.`
      );
      return;
    }

    // Check if this month is beyond the 3-month voting limit
    if (isMonthBeyondVotingLimit(selectedMonth, selectedYear)) {
      warning(
        'Fuera del período de votación',
        `${getCapitalizedMonthName(selectedYear, selectedMonth)} ${selectedYear}: Solo puedes votar hasta 3 meses en el futuro. Este límite mantiene la flexibilidad del sistema.`
      );
      return;
    }

    const newCannotPlayAnyDay = !cannotPlayAnyDay;
    
    // Update UI immediately
    setCannotPlayAnyDay(newCannotPlayAnyDay);
    
    if (newCannotPlayAnyDay) {
      setAvailableSundays([]);
      setHasVoted(true); // Marking as "cannot play" is a vote
    } else {
      // If turning off "cannot play" and user has no selected days, they haven't voted
      setHasVoted(availableSundays.length > 0);
    }
    
    try {
      await apiClient.updateMonthlyAvailability(
        user.id,
        selectedMonth,
        selectedYear,
        newCannotPlayAnyDay ? [] : availableSundays,
        newCannotPlayAnyDay
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      // Revert UI changes on error
      setCannotPlayAnyDay(!newCannotPlayAnyDay);
    }
  };


  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">No se pudo cargar el usuario</p>
      </div>
    );
  }

  const nextMonth = () => {
    // Calculate the next month
    let nextSelectedMonth, nextSelectedYear;
    if (selectedMonth === 12) {
      nextSelectedMonth = 1;
      nextSelectedYear = selectedYear + 1;
    } else {
      nextSelectedMonth = selectedMonth + 1;
      nextSelectedYear = selectedYear;
    }

    // Check if the next month would be beyond the 3-month limit
    if (isMonthBeyondVotingLimit(nextSelectedMonth, nextSelectedYear)) {
      warning(
        'Límite alcanzado',
        'Solo puedes votar hasta 3 meses en el futuro. Este límite evita la planificación excesiva y mantiene la flexibilidad del sistema.'
      );
      return;
    }

    setSelectedMonth(nextSelectedMonth);
    setSelectedYear(nextSelectedYear);
  };

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <UserIcon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Hola, {currentUser.nickname || currentUser.name}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-11">
            Marca los domingos que puedes jugar
          </p>
        </div>


        {/* Non-whitelisted User Warning */}
        {!currentUser.isWhitelisted && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' 
              ? 'bg-red-950/40 border border-red-600/30' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className={`h-5 w-5 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} />
              <p className={`font-semibold text-sm ${
                theme === 'dark' ? 'text-red-300' : 'text-red-800'
              }`}>
                Usuario no habilitado
              </p>
            </div>
            <p className={`text-sm ml-8 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-700'
            }`}>
              Tu voto no está siendo contado para la creación de partidos. Necesitas ser habilitado por un administrador primero. 
              Los votos de usuarios no habilitados no contribuyen al sistema de organización de partidos.
            </p>
          </div>
        )}

        {/* Blocked Days Info */}
        {blockedSundays.length > 0 && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' 
              ? 'bg-amber-950/40 border border-amber-600/30' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Ban className={`h-5 w-5 ${
                theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
              }`} />
              <p className={`font-semibold text-sm ${
                theme === 'dark' ? 'text-amber-300' : 'text-amber-800'
              }`}>
                Días completos en {getCapitalizedMonthName(selectedYear, selectedMonth)}
              </p>
            </div>
            <p className={`text-sm ml-8 ${
              theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
            }`}>
              Los siguientes domingos ya tienen partidos confirmados con 10 jugadores: {blockedSundays.map(sunday => {
                return `${sunday} de ${getCapitalizedMonthName(selectedYear, selectedMonth)}`;
              }).join(', ')}
            </p>
          </div>
        )}

        {/* Month Navigation */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            {selectedYear > activeYear || (selectedYear === activeYear && selectedMonth > activeMonth) ? (
              <button
                onClick={prevMonth}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-muted-foreground rounded-lg transition-colors duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">Anterior</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 opacity-0">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">Anterior</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg sm:text-xl font-bold text-foreground text-center">
                {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { 
                  month: 'long', 
                  year: 'numeric' 
                }).replace(/^\w/, c => c.toUpperCase())}
              </h2>
            </div>
            
            <button
              onClick={nextMonth}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-muted-foreground rounded-lg transition-colors duration-200"
            >
              <span className="hidden sm:inline text-sm font-medium">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Cannot Play Toggle */}
          {(() => {
            const isPastMonth = selectedYear < activeYear || (selectedYear === activeYear && selectedMonth < activeMonth);
            
            if (isPastMonth) {
              return (
                <div className={`flex flex-col items-center justify-center gap-4 mb-6 p-4 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-amber-950/40 border border-amber-600/30'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <Lock className={`h-5 w-5 ${
                      theme === 'dark' ? 'text-amber-300' : 'text-amber-600'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      theme === 'dark' ? 'text-amber-300' : 'text-amber-800'
                    }`}>
                      Mes cerrado para votación
                    </span>
                  </div>
                  <p className={`text-sm text-center ${
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
                  }`}>
                    No puedes votar en meses anteriores al mes activo ({getCapitalizedMonthYear(activeYear, activeMonth)})
                  </p>
                </div>
              );
            }
            
            return (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 p-4 bg-accent/20 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">
                  ¿No puedes jugar ningún domingo este mes?
                </span>
                <button
                  onClick={toggleCannotPlayAnyDay}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                    cannotPlayAnyDay
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-accent text-muted-foreground hover:bg-accent/80'
                  }`}
                >
                  <Ban className="h-4 w-4" />
                  {cannotPlayAnyDay ? 'No puedo jugar este mes' : 'Marcar como no disponible'}
                </button>
              </div>
            );
          })()}

          {/* Sundays Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {sundaysInMonth.map((sunday) => {
              const date = new Date(selectedYear, selectedMonth - 1, sunday);
              const isSelected = availableSundays.includes(sunday);
              const isDisabled = cannotPlayAnyDay;
              const isBlocked = blockedSundays.includes(sunday);
              const isPastMonth = selectedYear < activeYear || (selectedYear === activeYear && selectedMonth < activeMonth);
              
              // Check if this specific date has passed
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPastDate = date < today;
              
              const shouldDisableClick = isDisabled || (!isSelected && isBlocked) || isPastMonth || isPastDate;

              return (
                <div
                  key={sunday}
                  onClick={() => !shouldDisableClick && toggleSundayAvailability(sunday)}
                  className={`p-4 rounded-xl transition-all duration-200 hover:shadow-md ${
                    isPastMonth || isPastDate
                      ? 'opacity-40 cursor-not-allowed bg-accent/20 border-2 border-border'
                      : isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-accent border-2 border-border'
                        : isBlocked && !isSelected
                          ? `opacity-75 cursor-not-allowed ${
                            theme === 'dark' 
                              ? 'bg-orange-950/40 border-2 border-orange-600/30'
                              : 'bg-orange-50 border-2 border-orange-200'
                          }`
                          : `cursor-pointer ${isSelected
                              ? `${
                                theme === 'dark' 
                                  ? 'bg-emerald-950/40 border-2 border-emerald-600/30'
                                  : 'bg-emerald-50 border-2 border-emerald-200'
                              }`
                              : 'bg-card border-2 border-border hover:border-muted-foreground'
                            }`
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 min-h-[24px]">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isPastMonth || isPastDate ? (
                        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : isSelected ? (
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      ) : isBlocked && !isSelected ? (
                        <Ban className="h-5 w-5 text-orange-400 flex-shrink-0" />
                      ) : (
                        <Calendar className="h-5 w-5 text-blue-400 flex-shrink-0" />
                      )}
                      {isSelected && !(isPastMonth || isPastDate) && (
                        <span className={`font-semibold text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                          theme === 'dark' 
                            ? 'text-green-200 bg-green-900/40'
                            : 'text-green-700 bg-green-100'
                        }`}>
                          DISPONIBLE
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {isPastMonth || isPastDate ? (
                        <span className="text-xs bg-accent text-muted-foreground px-1.5 py-0.5 rounded text-center min-w-[50px] inline-block">
                          {isPastDate ? 'Pasado' : 'Cerrado'}
                        </span>
                      ) : isBlocked && !isSelected && (
                        <span className={`text-xs px-1.5 py-0.5 rounded text-center min-w-[50px] inline-block ${
                          theme === 'dark' 
                            ? 'bg-orange-900/40 text-orange-300'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          Completo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className={`text-lg sm:text-xl font-bold mb-1 ${
                    isPastMonth || isPastDate ? 'text-muted-foreground' :
                    isSelected ? (theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700') :
                    isBlocked ? (theme === 'dark' ? 'text-orange-300' : 'text-orange-700') : 'text-foreground'
                  }`}>
                    {sunday}
                  </h3>
                  
                  <p className={`text-sm font-medium mb-2 ${
                    isPastMonth || isPastDate ? 'text-muted-foreground' :
                    isSelected ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600') :
                    isBlocked ? (theme === 'dark' ? 'text-orange-400' : 'text-orange-600') : 'text-muted-foreground'
                  }`}>
                    {isPastMonth ? 'Mes cerrado' : isPastDate ? 'Fecha pasada' : isBlocked && !isSelected ? 'Partido confirmado' : formatDate(date)}
                  </p>
                  
                  <p className={`text-xs ${
                    isPastMonth || isPastDate ? 'text-muted-foreground/60' :
                    isSelected ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500') :
                    isBlocked ? (theme === 'dark' ? 'text-orange-400' : 'text-orange-500') : 'text-muted-foreground'
                  }`}>
                    {isPastMonth ? 'No se puede votar' :
                     isPastDate ? 'Fecha ya pasada' :
                     isSelected ? 'Toca para desmarcar' : 
                     isBlocked && !isSelected ? '10 jugadores confirmados' : 'Toca para marcar disponibilidad'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="text-center">
            {selectedMonth === activeMonth && selectedYear === activeYear ? (
              // Show voting status only for active month
              (hasVoted || availableSundays.length > 0 || cannotPlayAnyDay) ? (
                <div className={`flex items-center justify-center gap-3 p-4 rounded-xl ${
                  theme === 'dark' 
                    ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-600/30'
                    : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                }`}>
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    {cannotPlayAnyDay 
                      ? 'Marcado como no disponible para este mes'
                      : `Disponible ${availableSundays.length} domingo${availableSundays.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              ) : (
                <div className={`flex items-center justify-center gap-3 p-4 rounded-xl ${
                  theme === 'dark' 
                    ? 'text-amber-300 bg-amber-950/40 border border-amber-600/30'
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}>
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Aún no has votado para este mes</span>
                </div>
              )
            ) : (
              // For non-active months, show current selection status
              (availableSundays.length > 0 || cannotPlayAnyDay) ? (
                <div className="flex items-center justify-center gap-3 text-muted-foreground bg-accent/20 p-4 rounded-xl border border-border">
                  <CalendarCheck className="h-5 w-5" />
                  <span className="font-semibold">
                    {cannotPlayAnyDay 
                      ? 'Marcado como no disponible'
                      : `Disponible ${availableSundays.length} domingo${availableSundays.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 text-muted-foreground bg-accent/20 p-4 rounded-xl border border-border">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Sin disponibilidad marcada</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}