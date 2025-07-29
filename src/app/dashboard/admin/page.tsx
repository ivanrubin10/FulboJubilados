'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/store';
import { User } from '@/types';
import { getNextAvailableMonth, getSundaysInMonth, createMockUsers } from '@/lib/utils';
import { notificationService } from '@/lib/notifications';

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentActiveMonth, setCurrentActiveMonth] = useState({ month: 7, year: 2025 });
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const allUsers = LocalStorage.getUsers();
      const userData = allUsers.find(u => u.id === user.id);
      const activeMonth = LocalStorage.getCurrentActiveMonth();
      
      setUsers(allUsers);
      setCurrentUser(userData || null);
      setIsAdmin(userData?.isAdmin || false);
      setCurrentActiveMonth(activeMonth);
    }
  }, [isLoaded, user]);

  const refreshUsers = () => {
    const allUsers = LocalStorage.getUsers();
    setUsers(allUsers);
  };

  const handleCreateMockUsers = () => {
    createMockUsers();
    refreshUsers();
    
    // Show some debug info
    const allUsers = LocalStorage.getUsers();
    const whitelistedUsers = allUsers.filter(u => u.isWhitelisted && !u.isAdmin);
    const availability = LocalStorage.getMonthlyAvailability();
    const mockUsers = allUsers.filter(u => u.id.startsWith('mock-user-'));
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Check August availability for mock users
    const augustAvailability = availability.filter(a => a.month === 8 && a.year === currentYear);
    const mockUsersWithAugust = augustAvailability.filter(a => a.userId.startsWith('mock-user-'));
    
    console.log('📊 Debug Info:');
    console.log(`- Total users: ${allUsers.length}`);
    console.log(`- Mock users: ${mockUsers.length}`);
    console.log(`- Whitelisted users: ${whitelistedUsers.length}`);
    console.log(`- Availability records: ${availability.length}`);
    console.log(`- August availability records: ${augustAvailability.length}`);
    console.log(`- Mock users with August availability: ${mockUsersWithAugust.length}`);
    console.log(`- Current month: ${currentMonth}/${currentYear}`);
    
    alert(`✅ Usuarios de prueba creados exitosamente!\n\n📊 Estado:\n• Total usuarios: ${allUsers.length}\n• Mock users: ${mockUsers.length}\n• Usuarios jugadores: ${whitelistedUsers.length}\n• Registros de disponibilidad: ${availability.length}\n\n🗓️ Agosto ${currentYear}:\n• Mock users con disponibilidad: ${mockUsersWithAugust.length}/${mockUsers.length}`);
  };

  const makeCurrentUserAdmin = () => {
    if (currentUser && !currentUser.isAdmin) {
      const updatedUser = { ...currentUser, isAdmin: true };
      LocalStorage.updateUser(updatedUser);
      setCurrentUser(updatedUser);
      setIsAdmin(true);
      refreshUsers();
      alert('✅ Te has convertido en administrador!');
    }
  };

  const setAugustAvailabilityForAllMockUsers = () => {
    const currentYear = new Date().getFullYear();
    const augustSundays = getSundaysInMonth(currentYear, 8);
    const mockUsers = LocalStorage.getUsers().filter(u => u.id.startsWith('mock-user-'));
    
    if (mockUsers.length === 0) {
      alert('❌ No hay usuarios mock. Crea usuarios de prueba primero.');
      return;
    }

    mockUsers.forEach(user => {
      LocalStorage.updateMonthlyAvailability(
        user.id,
        8, // August
        currentYear,
        augustSundays, // ALL Sundays in August
        false
      );
    });

    alert(`✅ Disponibilidad de Agosto configurada!\n\n📅 Todos los ${mockUsers.length} usuarios mock están disponibles para TODOS los domingos de Agosto ${currentYear}\n\nDomingos: ${augustSundays.join(', ')}`);
  };

  const clearAllData = () => {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      return;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('futbol-users');
      localStorage.removeItem('futbol-games');
      localStorage.removeItem('futbol-monthly-availability');
      localStorage.removeItem('futbol-reminder-status');
      localStorage.removeItem('futbol-settings');
      
      // Keep current user
      if (currentUser) {
        LocalStorage.addUser(currentUser);
      }
      
      refreshUsers();
      alert('🗑️ Todos los datos han sido eliminados (excepto tu usuario)');
    }
  };

  const toggleAdminStatus = (userId: string) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
    );
    setUsers(updatedUsers);
    LocalStorage.saveUsers(updatedUsers);
    
    if (userId === currentUser?.id) {
      setIsAdmin(!isAdmin);
    }
  };

  const removeUser = (userId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      LocalStorage.saveUsers(updatedUsers);
    }
  };

  const toggleUserWhitelist = (userId: string) => {
    LocalStorage.toggleUserWhitelist(userId);
    const updatedUsers = LocalStorage.getUsers();
    setUsers(updatedUsers);
  };

  const advanceToNextMonth = () => {
    const nextMonth = getNextAvailableMonth();
    LocalStorage.setCurrentActiveMonth(nextMonth.month, nextMonth.year);
    setCurrentActiveMonth(nextMonth);
  };

  const setCustomMonth = (month: number, year: number) => {
    LocalStorage.setCurrentActiveMonth(month, year);
    setCurrentActiveMonth({ month, year });
  };

  const sendTestEmail = async () => {
    setIsLoadingEmail(true);
    try {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 7); // Next week

      const success = await notificationService.notifyGameCreated(testDate, users.slice(0, 3));
      
      if (success) {
        alert('✅ Email de prueba enviado correctamente');
      } else {
        alert('❌ Error al enviar el email. Verifica tu configuración de Resend.');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('❌ Error al enviar el email.');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const sendGameReminder = async () => {
    setIsLoadingEmail(true);
    try {
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() + 1); // Tomorrow

      const success = await notificationService.notifyGameReminder(gameDate, users);
      
      if (success) {
        alert('✅ Recordatorio enviado a todos los usuarios');
      } else {
        alert('❌ Error al enviar el recordatorio');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('❌ Error al enviar el recordatorio');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const sendTeamAssignmentNotification = async () => {
    setIsLoadingEmail(true);
    try {
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() + 2); // Day after tomorrow

      // Mock team assignment
      const team1 = users.slice(0, 5);
      const team2 = users.slice(5, 10);

      const success = await notificationService.notifyTeamAssignments(gameDate, team1, team2);
      
      if (success) {
        alert('✅ Notificación de equipos enviada');
      } else {
        alert('❌ Error al enviar la notificación');
      }
    } catch (error) {
      console.error('Error sending team notification:', error);
      alert('❌ Error al enviar la notificación');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const sendDailyReminders = async () => {
    setIsLoadingEmail(true);
    try {
      const response = await fetch('/api/send-daily-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-token'}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ Recordatorios enviados a ${result.count} usuarios`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      alert('❌ Error al enviar recordatorios');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const checkReminderStatus = async () => {
    try {
      const response = await fetch('/api/send-daily-reminders');
      const result = await response.json();
      
      if (response.ok) {
        alert(`📊 Estado de recordatorios:\n\n• Mes activo: ${result.activeMonth.month}/${result.activeMonth.year}\n• Usuarios pendientes: ${result.count}\n• Nombres: ${result.usersNeedingReminders.map((u: { name: string }) => u.name).join(', ') || 'Ninguno'}`);
      } else {
        alert('❌ Error al obtener estado');
      }
    } catch (error) {
      console.error('Error checking reminder status:', error);
      alert('❌ Error al verificar estado');
    }
  };

  const migrateToDatabase = async () => {
    if (!confirm('¿Migrar todos los datos de LocalStorage a la base de datos Neon? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsLoadingEmail(true);
    try {
      const response = await fetch('/api/migrate-to-db', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'admin-secret'}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('✅ Migración completada exitosamente. Los datos ahora están en la base de datos Neon.');
      } else {
        alert(`❌ Error en migración: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in migration:', error);
      alert('❌ Error al ejecutar migración');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Acceso Denegado</h1>
          <p className="text-red-600">
            No tienes permisos de administrador para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
              <p className="text-slate-600 text-base">Gestiona usuarios, permisos y configuración del sistema</p>
            </div>
          </div>
        </div>

        {/* Testing Tools Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🧪</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Herramientas de Prueba</h2>
              <p className="text-slate-600 text-sm">Utilidades para probar el sistema con datos de ejemplo</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleCreateMockUsers}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm flex items-center gap-3"
            >
              <span>👥</span>
              <div className="text-left">
                <div>Crear Usuarios de Prueba</div>
                <div className="text-xs opacity-90">14 usuarios con disponibilidad</div>
              </div>
            </button>
            
            <button
              onClick={setAugustAvailabilityForAllMockUsers}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm flex items-center gap-3"
            >
              <span>📅</span>
              <div className="text-left">
                <div>Configurar Agosto Completo</div>
                <div className="text-xs opacity-90">Todos los domingos disponibles</div>
              </div>
            </button>
            
            {!isAdmin && (
              <button
                onClick={makeCurrentUserAdmin}
                className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm flex items-center gap-3"
              >
                <span>🔧</span>
                <div className="text-left">
                  <div>Hacerme Administrador</div>
                  <div className="text-xs opacity-90">Para probar funciones admin</div>
                </div>
              </button>
            )}
            
            <button
              onClick={clearAllData}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm flex items-center gap-3"
            >
              <span>🗑️</span>
              <div className="text-left">
                <div>Limpiar Todos los Datos</div>
                <div className="text-xs opacity-90">Mantiene tu usuario admin</div>
              </div>
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600">ℹ️</span>
              <h4 className="font-bold text-purple-800 text-sm">Información</h4>
            </div>
            <p className="text-purple-700 text-sm">
              Los usuarios de prueba se crean con disponibilidad aleatoria para el mes actual y siguiente. 
              Esto te permite probar la funcionalidad de creación de partidos cuando hay 10+ jugadores disponibles.
            </p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestión de Mes Activo</h2>
              <p className="text-slate-600 text-sm">Controla qué mes ven los usuarios por defecto</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-700 font-medium mb-1">
                  Mes activo actual:
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {new Date(currentActiveMonth.year, currentActiveMonth.month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Este es el mes que se muestra por defecto a todos los usuarios
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <button
              onClick={advanceToNextMonth}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🚀 Avanzar al Siguiente Mes
            </button>
            
            <div className="flex gap-3">
              <select
                value={currentActiveMonth.month}
                onChange={(e) => setCustomMonth(parseInt(e.target.value), currentActiveMonth.year)}
                className="border border-slate-300 rounded-xl pl-4 pr-10 py-3 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(currentActiveMonth.year, i, 1).toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date(currentActiveMonth.year, i, 1).toLocaleDateString('es-ES', { month: 'long' }).slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={currentActiveMonth.year}
                onChange={(e) => setCustomMonth(currentActiveMonth.month, parseInt(e.target.value))}
                className="border border-slate-300 rounded-xl pl-4 pr-10 py-3 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📧</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Notificaciones por Email</h2>
              <p className="text-slate-600 text-sm">Envía notificaciones a los jugadores</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={sendTestEmail}
              disabled={isLoadingEmail}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingEmail ? '⏳ Enviando...' : '🧪 Email de Prueba'}
            </button>
            
            <button
              onClick={sendGameReminder}
              disabled={isLoadingEmail}
              className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingEmail ? '⏳ Enviando...' : '🔔 Recordatorio'}
            </button>
            
            <button
              onClick={sendTeamAssignmentNotification}
              disabled={isLoadingEmail}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingEmail ? '⏳ Enviando...' : '👥 Notificar Equipos'}
            </button>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">🤖 Recordatorios Automáticos</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <button
                onClick={sendDailyReminders}
                disabled={isLoadingEmail}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoadingEmail ? '⏳ Enviando...' : '📧 Enviar Recordatorios Diarios'}
              </button>
              
              <button
                onClick={checkReminderStatus}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
              >
                📊 Ver Estado de Recordatorios
              </button>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-600">🤖</span>
                <h4 className="font-bold text-purple-800 text-sm">Automatización con GitHub Actions</h4>
              </div>
              <p className="text-purple-700 text-xs leading-relaxed">
                Los recordatorios se envían automáticamente todos los días a las 10:00 AM UTC usando GitHub Actions.
                Solo se envían a usuarios que no han marcado su disponibilidad para el mes activo.
              </p>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-600">🗄️</span>
                  <div>
                    <h4 className="font-bold text-cyan-800 text-sm">Base de Datos Neon</h4>
                    <p className="text-cyan-700 text-xs">Migra datos de LocalStorage a PostgreSQL</p>
                  </div>
                </div>
                <button
                  onClick={migrateToDatabase}
                  disabled={isLoadingEmail}
                  className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {isLoadingEmail ? '⏳ Migrando...' : '📦 Migrar a DB'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">ℹ️</span>
              <h3 className="font-bold text-blue-800 text-sm">Configuración de Email</h3>
            </div>
            <p className="text-blue-700 text-xs leading-relaxed">
              Para usar las notificaciones por email, agrega tu API key de Resend en el archivo .env.local:
              <br />
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">RESEND_API_KEY=tu_api_key_aqui</code>
            </p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-r from-sky-100 to-sky-200 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">
                Usuarios Registrados ({users.length})
              </h2>
              <p className="text-slate-600 text-sm">Gestiona permisos y usuarios del sistema</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{LocalStorage.getWhitelistedUserCount()}</div>
                <div className="text-xs text-green-600">Habilitados</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-700">{users.filter(u => !u.isWhitelisted && !u.isAdmin).length}</div>
                <div className="text-xs text-red-600">Deshabilitados</div>
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">ℹ️</span>
              <h3 className="font-bold text-blue-800 text-sm">Control de Usuarios para Partidos</h3>
            </div>
            <p className="text-blue-700 text-xs leading-relaxed">
              Solo los usuarios <strong>habilitados</strong> serán contados para la organización de partidos y recibirán recordatorios.
              Usa esto para excluir usuarios de prueba o cuentas temporales.
            </p>
          </div>
        
          {users.length > 0 ? (
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Foto</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900 text-sm">Admin</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900 text-sm">Habilitado</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900 text-sm">Registro</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-900 text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(userData => (
                      <tr key={userData.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          {userData.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={userData.imageUrl} 
                              alt={userData.name}
                              className="w-8 h-8 rounded-full border-2 border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-100 to-sky-100 flex items-center justify-center border-2 border-slate-200">
                              <span className="text-slate-700 text-xs font-bold">
                                {userData.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                    </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{userData.name}</p>
                            {userData.nickname && (
                              <p className="text-xs text-slate-500">@{userData.nickname}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">{userData.email}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            userData.isAdmin 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {userData.isAdmin ? '✓ Admin' : 'Usuario'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            userData.isWhitelisted 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {userData.isWhitelisted ? '✓ Habilitado' : '❌ Deshabilitado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-medium text-sm">
                          {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => toggleAdminStatus(userData.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                userData.isAdmin
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
                              }`}
                            >
                              {userData.isAdmin ? '🔒 Quitar Admin' : '🔑 Hacer Admin'}
                            </button>
                            
                            <button
                              onClick={() => toggleUserWhitelist(userData.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                userData.isWhitelisted
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                              }`}
                            >
                              {userData.isWhitelisted ? '❌ Deshabilitar' : '✅ Habilitar'}
                            </button>
                            
                            {userData.id !== currentUser.id && (
                              <button
                                onClick={() => removeUser(userData.id)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-all"
                              >
                                🗑️ Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-slate-500 text-base font-medium">
                No hay usuarios registrados
              </p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <h3 className="font-bold text-amber-800">Nota Importante</h3>
          </div>
          <p className="text-amber-700 leading-relaxed">
            Los permisos de administrador permiten gestionar usuarios, crear partidos, organizar equipos y registrar resultados. 
            Ten cuidado al otorgar estos permisos ya que dan acceso completo al sistema.
          </p>
        </div>
      </div>
  );
}