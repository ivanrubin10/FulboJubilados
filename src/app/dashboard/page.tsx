'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LocalStorage } from '@/lib/store';
import { getSundaysInMonth, formatDate } from '@/lib/utils';
import { User } from '@/types';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const activeMonth = LocalStorage.getCurrentActiveMonth();
  const [selectedMonth, setSelectedMonth] = useState(activeMonth.month);
  const [selectedYear, setSelectedYear] = useState(activeMonth.year);
  const [availableSundays, setAvailableSundays] = useState<number[]>([]);
  const [sundaysInMonth, setSundaysInMonth] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cannotPlayAnyDay, setCannotPlayAnyDay] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const existingUser = LocalStorage.getUserById(user.id);
      
      if (!existingUser) {
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        const newUser: User = {
          id: user.id,
          email: userEmail,
          name: user.fullName || user.firstName || 'Usuario',
          imageUrl: user.imageUrl,
          isAdmin: userEmail === 'ivanrubin10@gmail.com',
          createdAt: new Date(),
        };
        LocalStorage.addUser(newUser);
        setCurrentUser(newUser);
      } else {
        setCurrentUser(existingUser);
      }

      if (!existingUser?.nickname) {
        router.push('/setup-nickname');
        return;
      }

      const userAvailability = LocalStorage.getUserMonthlyAvailability(
        user.id,
        selectedMonth,
        selectedYear
      );
      const votingStatus = LocalStorage.getUserVotingStatus(user.id, selectedMonth, selectedYear);
      
      setAvailableSundays(userAvailability);
      setCannotPlayAnyDay(votingStatus.cannotPlayAnyDay);
      setHasVoted(votingStatus.hasVoted);
    }
  }, [isLoaded, user, selectedMonth, selectedYear, router]);

  useEffect(() => {
    setSundaysInMonth(getSundaysInMonth(selectedYear, selectedMonth));
  }, [selectedMonth, selectedYear]);

  const toggleSundayAvailability = (sunday: number) => {
    if (!user || cannotPlayAnyDay) return;

    const newAvailability = availableSundays.includes(sunday)
      ? availableSundays.filter(s => s !== sunday)
      : [...availableSundays, sunday];

    setAvailableSundays(newAvailability);
    setHasVoted(true);
    setCannotPlayAnyDay(false);
    
    LocalStorage.updateMonthlyAvailability(
      user.id,
      selectedMonth,
      selectedYear,
      newAvailability,
      false
    );
  };

  const toggleCannotPlayAnyDay = () => {
    if (!user) return;

    const newCannotPlayAnyDay = !cannotPlayAnyDay;
    setCannotPlayAnyDay(newCannotPlayAnyDay);
    setHasVoted(true);
    
    if (newCannotPlayAnyDay) {
      setAvailableSundays([]);
    }
    
    LocalStorage.updateMonthlyAvailability(
      user.id,
      selectedMonth,
      selectedYear,
      newCannotPlayAnyDay ? [] : availableSundays,
      newCannotPlayAnyDay
    );
  };

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen">No autenticado</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
        <div className="glass-morphism rounded-3xl border border-white/30 p-6 md:p-10 mb-8 md:mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <span className="text-3xl">👋</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 text-shadow-soft tracking-tight">
                ¡Hola, {currentUser?.nickname || user.firstName}!
              </h1>
              <p className="text-base sm:text-lg text-slate-600 font-medium mt-2 mb-3">
                Marca los domingos en los que puedes jugar este mes
              </p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-sky-100 px-4 py-2 rounded-xl border border-emerald-200">
                <span className="text-lg">🕙</span>
                <p className="text-emerald-800 font-bold text-xs sm:text-sm">
                  Partidos: Domingos 10:00 AM
                </p>
              </div>
            </div>
          </div>
          
          {currentUser && !currentUser.isAdmin && (
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-800 text-base">Configuración temporal</h3>
                  <p className="text-amber-700 font-medium text-sm">Activar permisos de administrador para pruebas</p>
                </div>
                <button
                  onClick={() => {
                    const updatedUser = { ...currentUser, isAdmin: true };
                    LocalStorage.updateUser(updatedUser);
                    setCurrentUser(updatedUser);
                  }}
                  className="button-glow px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-bold shadow-lg hover:shadow-amber-500/25 transform hover:-translate-y-0.5"
                >
                  🔧 Hacer Admin
                </button>
              </div>
            </div>
          )}

          {currentUser?.isAdmin && (
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-emerald-800 text-base">Panel de Administración</h3>
                  <p className="text-emerald-700 font-medium text-sm">Gestionar usuarios y configuración del sistema</p>
                </div>
                <a
                  href="/dashboard/admin"
                  className="button-glow px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 font-bold shadow-lg hover:shadow-emerald-500/25 transform hover:-translate-y-0.5"
                >
                  ⚙️ Ir al Admin Panel
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="glass-morphism rounded-3xl border border-white/30 p-6 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 md:mb-10 gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 text-shadow-soft tracking-tight">Tu disponibilidad</h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium">Selecciona los domingos que puedes jugar</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="nested-border rounded-2xl pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-3 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg text-sm sm:text-base"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(selectedYear, i, 1).toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date(selectedYear, i, 1).toLocaleDateString('es-ES', { month: 'long' }).slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="nested-border rounded-2xl pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-3 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg text-sm sm:text-base"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>

          {/* Voting Status Indicator */}
          {hasVoted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-green-600">✅</span>
                <p className="text-green-800 font-bold text-sm">
                  {cannotPlayAnyDay 
                    ? 'Has indicado que no puedes jugar ningún día este mes' 
                    : `Has seleccionado ${availableSundays.length} domingo${availableSundays.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Cannot Play Any Day Option */}
          <div className="mb-6">
            <div
              onClick={toggleCannotPlayAnyDay}
              className={`p-4 sm:p-6 rounded-2xl cursor-pointer transition-colors duration-200 ${
                cannotPlayAnyDay
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-white border-2 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h3 className={`text-base sm:text-lg md:text-xl font-bold mb-1 ${cannotPlayAnyDay ? 'text-red-900' : 'text-slate-900'}`}>
                    No puedo ningún día este mes
                  </h3>
                  <p className={`text-sm sm:text-base font-medium ${cannotPlayAnyDay ? 'text-red-700' : 'text-slate-600'}`}>
                    Marcar si no estarás disponible en ningún domingo
                  </p>
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
                  cannotPlayAnyDay 
                    ? 'border-red-500 bg-red-500' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {cannotPlayAnyDay && <span className="text-white font-bold text-sm sm:text-base">✓</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            {sundaysInMonth.map((sunday) => {
              const isSelected = availableSundays.includes(sunday);
              const date = new Date(selectedYear, selectedMonth - 1, sunday);
              const isDisabled = cannotPlayAnyDay;
              
              return (
                <div
                  key={sunday}
                  onClick={() => !isDisabled && toggleSundayAvailability(sunday)}
                  className={`p-4 sm:p-6 rounded-2xl transition-colors duration-200 ${
                    isDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 border-2 border-gray-200'
                      : `cursor-pointer ${isSelected
                          ? 'bg-emerald-50 border-2 border-emerald-200'
                          : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                        }`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <h3 className={`text-base sm:text-lg md:text-xl font-bold mb-1 ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                        Domingo {sunday} de {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' }).slice(1)}
                      </h3>
                      <p className={`text-sm sm:text-base font-medium mb-1 ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {formatDate(date)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base">🕙</span>
                        <p className={`text-xs font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`}>
                          10:00 AM - Hora del partido
                        </p>
                      </div>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <span className="text-white font-bold text-sm sm:text-base">✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sundaysInMonth.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-slate-500 text-base font-medium">
                No hay domingos en este mes
              </p>
            </div>
          )}
        </div>
      </div>
  );
}