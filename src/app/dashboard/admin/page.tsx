'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getNextAvailableMonth } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { 
  Settings, 
  Mail, 
  Vote, 
  Trophy, 
  Calendar, 
  ChevronRight, 
  Users, 
  UserPlus, 
  Shield, 
  ShieldOff, 
  Trash, 
  Database, 
  TestTube,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';


interface MockPlayer {
  name: string;
  email: string;
}

// API helper functions
const apiClient = {
  async getUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  
  async getCurrentActiveMonth() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
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
  
  async saveUsers(users: User[]) {
    const res = await fetch('/api/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
    if (!res.ok) throw new Error('Failed to save users');
    return res.json();
  },
  
  async toggleUserWhitelist(userId: string) {
    const res = await fetch(`/api/users/${userId}/whitelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to toggle whitelist');
    return res.json();
  },

  async toggleUserAdmin(userId: string) {
    const res = await fetch(`/api/users/${userId}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to toggle admin status');
    return res.json();
  },
  
  async setCurrentActiveMonth(month: number, year: number) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    });
    if (!res.ok) throw new Error('Failed to set active month');
    return res.json();
  },


  async addMockPlayers() {
    const res = await fetch('/api/add-mock-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to add mock players');
    return res.json();
  },

  async createTestGame(participantCount = 10) {
    const res = await fetch('/api/create-test-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantCount })
    });
    if (!res.ok) throw new Error('Failed to create test game');
    return res.json();
  },

  async setupDatabase() {
    const res = await fetch('/api/setup-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to setup database');
    return res.json();
  },

  async checkAdminStatus() {
    const res = await fetch('/api/check-admin');
    if (!res.ok) throw new Error('Failed to check admin status');
    return res.json();
  },

  async testConnection() {
    const res = await fetch('/api/test-connection');
    if (!res.ok) throw new Error('Failed to test connection');
    return res.json();
  },

  async debugAdmin() {
    const res = await fetch('/api/debug-admin');
    if (!res.ok) throw new Error('Failed to debug admin');
    return res.json();
  }
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentActiveMonth, setCurrentActiveMonth] = useState({ month: 7, year: 2025 });
  const [isLoadingVotingReminder, setIsLoadingVotingReminder] = useState(false);
  const [isLoadingMatchConfirmation, setIsLoadingMatchConfirmation] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [manualAdminMode, setManualAdminMode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;
      
      // Skip loading if in manual admin mode
      if (manualAdminMode) {
        setIsLoadingData(false);
        return;
      }
      
      setIsLoadingData(true);
      try {
        // Load basic data first
        const [allUsers, activeMonth] = await Promise.all([
          apiClient.getUsers().catch(() => []),
          apiClient.getCurrentActiveMonth().catch(() => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }))
        ]);
        
        // Check admin status
        let isUserAdmin = false;
        let adminCheckResult = null;
        
        try {
          adminCheckResult = await apiClient.checkAdminStatus();
          isUserAdmin = adminCheckResult.isAdmin || false;
        } catch (adminError) {
          console.error('Admin check failed:', adminError);
          // Fallback to user list lookup
          const userData = allUsers.find((u: User) => u.id === user.id);
          isUserAdmin = userData?.isAdmin || false;
        }
        
        const userData = allUsers.find((u: User) => u.id === user.id);
        
        setUsers(allUsers);
        setCurrentUser(userData || null);
        setIsAdmin(isUserAdmin);
        setCurrentActiveMonth(activeMonth);
        
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [isLoaded, user, manualAdminMode]);

  const refreshUsers = async () => {
    try {
      const allUsers = await apiClient.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  };



  const clearAllData = async () => {
    const confirmed = await confirm({
      title: 'Eliminar todos los datos',
      message: '¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.',
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;
    
    try {
      // Clear browser localStorage as fallback (for any old data)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('futbol-users');
        localStorage.removeItem('futbol-games');
        localStorage.removeItem('futbol-monthly-availability');
        localStorage.removeItem('futbol-reminder-status');
        localStorage.removeItem('futbol-settings');
      }
      
      // Note: In a real implementation, you would need to add database clear methods
      // For now, we just keep the current user and refresh
      if (currentUser) {
        await apiClient.addUser(currentUser);
      }
      
      await refreshUsers();
      success('Datos eliminados', 'Datos de LocalStorage eliminados. Para limpiar completamente la base de datos, contacta al administrador del sistema.');
    } catch (err) {
      console.error('Error clearing data:', err);
      error('Error al limpiar los datos', 'No se pudieron eliminar los datos correctamente');
    }
  };

  const toggleAdminStatus = async (userId: string) => {
    try {
      await apiClient.toggleUserAdmin(userId);
      await refreshUsers();
      
      if (userId === currentUser?.id) {
        setIsAdmin(!isAdmin);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const toggleUserWhitelist = async (userId: string) => {
    try {
      await apiClient.toggleUserWhitelist(userId);
      await refreshUsers();
    } catch (error) {
      console.error('Error toggling user whitelist:', error);
    }
  };

  const advanceToNextMonth = async () => {
    try {
      const nextMonth = getNextAvailableMonth();
      await apiClient.setCurrentActiveMonth(nextMonth.month, nextMonth.year);
      setCurrentActiveMonth(nextMonth);
    } catch (error) {
      console.error('Error advancing to next month:', error);
    }
  };

  const setCustomMonth = async (month: number, year: number) => {
    try {
      await apiClient.setCurrentActiveMonth(month, year);
      setCurrentActiveMonth({ month, year });
    } catch (error) {
      console.error('Error setting custom month:', error);
    }
  };


  const sendVotingReminder = async () => {
    setIsLoadingVotingReminder(true);
    try {
      console.log('[ADMIN] Sending voting reminders...');
      const response = await fetch('/api/send-voting-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      console.log('[ADMIN] Voting reminder API response:', result);
      
      if (response.ok) {
        const detailMessage = `Mes activo: ${result.activeMonth?.month}/${result.activeMonth?.year}\n` +
                             `Usuarios que necesitaban recordatorio: ${result.totalUsersNeedingReminder}\n` +
                             `Emails enviados exitosamente: ${result.count}\n` +
                             (result.emailsSent?.length > 0 ? `Enviados a: ${result.emailsSent.join(', ')}` : '') +
                             (result.emailErrors?.length > 0 ? `\nErrores: ${result.emailErrors.join(', ')}` : '');
        
        success('Recordatorios procesados', detailMessage);
      } else {
        error('Error al enviar recordatorios', result.error || 'No se pudieron enviar los recordatorios');
      }
    } catch (err) {
      console.error('Error sending voting reminders:', err);
      error('Error al enviar recordatorios', 'Ocurrió un error inesperado');
    } finally {
      setIsLoadingVotingReminder(false);
    }
  };

  const sendMatchConfirmation = async () => {
    setIsLoadingMatchConfirmation(true);
    try {
      const response = await fetch('/api/send-match-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (response.ok) {
        success('Confirmaciones enviadas', `Confirmaciones de partido enviadas a ${result.count} jugadores confirmados`);
      } else {
        error('Error al enviar confirmaciones', result.error || 'No se pudieron enviar las confirmaciones');
      }
    } catch (err) {
      console.error('Error sending match confirmations:', err);
      error('Error al enviar confirmaciones', 'Ocurrió un error inesperado');
    } finally {
      setIsLoadingMatchConfirmation(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const result = await apiClient.checkAdminStatus();
      const status = `User ID de Clerk: ${result.userId || 'No disponible'}\nUsuario existe en DB: ${result.userExists ? 'Sí' : 'No'}\nEs Admin: ${result.isAdmin ? 'Sí' : 'No'}\n\n` +
        (result.user ? 
          `Datos del usuario:\n• Nombre: ${result.user.name}\n• Email: ${result.user.email}\n• ID: ${result.user.id}\n• Admin: ${result.user.isAdmin}\n• Habilitado: ${result.user.isWhitelisted}` 
          : 
          `Error: ${result.error || 'Usuario no encontrado'}\n` +
          (result.details ? `Detalles: ${result.details}` : ''));
      
      info('Debug de Estado Admin', status);
    } catch (err) {
      console.error('Error checking admin status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error de verificación', `No se pudo verificar el estado de admin: ${errorMessage}`);
    }
  };

  const testConnection = async () => {
    try {
      const result = await apiClient.testConnection();
      const status = `Autenticación: ${result.auth ? 'OK' : 'FALLO'}\nUser ID: ${result.userId || 'No disponible'}\nBase de datos: ${result.database || 'FALLO'}\nEstado: ${result.success ? 'TODO OK' : 'ERRORES'}\n\n` +
        (result.error ? `Error: ${result.error}\nDetalles: ${result.details}` : result.message || '');
      
      info('Test de Conexión', status);
    } catch (err) {
      console.error('Error testing connection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error de conexión', `No se pudo probar la conexión: ${errorMessage}`);
    }
  };

  const debugAdmin = async () => {
    try {
      const result = await apiClient.debugAdmin();
      const status = `Estado: ${result.success ? 'SUCCESS' : 'ERROR'}\nUser ID: ${result.userId || 'No disponible'}\n\n` +
        (result.steps ? 
          `Pasos completados:\n${result.steps.join('\n')}\n\n` : '') +
        (result.error ? 
          `❌ Error en paso: ${result.step || 'unknown'}\nError: ${result.error}\nDetalles: ${result.details || 'No details'}` : 
          result.message || '');
      
      info('Debug Detallado', status);
    } catch (err) {
      console.error('Error in debug admin:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error de debug', `No se pudo ejecutar el debug detallado: ${errorMessage}`);
    }
  };




  if (!isLoaded || isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!manualAdminMode && (!currentUser || !isAdmin)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Acceso Denegado</h1>
          <p className="text-red-600 mb-4">
            No tienes permisos de administrador para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600">Gestiona usuarios, permisos y configuración del sistema</p>
            </div>
          </div>
        </div>

        {/* Admin Notifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notificaciones de Jugadores</h2>
              <p className="text-gray-600 text-sm">Envía recordatorios y confirmaciones a los jugadores</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={sendVotingReminder}
              disabled={isLoadingVotingReminder}
              className="bg-blue-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Vote className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isLoadingVotingReminder ? (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Enviando...
                      </span>
                    ) : 'Recordar Votación'}
                  </div>
                  <div className="text-sm opacity-90">
                    A usuarios que no han votado
                  </div>
                </div>
              </div>
            </button>
            
            <button
              onClick={sendMatchConfirmation}
              disabled={isLoadingMatchConfirmation}
              className="bg-green-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isLoadingMatchConfirmation ? (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Enviando...
                      </span>
                    ) : 'Confirmar Partido'}
                  </div>
                  <div className="text-sm opacity-90">
                    A jugadores confirmados
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>



        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestión de Mes Activo</h2>
              <p className="text-gray-600 text-sm">Controla qué mes ven los usuarios por defecto</p>
            </div>
          </div>
          
          <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-emerald-800 font-medium mb-1">
                  Mes activo actual:
                </p>
                <p className="text-xl font-bold text-emerald-900">
                  {new Date(currentActiveMonth.year, currentActiveMonth.month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </p>
                <p className="text-sm text-emerald-700 mt-1">
                  Este es el mes que se muestra por defecto a todos los usuarios
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-4">
            <button
              onClick={advanceToNextMonth}
              className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <ChevronRight className="h-5 w-5" />
              Avanzar al Siguiente Mes
            </button>
            
            <div className="flex gap-3">
              <select
                value={currentActiveMonth.month}
                onChange={(e) => setCustomMonth(parseInt(e.target.value), currentActiveMonth.year)}
                className="border border-gray-300 rounded-lg pl-4 pr-10 py-3 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                className="border border-gray-300 rounded-lg pl-4 pr-10 py-3 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>
        </div>


        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                Usuarios Registrados ({users.length})
              </h2>
              <p className="text-gray-600 text-sm">Gestiona permisos y usuarios del sistema</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-700">{users.filter(u => u.isWhitelisted).length}</div>
                <div className="text-xs text-green-600">Jugadores Activos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-700">{users.filter(u => !u.isWhitelisted).length}</div>
                <div className="text-xs text-red-600">Deshabilitados</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-700">{users.filter(u => u.isAdmin).length}</div>
                <div className="text-xs text-blue-600">Administradores</div>
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-blue-800 text-sm">Control de Usuarios para Partidos</h3>
            </div>
            <p className="text-blue-700 text-xs leading-relaxed">
              Solo los usuarios <strong>habilitados</strong> serán contados para la organización de partidos y recibirán recordatorios.
              Usa esto para excluir usuarios de prueba o cuentas temporales.
            </p>
          </div>
        
          {users.length > 0 ? (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Foto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900 text-sm">Email</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Admin</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Habilitado</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Registro</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(userData => (
                      <tr key={userData.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          {userData.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={userData.imageUrl} 
                              alt={userData.name}
                              className="w-8 h-8 rounded-full border-2 border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                              <span className="text-gray-700 text-xs font-bold">
                                {userData.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                    </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{userData.name}</p>
                            {userData.nickname && (
                              <p className="text-xs text-gray-500">@{userData.nickname}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{userData.email}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            userData.isAdmin 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {userData.isAdmin ? (
                              <>
                                <Shield className="h-3 w-3" />
                                Admin
                              </>
                            ) : (
                              'Usuario'
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            userData.isWhitelisted 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {userData.isWhitelisted ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Activo
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                Inactivo
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 font-medium text-sm">
                          {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center space-x-1">
                            <button
                              onClick={() => toggleAdminStatus(userData.id)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                userData.isAdmin
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {userData.isAdmin ? (
                                <>
                                  <ShieldOff className="h-3 w-3" />
                                  Quitar Admin
                                </>
                              ) : (
                                <>
                                  <Shield className="h-3 w-3" />
                                  Hacer Admin
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => toggleUserWhitelist(userData.id)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                userData.isWhitelisted
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {userData.isWhitelisted ? (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Deshabilitar
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Habilitar
                                </>
                              )}
                            </button>
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
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-500 text-base font-medium">
                No hay usuarios registrados
              </p>
            </div>
          )}
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-bold text-orange-800">Nota Importante</h3>
          </div>
          <p className="text-orange-700 leading-relaxed">
            Los permisos de administrador permiten gestionar usuarios, crear partidos, organizar equipos y registrar resultados. 
            Ten cuidado al otorgar estos permisos ya que dan acceso completo al sistema.
          </p>
        </div>
      </div>
  );
}