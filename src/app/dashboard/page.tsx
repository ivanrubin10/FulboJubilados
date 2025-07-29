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

  useEffect(() => {
    if (isLoaded && user) {
      const existingUser = LocalStorage.getUserById(user.id);
      
      if (!existingUser) {
        const newUser: User = {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: user.fullName || user.firstName || 'Usuario',
          imageUrl: user.imageUrl,
          isAdmin: false,
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
      setAvailableSundays(userAvailability);
    }
  }, [isLoaded, user, selectedMonth, selectedYear, router]);

  useEffect(() => {
    setSundaysInMonth(getSundaysInMonth(selectedYear, selectedMonth));
  }, [selectedMonth, selectedYear]);

  const toggleSundayAvailability = (sunday: number) => {
    if (!user) return;

    const newAvailability = availableSundays.includes(sunday)
      ? availableSundays.filter(s => s !== sunday)
      : [...availableSundays, sunday];

    setAvailableSundays(newAvailability);
    LocalStorage.updateMonthlyAvailability(
      user.id,
      selectedMonth,
      selectedYear,
      newAvailability
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-shadow-soft tracking-tight">
                ¡Hola, {currentUser?.nickname || user.firstName}!
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 font-medium mt-2 mb-4">
                Marca los domingos en los que puedes jugar este mes
              </p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-sky-100 px-4 py-2 rounded-xl border border-emerald-200">
                <span className="text-lg">🕙</span>
                <p className="text-emerald-800 font-bold text-sm sm:text-base">
                  Partidos: Domingos 10:00 AM
                </p>
              </div>
            </div>
          </div>
          
          {currentUser && !currentUser.isAdmin && (
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-800 text-lg">Configuración temporal</h3>
                  <p className="text-amber-700 font-medium">Activar permisos de administrador para pruebas</p>
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
                  <h3 className="font-bold text-emerald-800 text-lg">Panel de Administración</h3>
                  <p className="text-emerald-700 font-medium">Gestionar usuarios y configuración del sistema</p>
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
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 text-shadow-soft tracking-tight">Tu disponibilidad</h2>
              <p className="text-slate-600 text-base sm:text-lg font-medium">Selecciona los domingos que puedes jugar</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="nested-border rounded-2xl px-4 sm:px-6 py-3 sm:py-4 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg text-base sm:text-lg"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(selectedYear, i, 1).toLocaleDateString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="nested-border rounded-2xl px-4 sm:px-6 py-3 sm:py-4 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-lg text-base sm:text-lg"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6">
            {sundaysInMonth.map((sunday) => {
              const isSelected = availableSundays.includes(sunday);
              const date = new Date(selectedYear, selectedMonth - 1, sunday);
              
              return (
                <div
                  key={sunday}
                  onClick={() => toggleSundayAvailability(sunday)}
                  className={`p-6 sm:p-8 rounded-2xl cursor-pointer transition-colors duration-200 ${
                    isSelected
                      ? 'bg-emerald-50 border-2 border-emerald-200'
                      : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <h3 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                        Domingo {sunday} de {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' })}
                      </h3>
                      <p className={`text-base sm:text-lg font-medium mb-2 ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {formatDate(date)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base">🕙</span>
                        <p className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`}>
                          10:00 AM - Hora del partido
                        </p>
                      </div>
                    </div>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <span className="text-white font-bold text-lg sm:text-xl">✓</span>}
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
              <p className="text-slate-500 text-lg font-medium">
                No hay domingos en este mes
              </p>
            </div>
          )}
        </div>
      </div>
  );
}