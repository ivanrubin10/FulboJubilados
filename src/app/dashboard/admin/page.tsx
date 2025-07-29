'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { AdminNotification } from '@/lib/db/schema';
import { getNextAvailableMonth } from '@/lib/utils';
import { notificationService } from '@/lib/notifications';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

// Types for additional interfaces
interface ReservationInfo {
  location: string;
  time: string;
  cost?: number;
  reservedBy: string;
}

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
  
  async setCurrentActiveMonth(month: number, year: number) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year })
    });
    if (!res.ok) throw new Error('Failed to set active month');
    return res.json();
  },

  async getAdminNotifications() {
    try {
      const res = await fetch('/api/admin-notifications');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch admin notifications: ${errorData.error || res.statusText}`);
      }
      return res.json();
    } catch (error) {
      console.error('Error in getAdminNotifications:', error);
      throw error;
    }
  },

  async markNotificationAsRead(notificationId: string) {
    const res = await fetch('/api/admin-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', notificationId })
    });
    if (!res.ok) throw new Error('Failed to mark notification as read');
    return res.json();
  },

  async confirmMatch(gameId: string, notificationId: string, customTime?: string, reservationInfo?: ReservationInfo) {
    const res = await fetch('/api/admin-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'confirm_match', 
        gameId, 
        notificationId, 
        customTime, 
        reservationInfo 
      })
    });
    if (!res.ok) throw new Error('Failed to confirm match');
    return res.json();
  },

  async createVotingReminder() {
    const res = await fetch('/api/admin-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_voting_reminder' })
    });
    if (!res.ok) throw new Error('Failed to create voting reminder');
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
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState('10:00');
  const [reservationInfo, setReservationInfo] = useState({
    location: '',
    cost: '',
    reservedBy: ''
  });
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
        
        // Only try to load notifications if user is confirmed admin and not in manual mode
        if (isUserAdmin && !manualAdminMode) {
          try {
            const notifications = await apiClient.getAdminNotifications();
            setAdminNotifications(notifications);
          } catch (notificationError) {
            console.error('Error loading notifications:', notificationError);
            setAdminNotifications([]);
          }
        } else {
          setAdminNotifications([]);
        }
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
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
      );
      setUsers(updatedUsers);
      await apiClient.saveUsers(updatedUsers);
      
      if (userId === currentUser?.id) {
        setIsAdmin(!isAdmin);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const removeUser = async (userId: string) => {
    const confirmed = await confirm({
      title: 'Eliminar usuario',
      message: '¿Estás seguro de que quieres eliminar este usuario?',
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    
    if (confirmed) {
      try {
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        await apiClient.saveUsers(updatedUsers);
        success('Usuario eliminado', 'El usuario ha sido eliminado correctamente');
      } catch (err) {
        console.error('Error removing user:', err);
        error('Error al eliminar usuario', 'No se pudo eliminar el usuario');
      }
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

  const sendTestEmail = async () => {
    setIsLoadingEmail(true);
    try {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 7); // Next week

      const emailSuccess = await notificationService.notifyGameCreated(testDate, users.slice(0, 3));
      
      if (emailSuccess) {
        success('Email enviado', 'Email de prueba enviado correctamente');
      } else {
        error('Error al enviar email', 'Verifica tu configuración de Resend.');
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      error('Error al enviar email', 'No se pudo enviar el email de prueba');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const sendGameReminder = async () => {
    setIsLoadingEmail(true);
    try {
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() + 1); // Tomorrow

      const emailSuccess = await notificationService.notifyGameReminder(gameDate, users);
      
      if (emailSuccess) {
        success('Recordatorio enviado', 'Recordatorio enviado a todos los usuarios');
      } else {
        error('Error al enviar recordatorio', 'No se pudo enviar el recordatorio');
      }
    } catch (err) {
      console.error('Error sending reminder:', err);
      error('Error al enviar recordatorio', 'Ocurrió un error inesperado');
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

      const emailSuccess = await notificationService.notifyTeamAssignments(gameDate, team1, team2);
      
      if (emailSuccess) {
        success('Notificación enviada', 'Notificación de equipos enviada');
      } else {
        error('Error al enviar notificación', 'No se pudo enviar la notificación');
      }
    } catch (err) {
      console.error('Error sending team notification:', err);
      error('Error al enviar notificación', 'Ocurrió un error inesperado');
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
        success('Recordatorios enviados', `Recordatorios enviados a ${result.count} usuarios`);
      } else {
        error('Error al enviar recordatorios', result.error);
      }
    } catch (err) {
      console.error('Error sending daily reminders:', err);
      error('Error al enviar recordatorios', 'Ocurrió un error inesperado');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const checkReminderStatus = async () => {
    try {
      const response = await fetch('/api/send-daily-reminders');
      const result = await response.json();
      
      if (response.ok) {
        const statusMessage = `Mes activo: ${result.activeMonth.month}/${result.activeMonth.year}\nUsuarios pendientes: ${result.count}\nNombres: ${result.usersNeedingReminders.map((u: { name: string }) => u.name).join(', ') || 'Ninguno'}`;
        info('Estado de recordatorios', statusMessage);
      } else {
        error('Error al obtener estado', 'No se pudo obtener el estado de recordatorios');
      }
    } catch (err) {
      console.error('Error checking reminder status:', err);
      error('Error al verificar estado', 'Ocurrió un error inesperado');
    }
  };

  const migrateToDatabase = async () => {
    const confirmed = await confirm({
      title: 'Migrar a base de datos',
      message: '¿Migrar todos los datos de LocalStorage a la base de datos Neon? Esta acción no se puede deshacer.',
      type: 'warning',
      confirmText: 'Migrar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;

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
        success('Migración completada', 'Los datos ahora están en la base de datos Neon.');
      } else {
        error('Error en migración', result.error);
      }
    } catch (err) {
      console.error('Error in migration:', err);
      error('Error al ejecutar migración', 'Ocurrió un error inesperado');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleConfirmMatch = async (gameId: string, notificationId: string) => {
    try {
      const reservationData: ReservationInfo = {
        location: reservationInfo.location,
        time: customTime,
        cost: reservationInfo.cost ? parseFloat(reservationInfo.cost) : undefined,
        reservedBy: reservationInfo.reservedBy
      };

      await apiClient.confirmMatch(gameId, notificationId, customTime, reservationData);
      
      // Refresh notifications
      const updatedNotifications = await apiClient.getAdminNotifications();
      setAdminNotifications(updatedNotifications);
      
      setShowConfirmDialog(null);
      setReservationInfo({ location: '', cost: '', reservedBy: '' });
      setCustomTime('10:00');
      
      success('Partido confirmado', 'Por favor, ve a la página de partidos para verificar que se haya confirmado correctamente.');
    } catch (err) {
      console.error('Error confirming match:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error al confirmar partido', `No se pudo confirmar el partido: ${errorMessage}`);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      
      // Refresh notifications
      const updatedNotifications = await apiClient.getAdminNotifications();
      setAdminNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const sendVotingReminders = async () => {
    setIsLoadingEmail(true);
    try {
      await apiClient.createVotingReminder();
      success('Recordatorio creado', 'Recordatorio de votación creado');
      
      // Refresh notifications
      const updatedNotifications = await apiClient.getAdminNotifications();
      setAdminNotifications(updatedNotifications);
    } catch (err) {
      console.error('Error creating voting reminder:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error al crear recordatorio', `No se pudo crear el recordatorio de votación: ${errorMessage}`);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const addMockPlayers = async () => {
    const confirmed = await confirm({
      title: 'Agregar jugadores de prueba',
      message: '¿Agregar 9 jugadores de prueba para testear el sistema de notificaciones?',
      type: 'info',
      confirmText: 'Agregar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;

    setIsLoadingEmail(true);
    try {
      const result = await apiClient.addMockPlayers();
      const playersMessage = `Jugadores agregados:\n${result.players.map((p: MockPlayer) => `• ${p.name} (${p.email})`).join('\n')}`;
      success(result.message, playersMessage);
      
      // Refresh users list
      await refreshUsers();
    } catch (err) {
      console.error('Error adding mock players:', err);
      error('Error al agregar jugadores', 'No se pudieron agregar los jugadores de prueba');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const createTestGame = async () => {
    const confirmed = await confirm({
      title: 'Crear partido de prueba',
      message: '¿Crear un partido de prueba con 10 jugadores para activar las notificaciones de admin?',
      type: 'info',
      confirmText: 'Crear',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;

    setIsLoadingEmail(true);
    try {
      const result = await apiClient.createTestGame(10);
      const gameMessage = `Fecha: ${new Date(result.gameDate).toLocaleDateString('es-ES')}\nParticipantes: ${result.participants}\n\n¡Revisa las notificaciones administrativas!`;
      success(result.message, gameMessage);
      
      // Refresh notifications
      const updatedNotifications = await apiClient.getAdminNotifications();
      setAdminNotifications(updatedNotifications);
    } catch (err) {
      console.error('Error creating test game:', err);
      error('Error al crear partido', 'No se pudo crear el partido de prueba');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const setupDatabase = async () => {
    const confirmed = await confirm({
      title: 'Configurar base de datos',
      message: '¿Configurar las tablas de la base de datos para las nuevas funciones de notificaciones?',
      type: 'info',
      confirmText: 'Configurar',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;

    setIsLoadingEmail(true);
    try {
      const result = await apiClient.setupDatabase();
      success(result.message, "Las tablas 'games' y 'admin_notifications' han sido creadas exitosamente.");
    } catch (err) {
      console.error('Error setting up database:', err);
      error('Error al configurar base de datos', 'No se pudo configurar la base de datos');
    } finally {
      setIsLoadingEmail(false);
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

  const testEmailSystem = async () => {
    setIsLoadingEmail(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (response.ok) {
        const emailTestMessage = `Estado: ${result.emailSent ? 'SUCCESS' : 'FAILED'}\nMensaje: ${result.message}\nAdmins encontrados: ${result.debug.adminCount}\nEmails: ${result.debug.adminEmails.join(', ')}\nResend configurado: ${result.debug.hasResendKey ? 'Sí' : 'No'}\nFrom email: ${result.debug.fromEmail || 'No configurado'}`;
        info('Test de Email', emailTestMessage);
      } else {
        error('Error en test de email', `${result.error}\n${result.details || ''}`);
      }
    } catch (err) {
      console.error('Error testing email system:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error de sistema de emails', `No se pudo probar el sistema de emails: ${errorMessage}`);
    } finally {
      setIsLoadingEmail(false);
    }
  };



  if (!isLoaded) {
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

        {/* Admin Notifications */}
        {adminNotifications.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-r from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Notificaciones Administrativas</h2>
                <p className="text-slate-600 text-sm">Acciones pendientes que requieren tu atención</p>
              </div>
              <div className="ml-auto bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                {adminNotifications.length} pendientes
              </div>
            </div>

            <div className="space-y-4">
              {adminNotifications.map((notification) => (
                <div key={notification.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.type === 'match_ready' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="text-lg">
                          {notification.type === 'match_ready' ? '⚽' : '📊'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {notification.type === 'match_ready' ? 'Partido Listo para Confirmar' : 'Recordatorio de Votación'}
                        </h3>
                        <p className="text-slate-600 text-sm">{notification.message}</p>
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(notification.createdAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {notification.type === 'match_ready' && notification.gameId && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowConfirmDialog(notification.gameId)}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                      >
                        🏟️ Confirmar Partido
                      </button>
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                      >
                        ✓ Marcar como Leído
                      </button>
                    </div>
                  )}

                  {notification.type === 'voting_reminder' && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                    >
                      ✓ Marcar como Leído
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Confirmar Partido</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hora del partido
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={reservationInfo.location}
                    onChange={(e) => setReservationInfo(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej: Cancha Municipal Norte"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Costo (opcional)
                  </label>
                  <input
                    type="number"
                    value={reservationInfo.cost}
                    onChange={(e) => setReservationInfo(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reservado por
                  </label>
                  <input
                    type="text"
                    value={reservationInfo.reservedBy}
                    onChange={(e) => setReservationInfo(prev => ({ ...prev, reservedBy: e.target.value }))}
                    placeholder="Tu nombre"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const notification = adminNotifications.find(n => n.gameId === showConfirmDialog);
                    if (notification) {
                      handleConfirmMatch(showConfirmDialog, notification.id);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  ✅ Confirmar
                </button>
                <button
                  onClick={() => setShowConfirmDialog(null)}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}


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
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
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
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={createTestGame}
              disabled={isLoadingEmail}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingEmail ? '⏳ Creando...' : '⚽ Crear Partido de Prueba (10 jugadores)'}
            </button>
            
            <button
              onClick={testEmailSystem}
              disabled={isLoadingEmail}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoadingEmail ? '⏳ Probando...' : '📧 Probar Sistema de Emails'}
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
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            userData.isAdmin 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {userData.isAdmin ? '✓ Admin' : 'Usuario'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            userData.isWhitelisted 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {userData.isWhitelisted ? '✓ Activo' : '❌ Inactivo'}
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
                            
                            {currentUser && userData.id !== currentUser.id && (
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