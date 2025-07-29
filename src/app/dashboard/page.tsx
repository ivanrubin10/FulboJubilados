'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSundaysInMonth, formatDate } from '@/lib/utils';
import { User } from '@/types';
import { useToast } from '@/components/ui/toast';

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
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
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
        const activeMonth = await apiClient.getCurrentActiveMonth();
        setSelectedMonth(activeMonth.month);
        setSelectedYear(activeMonth.year);

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
        await loadUserAvailability(user.id, activeMonth.month, activeMonth.year);
        
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

    // Check if this day is blocked (has confirmed game with 10 players)
    const isBlocked = blockedSundays.includes(sunday);
    
    // If trying to add a blocked day, show warning and prevent selection
    if (!availableSundays.includes(sunday) && isBlocked) {
      const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
      warning(
        'Día completo',
        `${monthName} ${sunday}: Ya hay un partido confirmado con 10 jugadores. Este día está completo y no acepta más jugadores.`
      );
      return;
    }

    // If trying to remove a blocked day, show warning and prevent unvoting
    if (availableSundays.includes(sunday) && isBlocked) {
      const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
      warning(
        'No se puede desvotar',
        `${monthName} ${sunday}: Ya hay un partido confirmado. No puedes cambiar tu voto una vez que el partido ha sido confirmado.`
      );
      return;
    }

    const newAvailability = availableSundays.includes(sunday)
      ? availableSundays.filter(s => s !== sunday)
      : [...availableSundays, sunday];

    // Update UI immediately for better UX
    setAvailableSundays(newAvailability);
    setHasVoted(true);
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

    const newCannotPlayAnyDay = !cannotPlayAnyDay;
    
    // Update UI immediately
    setCannotPlayAnyDay(newCannotPlayAnyDay);
    setHasVoted(true);
    
    if (newCannotPlayAnyDay) {
      setAvailableSundays([]);
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
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">No se pudo cargar el usuario</p>
      </div>
    );
  }

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            ¡Hola, {currentUser.nickname || currentUser.name}! ⚽
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Marca los domingos que puedes jugar
          </p>
        </div>

        {/* Blocked Days Info */}
        {blockedSundays.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600">🚫</span>
              <p className="text-orange-800 font-bold text-sm">
                Días completos en {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' })}
              </p>
            </div>
            <p className="text-orange-700 text-xs">
              Los siguientes domingos ya tienen partidos confirmados con 10 jugadores: {blockedSundays.map(sunday => {
                const date = new Date(selectedYear, selectedMonth - 1, sunday);
                return `${sunday} de ${date.toLocaleDateString('es-ES', { month: 'long' })}`;
              }).join(', ')}
            </p>
          </div>
        )}

        {/* Month Navigation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200 flex items-center gap-1"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:inline text-sm font-medium text-slate-700">Anterior</span>
            </button>
            
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 text-center">
              {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { 
                month: 'long', 
                year: 'numeric' 
              }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
            
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200 flex items-center gap-1"
            >
              <span className="hidden sm:inline text-sm font-medium text-slate-700">Siguiente</span>
              <span className="text-lg">→</span>
            </button>
          </div>

          {/* Cannot Play Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
            <span className="text-sm font-medium text-slate-700">
              ¿No puedes jugar ningún domingo este mes?
            </span>
            <button
              onClick={toggleCannotPlayAnyDay}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                cannotPlayAnyDay
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {cannotPlayAnyDay ? 'No puedo jugar este mes' : 'Marcar como no disponible'}
            </button>
          </div>

          {/* Sundays Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {sundaysInMonth.map((sunday) => {
              const date = new Date(selectedYear, selectedMonth - 1, sunday);
              const isSelected = availableSundays.includes(sunday);
              const isDisabled = cannotPlayAnyDay;
              const isBlocked = blockedSundays.includes(sunday);
              const shouldDisableClick = isDisabled || (!isSelected && isBlocked);

              return (
                <div
                  key={sunday}
                  onClick={() => !shouldDisableClick && toggleSundayAvailability(sunday)}
                  className={`p-4 rounded-xl transition-all duration-200 hover:shadow-md ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 border-2 border-gray-200'
                      : isBlocked && !isSelected
                        ? 'opacity-75 cursor-not-allowed bg-orange-50 border-2 border-orange-200'
                        : `cursor-pointer ${isSelected
                            ? 'bg-emerald-50 border-2 border-emerald-200'
                            : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                          }`
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {isSelected ? '✅' : isBlocked && !isSelected ? '🚫' : '⚽'}
                      </span>
                      {isSelected && (
                        <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-full">
                          DISPONIBLE
                        </span>
                      )}
                    </div>
                    {isBlocked && !isSelected && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                        Completo
                      </span>
                    )}
                  </div>
                  
                  <h3 className={`text-lg sm:text-xl font-bold mb-1 ${
                    isSelected ? 'text-emerald-900' :
                    isBlocked ? 'text-orange-900' : 'text-slate-900'
                  }`}>
                    {sunday}
                  </h3>
                  
                  <p className={`text-sm font-medium mb-2 ${
                    isSelected ? 'text-emerald-700' :
                    isBlocked ? 'text-orange-700' : 'text-slate-600'
                  }`}>
                    {isBlocked && !isSelected ? 'Partido confirmado' : formatDate(date)}
                  </p>
                  
                  <p className={`text-xs ${
                    isSelected ? 'text-emerald-600' :
                    isBlocked ? 'text-orange-600' : 'text-slate-500'
                  }`}>
                    {isSelected ? 'Toca para desmarcar' : 
                     isBlocked && !isSelected ? '10 jugadores confirmados' : 'Toca para marcar disponibilidad'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="text-center">
            {hasVoted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <span>✅</span>
                <span className="font-semibold">
                  {cannotPlayAnyDay 
                    ? 'Marcado como no disponible para este mes'
                    : `Disponible ${availableSundays.length} domingo${availableSundays.length !== 1 ? 's' : ''}`
                  }
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <span>⏳</span>
                <span className="font-semibold">Aún no has votado para este mes</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}