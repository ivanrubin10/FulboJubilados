'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { User } from '@/types';

interface GameWithParticipants {
  id: string;
  date: string;
  participants: string[];
  status: string;
  participantDetails: User[];
  result?: {
    team1Score: number;
    team2Score: number;
    notes?: string;
    mvp?: string;
  };
  reservationInfo?: {
    location?: string;
    time?: string;
    cost?: number;
    reservedBy?: string;
    mapsLink?: string;
    paymentAlias?: string;
  };
}
import { getNextAvailableMonth, getCapitalizedMonthYear, getCapitalizedMonthName } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTheme } from '@/contexts/theme-context';
import { 
  Settings, 
  Mail, 
  Vote, 
  Trophy, 
  Calendar, 
  ChevronRight, 
  Users, 
  User as UserIcon,
  Shield, 
  ShieldOff, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  Star
} from 'lucide-react';




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

  async sendTestEmail() {
    const res = await fetch('/api/send-test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to send test email');
    return res.json();
  },

  async sendMvpReminder() {
    const res = await fetch('/api/send-mvp-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to send MVP reminder');
    return res.json();
  }
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentActiveMonth, setCurrentActiveMonth] = useState({ month: 7, year: 2025 });
  const [isLoadingVotingReminder, setIsLoadingVotingReminder] = useState(false);
  const [isLoadingMatchConfirmation, setIsLoadingMatchConfirmation] = useState(false);
  const [isLoadingMvpReminder, setIsLoadingMvpReminder] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [manualAdminMode] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const [showVotingConfirmModal, setShowVotingConfirmModal] = useState(false);
  const [showMatchConfirmModal, setShowMatchConfirmModal] = useState(false);
  const [showMvpReminderModal, setShowMvpReminderModal] = useState(false);
  const [showEmailPreviews, setShowEmailPreviews] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [confirmedGames, setConfirmedGames] = useState<GameWithParticipants[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [latestCompletedGame, setLatestCompletedGame] = useState<GameWithParticipants | null>(null);
  const [selectedMvpParticipants, setSelectedMvpParticipants] = useState<Set<string>>(new Set());

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
        
        // Filter out mock players from admin view
        const realUsers = allUsers.filter((user: User) => !user.id.startsWith('mock_player_'));
        setUsers(realUsers);
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
      // Filter out mock players from admin view
      const realUsers = allUsers.filter((user: User) => !user.id.startsWith('mock_player_'));
      setUsers(realUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
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

  // New functions with confirmation modals
  const handleAdvanceToNextMonth = async () => {
    const nextMonth = getNextAvailableMonth();
    const nextMonthName = getCapitalizedMonthYear(nextMonth.year, nextMonth.month);
    
    const confirmed = await confirm({
      title: 'Confirmar avance de mes',
      message: `¿Estás seguro de que quieres avanzar al mes ${nextMonthName}? Esta acción cambiará el mes que ven todos los usuarios por defecto.`,
      type: 'warning'
    });
    
    if (confirmed) {
      await advanceToNextMonth();
    }
  };

  const handleSetCustomMonth = async () => {
    if (!pendingMonth && !pendingYear) return;
    
    const targetMonth = pendingMonth || currentActiveMonth.month;
    const targetYear = pendingYear || currentActiveMonth.year;
    const targetMonthName = getCapitalizedMonthYear(targetYear, targetMonth);
    
    const confirmed = await confirm({
      title: 'Confirmar cambio de mes',
      message: `¿Estás seguro de que quieres cambiar el mes activo a ${targetMonthName}? Esta acción cambiará el mes que ven todos los usuarios por defecto.`,
      type: 'warning'
    });
    
    if (confirmed) {
      await setCustomMonth(targetMonth, targetYear);
      setPendingMonth(null);
      setPendingYear(null);
    }
  };

  const handleVotingReminderClick = () => {
    setShowVotingConfirmModal(true);
  };

  const sendVotingReminder = async () => {
    setShowVotingConfirmModal(false);
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

  const loadConfirmedGames = async () => {
    try {
      const gamesResponse = await fetch('/api/games');
      const games = await gamesResponse.json();
      
      const usersResponse = await fetch('/api/users');
      const allUsers = await usersResponse.json();
      const userMap = new Map(allUsers.map((user: User) => [user.id, user]));
      
      const confirmedGamesWithParticipants = games
        .filter((game: GameWithParticipants) => 
          game.status === 'confirmed' && 
          game.participants && 
          game.participants.length >= 10
        )
        .map((game: GameWithParticipants) => ({
          ...game,
          participantDetails: game.participants
            .map((participantId: string) => userMap.get(participantId))
            .filter((user): user is User => user !== undefined)
        }));
      
      setConfirmedGames(confirmedGamesWithParticipants);
      
      // Select all participants by default
      const allParticipantIds = new Set<string>();
      confirmedGamesWithParticipants.forEach((game: GameWithParticipants) => {
        game.participantDetails.forEach((participant: User) => {
          allParticipantIds.add(participant.id);
        });
      });
      setSelectedParticipants(allParticipantIds);
      
    } catch (error) {
      console.error('Error loading confirmed games:', error);
    }
  };

  const handleMatchConfirmationClick = async () => {
    await loadConfirmedGames();
    setShowMatchConfirmModal(true);
  };

  const toggleParticipantSelection = (participantId: string) => {
    const newSelection = new Set(selectedParticipants);
    if (newSelection.has(participantId)) {
      newSelection.delete(participantId);
    } else {
      newSelection.add(participantId);
    }
    setSelectedParticipants(newSelection);
  };

  const selectAllParticipants = () => {
    const allParticipantIds = new Set<string>();
    confirmedGames.forEach((game: GameWithParticipants) => {
      game.participantDetails.forEach((participant: User) => {
        allParticipantIds.add(participant.id);
      });
    });
    setSelectedParticipants(allParticipantIds);
  };

  const deselectAllParticipants = () => {
    setSelectedParticipants(new Set());
  };

  const sendMatchConfirmation = async () => {
    setShowMatchConfirmModal(false);
    setIsLoadingMatchConfirmation(true);
    try {
      const selectedParticipantIds = Array.from(selectedParticipants);
      
      const response = await fetch('/api/send-match-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedParticipants: selectedParticipantIds })
      });

      const result = await response.json();
      
      if (response.ok) {
        success('Confirmaciones enviadas', `Confirmaciones de partido enviadas a ${result.count} jugadores seleccionados`);
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

  const sendTestEmail = async () => {
    try {
      const result = await apiClient.sendTestEmail();
      const message = `Emails enviados: ${result.count || 0}\n` +
        `Admins contactados: ${result.adminEmails?.length || 0}\n` +
        (result.adminEmails?.length > 0 ? `Emails: ${result.adminEmails.join(', ')}` : '') +
        (result.errors?.length > 0 ? `\n\nErrores: ${result.errors.join(', ')}` : '');
      
      if (result.success) {
        success('Test Email Enviado', message);
      } else {
        error('Error en Test Email', result.error || 'No se pudo enviar el email de prueba');
      }
    } catch (err) {
      console.error('Error sending test email:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      error('Error de email', `No se pudo enviar el email de prueba: ${errorMessage}`);
    }
  };

  const loadLatestCompletedGame = async () => {
    try {
      const gamesResponse = await fetch('/api/games');
      const games = await gamesResponse.json();
      
      const usersResponse = await fetch('/api/users');
      const allUsers = await usersResponse.json();
      const userMap = new Map(allUsers.map((user: User) => [user.id, user]));
      
      // Find the latest completed game with results
      const completedGamesWithResults = games
        .filter((game: GameWithParticipants) => 
          game.status === 'completed' && 
          game.result && 
          game.participants && 
          game.participants.length > 0
        )
        .sort((a: GameWithParticipants, b: GameWithParticipants) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      if (completedGamesWithResults.length === 0) {
        error('No hay partidos', 'No se encontraron partidos completados con resultados');
        return;
      }

      const latest = completedGamesWithResults[0];
      const gameWithParticipants = {
        ...latest,
        date: new Date(latest.date).toISOString(),
        participantDetails: latest.participants
          .map((participantId: string) => userMap.get(participantId))
          .filter((user: User | undefined): user is User => user !== undefined)
      };

      setLatestCompletedGame(gameWithParticipants);
      
      // Select all participants by default
      const allParticipantIds = new Set<string>(latest.participants);
      setSelectedMvpParticipants(allParticipantIds);
      
    } catch (err) {
      console.error('Error loading latest completed game:', err);
      error('Error al cargar', 'No se pudo cargar el último partido completado');
    }
  };

  const handleMvpReminderClick = async () => {
    await loadLatestCompletedGame();
    setShowMvpReminderModal(true);
  };

  const toggleMvpParticipantSelection = (participantId: string) => {
    const newSelection = new Set(selectedMvpParticipants);
    if (newSelection.has(participantId)) {
      newSelection.delete(participantId);
    } else {
      newSelection.add(participantId);
    }
    setSelectedMvpParticipants(newSelection);
  };

  const selectAllMvpParticipants = () => {
    if (latestCompletedGame) {
      const allParticipantIds = new Set(latestCompletedGame.participants);
      setSelectedMvpParticipants(allParticipantIds);
    }
  };

  const deselectAllMvpParticipants = () => {
    setSelectedMvpParticipants(new Set());
  };

  const sendMvpReminder = async () => {
    setShowMvpReminderModal(false);
    setIsLoadingMvpReminder(true);
    try {
      console.log('[ADMIN] Sending MVP voting reminders to selected participants...');
      const selectedParticipantIds = Array.from(selectedMvpParticipants);
      
      const result = await fetch('/api/send-mvp-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: latestCompletedGame?.id,
          selectedParticipants: selectedParticipantIds 
        })
      });

      const responseData = await result.json();
      console.log('[ADMIN] MVP reminder API response:', responseData);
      
      if (result.ok && responseData.success) {
        const detailMessage = `Partido: ${responseData.gameDate || 'No especificado'}\n` +
                             `Resultado: ${responseData.finalScore || 'No disponible'}\n` +
                             `Emails enviados: ${responseData.successful || 0}\n` +
                             `Emails fallidos: ${responseData.failed || 0}\n` +
                             `Participantes seleccionados: ${responseData.selectedParticipants || selectedParticipantIds.length}`;
        
        success('Recordatorios MVP enviados', detailMessage);
      } else {
        error('Error al enviar recordatorios MVP', responseData.error || 'No se pudieron enviar los recordatorios');
      }
    } catch (err) {
      console.error('Error sending MVP reminders:', err);
      error('Error al enviar recordatorios MVP', 'Ocurrió un error inesperado');
    } finally {
      setIsLoadingMvpReminder(false);
    }
  };


  // Email preview generators
  const generateVotingReminderPreview = () => {
    const monthName = getCapitalizedMonthName(currentActiveMonth.year, currentActiveMonth.month);
    return `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Hola Juan!</h1>
          <p style="margin: 0; opacity: 0.9;">Recordatorio de disponibilidad para ${monthName}</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;">
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1e40af;">📅 Marca tu disponibilidad para ${monthName} ${currentActiveMonth.year}</h2>
            <p style="margin-bottom: 0;">Aún no has marcado qué domingos puedes jugar este mes. ¡Tu participación es importante para organizar los partidos!</p>
          </div>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px;">Marcar Disponibilidad</a>
            <a href="#" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px;">No Puedo Ningún Día</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p>Fulbo Jubilados - Organizando tu diversión dominical</p>
        </div>
      </div>
    `;
  };

  const generateAdminMatchReadyPreview = () => {
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    
    return `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Acción Requerida</h1>
          <p style="margin: 0; opacity: 0.9;">Un partido ha alcanzado 10 jugadores</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;">
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #dc2626;">Partido Listo para Confirmación</h2>
            <p style="margin-bottom: 0;">Un partido para el <strong>${nextSunday.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</strong> ha alcanzado <strong>10 jugadores</strong> y está listo para ser confirmado.</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📋 Detalles del Partido</h3>
            <p><strong>📅 Fecha:</strong> ${nextSunday.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>👥 Jugadores confirmados:</strong> 10</p>
            <p style="margin-bottom: 0;"><strong>⏰ Estado:</strong> Esperando confirmación del administrador</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 16px;">Confirmar Partido Ahora</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p>Fulbo Jubilados - Panel de Administración</p>
        </div>
      </div>
    `;
  };

  const generateMatchConfirmationPreview = () => {
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    
    return `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Hola Juan!</h1>
          <p style="margin: 0; opacity: 0.9;">Tu partido ha sido confirmado</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;">
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #059669;">Partido Confirmado</h2>
            <p style="margin-bottom: 0;">El administrador ha confirmado el partido y ha reservado la cancha. ¡Todo listo para jugar!</p>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📋 Detalles del Partido</h3>
            <p><strong>📅 Fecha:</strong> ${nextSunday.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>🕒 Hora:</strong> 10:00 AM</p>
            <p><strong>📍 Ubicación:</strong> Cancha La Bombonera (<a href="https://maps.google.com" target="_blank" style="color: #10b981; text-decoration: none;">🗺️ Ver en Maps</a>)</p>
            <p><strong>💰 Costo:</strong> ARS $1500</p>
            <p><strong>👤 Reservado por:</strong> Admin Carlos</p>
            <p style="margin-bottom: 0;"><strong>💳 Alias para transferir:</strong> fulbo.admin <span style="color: #059669; font-weight: bold;">(ARS $150 por persona)</span></p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin-right: 10px;">Ver Detalles del Partido</a>
            <a href="#" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold;">📅 Agregar al Calendario</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p>Fulbo Jubilados - ¡Nos vemos en la cancha!</p>
        </div>
      </div>
    `;
  };

  const generateMvpVotingReminderPreview = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    return `
      <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">Hola Juan!</h1>
          <p style="margin: 0; opacity: 0.9;">Partido terminado - Hora de votar MVP y pagar</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;">
          <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="margin-top: 0; color: white;">🏆 Resultado Final</h2>
            <div style="font-size: 2rem; font-weight: bold; color: #10b981;">3 - 2</div>
            <p style="margin-bottom: 0; color: #94a3b8;">Tu equipo: Equipo 1</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📋 Detalles del Partido</h3>
            <p><strong>📅 Fecha:</strong> ${yesterday.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>🕒 Hora:</strong> 10:00 AM</p>
            <p><strong>📍 Ubicación:</strong> Cancha La Bombonera</p>
            <p style="margin-bottom: 0;"><strong>👤 Organizado por:</strong> Admin Carlos</p>
          </div>
          
          <div style="background: #fefce8; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #d97706;">Vota por el MVP</h2>
            <p><strong>¿Quién fue el mejor jugador del partido?</strong></p>
            <p>Tu voto es importante para reconocer al jugador más valioso. La votación es completamente anónima y solo los participantes pueden votar.</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #059669;">💰 Pago del Partido</h2>
            <p><strong>Costo total:</strong> ARS $1500</p>
            <p><strong>Tu parte:</strong> ARS $150 (dividido entre 10 jugadores)</p>
            <p><strong>Transferir a:</strong> <span style="background: #dcfce7; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: bold;">fulbo.admin</span></p>
            <p><strong>Organizado por:</strong> Admin Carlos</p>
          </div>
          
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px; font-size: 16px;">Votar MVP Ahora</a>
            <a href="#" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: bold; margin: 10px 5px; font-size: 16px;">Ver Estadísticas</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px; color: #64748b; font-size: 14px;">
          <p>Fulbo Jubilados - ¡Gracias por jugar!</p>
        </div>
      </div>
    `;
  };

  if (!isLoaded || isLoadingData) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!manualAdminMode && (!currentUser || !isAdmin)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className={`rounded-lg p-6 text-center ${
          theme === 'dark' 
            ? 'bg-red-950/40 border border-red-600/30' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <h1 className={`text-xl font-semibold mb-2 ${
            theme === 'dark' ? 'text-red-300' : 'text-red-800'
          }`}>Acceso Denegado</h1>
          <p className={`mb-4 ${
            theme === 'dark' ? 'text-red-400' : 'text-red-700'
          }`}>
            No tienes permisos de administrador para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen bg-background">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
            }`}>
              <Settings className={`h-6 w-6 ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestiona usuarios, permisos y configuración del sistema</p>
            </div>
          </div>
        </div>

        {/* Admin Notifications */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
            }`}>
              <Mail className={`h-6 w-6 ${
                theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Notificaciones de Jugadores</h2>
              <p className="text-muted-foreground text-sm">Envía recordatorios y confirmaciones a los jugadores</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleVotingReminderClick}
              disabled={isLoadingVotingReminder}
              className="bg-blue-600 dark:bg-blue-700 text-white border border-blue-600 dark:border-blue-700 px-6 py-4 rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 hover:border-blue-700 dark:hover:border-blue-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              onClick={handleMatchConfirmationClick}
              disabled={isLoadingMatchConfirmation}
              className="bg-emerald-600 dark:bg-emerald-700 text-white border border-emerald-600 dark:border-emerald-700 px-6 py-4 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 hover:border-emerald-700 dark:hover:border-emerald-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <button
              onClick={handleMvpReminderClick}
              disabled={isLoadingMvpReminder}
              className="bg-purple-600 dark:bg-purple-700 text-white border border-purple-600 dark:border-purple-700 px-6 py-4 rounded-lg font-medium hover:bg-purple-700 dark:hover:bg-purple-600 hover:border-purple-700 dark:hover:border-purple-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isLoadingMvpReminder ? (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Enviando...
                      </span>
                    ) : 'Recordar MVP'}
                  </div>
                  <div className="text-sm opacity-90">
                    Último partido terminado
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>



        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'
            }`}>
              <Calendar className={`h-6 w-6 ${
                theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestión de Mes Activo</h2>
              <p className="text-muted-foreground text-sm">Controla qué mes ven los usuarios por defecto</p>
            </div>
          </div>
          
          <div className={`rounded-lg p-4 mb-6 ${
            theme === 'dark' 
              ? 'bg-emerald-950/40 border border-emerald-600/30' 
              : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-medium mb-1 ${
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  Mes activo actual:
                </p>
                <p className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-emerald-200' : 'text-emerald-800'
                }`}>
                  {getCapitalizedMonthYear(currentActiveMonth.year, currentActiveMonth.month)}
                </p>
                <p className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  Este es el mes que se muestra por defecto a todos los usuarios
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground min-w-[120px]">Acciones rápidas:</span>
              <button
                onClick={handleAdvanceToNextMonth}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                Avanzar Mes
              </button>
            </div>
            
            {/* Manual Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground sm:min-w-[120px]">Selección manual:</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={pendingMonth || currentActiveMonth.month}
                  onChange={(e) => setPendingMonth(parseInt(e.target.value))}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent flex-1 sm:flex-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {getCapitalizedMonthName(pendingYear || currentActiveMonth.year, i + 1)}
                    </option>
                  ))}
                </select>
                <select
                  value={pendingYear || currentActiveMonth.year}
                  onChange={(e) => setPendingYear(parseInt(e.target.value))}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent flex-1 sm:flex-none"
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                </select>
                <button
                  onClick={handleSetCustomMonth}
                  disabled={!pendingMonth && !pendingYear}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 disabled:bg-accent disabled:cursor-not-allowed flex-1 xs:flex-none"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>


        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 flex-1">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
              }`}>
                <Users className={`h-6 w-6 ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  Usuarios Registrados ({users.length})
                </h2>
                <p className="text-muted-foreground text-sm">Gestiona permisos y usuarios del sistema</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-4 justify-center sm:justify-end">
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-600'
                }`}>{users.filter(u => u.isWhitelisted).length}</div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-500'
                }`}>Jugadores Activos</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-600'
                }`}>{users.filter(u => !u.isWhitelisted).length}</div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-500'
                }`}>Deshabilitados</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                }`}>{users.filter(u => u.isAdmin).length}</div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                }`}>Administradores</div>
              </div>
            </div>
          </div>

          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' 
              ? 'bg-blue-950/40 border border-blue-600/30' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
              }`} />
              <h3 className={`font-bold text-sm ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>Control de Usuarios para Partidos</h3>
            </div>
            <p className={`text-xs leading-relaxed ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
            }`}>
              Solo los usuarios <strong>habilitados</strong> serán contados para la organización de partidos y recibirán recordatorios.
              Usa esto para excluir usuarios de prueba o cuentas temporales.
            </p>
          </div>
        
          {users.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block bg-card rounded-lg overflow-hidden border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Foto</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Nombre</th>
                        <th className="text-left py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Email</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Admin</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Habilitado</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Registro</th>
                        <th className="text-center py-3 px-4 font-semibold text-foreground text-sm whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(userData => (
                        <tr key={userData.id} className="border-b border-border hover:bg-background transition-colors">
                          <td className="py-3 px-4">
                            {userData.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={userData.imageUrl} 
                                alt={userData.name}
                                className="w-8 h-8 rounded-full border-2 border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border-2 border-border">
                                <span className="text-muted-foreground text-xs font-bold">
                                  {userData.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                      </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{userData.name}</p>
                              {userData.nickname && (
                                <p className="text-xs text-muted-foreground">@{userData.nickname}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">{userData.email}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              userData.isAdmin 
                                ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-300 border border-blue-600/30' : 'bg-blue-100 text-blue-700 border border-blue-200')
                                : 'bg-accent/20 text-muted-foreground border border-border'
                            }`}>
                              {userData.isAdmin ? (
                                <>
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </>
                              ) : (
                                <>
                                  <UserIcon className="h-3 w-3" />
                                  Usuario
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              userData.isWhitelisted 
                                ? (theme === 'dark' ? 'bg-green-900/40 text-green-300 border border-green-600/30' : 'bg-green-100 text-green-700 border border-green-200') 
                                : (theme === 'dark' ? 'bg-red-900/40 text-red-300 border border-red-600/30' : 'bg-red-100 text-red-700 border border-red-200')
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
                          <td className="py-3 px-4 text-center text-muted-foreground font-medium text-sm">
                            {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={() => toggleAdminStatus(userData.id)}
                                className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all w-[100px] whitespace-nowrap ${
                                  userData.isAdmin
                                    ? (theme === 'dark' ? 'bg-red-900/40 text-red-300 hover:bg-red-800/40 border border-red-600/30' : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 hover:border-red-300')
                                    : (theme === 'dark' ? 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 border border-blue-600/30 hover:border-blue-500/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 hover:border-blue-300')
                                }`}
                              >
                                {userData.isAdmin ? (
                                  <>
                                    <ShieldOff className="h-3 w-3" />
                                    Sacar Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-3 w-3" />
                                    Dar Admin
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => toggleUserWhitelist(userData.id)}
                                className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all w-[100px] whitespace-nowrap ${
                                  userData.isWhitelisted
                                    ? (theme === 'dark' ? 'bg-red-900/40 text-red-300 hover:bg-red-800/40 border border-red-600/30' : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 hover:border-red-300')
                                    : (theme === 'dark' ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-600/30 hover:border-emerald-500/50' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 hover:border-emerald-300')
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

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden space-y-4">
                {users.map(userData => (
                  <div key={userData.id} className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {userData.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={userData.imageUrl} 
                          alt={userData.name}
                          className="w-10 h-10 rounded-full border-2 border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-border flex-shrink-0">
                          <span className="text-muted-foreground text-sm font-bold">
                            {userData.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm truncate">{userData.name}</h3>
                        {userData.nickname && (
                          <p className="text-xs text-muted-foreground">@{userData.nickname}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Estado Admin</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          userData.isAdmin 
                            ? (theme === 'dark' ? 'bg-blue-900/40 text-blue-300 border border-blue-600/30' : 'bg-blue-100 text-blue-700 border border-blue-200')
                            : 'bg-accent/20 text-muted-foreground border border-border'
                        }`}>
                          {userData.isAdmin ? (
                            <>
                              <Shield className="h-3 w-3" />
                              Admin
                            </>
                          ) : (
                            <>
                              <UserIcon className="h-3 w-3" />
                              Usuario
                            </>
                          )}
                        </span>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Estado Usuario</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          userData.isWhitelisted 
                            ? (theme === 'dark' ? 'bg-green-900/40 text-green-300 border border-green-600/30' : 'bg-green-100 text-green-700 border border-green-200')
                            : (theme === 'dark' ? 'bg-red-900/40 text-red-300 border border-red-600/30' : 'bg-red-100 text-red-700 border border-red-200')
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
                      </div>
                    </div>
                    
                    <div className="text-center mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Fecha de Registro</p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdminStatus(userData.id)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 whitespace-nowrap min-w-0 ${
                          userData.isAdmin
                            ? (theme === 'dark' ? 'bg-red-900/40 text-red-300 hover:bg-red-800/40 border border-red-600/30' : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 hover:border-red-300')
                            : (theme === 'dark' ? 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 border border-blue-600/30 hover:border-blue-500/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 hover:border-blue-300')
                        }`}
                      >
                        {userData.isAdmin ? (
                          <>
                            <ShieldOff className="h-4 w-4" />
                            Sacar Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4" />
                            Dar Admin
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => toggleUserWhitelist(userData.id)}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 whitespace-nowrap min-w-0 ${
                          userData.isWhitelisted
                            ? 'bg-red-900/40 text-red-300 hover:bg-red-800/40 border border-red-600/30'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {userData.isWhitelisted ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            Deshabilitar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Habilitar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-base font-medium">
                No hay usuarios registrados
              </p>
            </div>
          )}
        </div>

        {/* Email Previews Section */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-indigo-900/40' : 'bg-indigo-100'
              }`}>
                <Eye className={`h-6 w-6 ${
                  theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'
                }`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Vista Previa de Emails</h2>
                <p className="text-muted-foreground">Mira cómo se ven los 3 tipos de emails del sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowEmailPreviews(!showEmailPreviews)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-600/30' 
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {showEmailPreviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showEmailPreviews ? 'Ocultar' : 'Ver Previews'}
            </button>
          </div>

          {showEmailPreviews && (
            <div className="space-y-4">
              {/* Voting Reminder Email */}
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setExpandedEmail(expandedEmail === 'voting' ? null : 'voting')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
                    }`}>
                      <Vote className={`h-4 w-4 ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">🗳️ Recordatorio de Votación</h3>
                      <p className="text-sm text-muted-foreground">Email enviado manualmente a usuarios que no han votado</p>
                    </div>
                  </div>
                  {expandedEmail === 'voting' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedEmail === 'voting' && (
                  <div className="border-t border-border p-4 bg-background">
                    <div 
                      className="border border-border rounded-lg bg-card"
                      dangerouslySetInnerHTML={{ __html: generateVotingReminderPreview() }}
                    />
                  </div>
                )}
              </div>

              {/* Admin Match Ready Email */}
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setExpandedEmail(expandedEmail === 'admin' ? null : 'admin')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-red-900/40' : 'bg-red-100'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        theme === 'dark' ? 'text-red-300' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">🚨 Alerta para Admins</h3>
                      <p className="text-sm text-muted-foreground">Email automático cuando un partido alcanza 10 jugadores</p>
                    </div>
                  </div>
                  {expandedEmail === 'admin' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedEmail === 'admin' && (
                  <div className="border-t border-border p-4 bg-background">
                    <div 
                      className="border border-border rounded-lg bg-card"
                      dangerouslySetInnerHTML={{ __html: generateAdminMatchReadyPreview() }}
                    />
                  </div>
                )}
              </div>

              {/* Match Confirmation Email */}
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setExpandedEmail(expandedEmail === 'match' ? null : 'match')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'
                    }`}>
                      <Trophy className={`h-4 w-4 ${
                        theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">⚽ Confirmación de Partido</h3>
                      <p className="text-sm text-muted-foreground">Email enviado manualmente a jugadores confirmados</p>
                    </div>
                  </div>
                  {expandedEmail === 'match' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedEmail === 'match' && (
                  <div className="border-t border-border p-4 bg-background">
                    <div 
                      className="border border-border rounded-lg bg-card"
                      dangerouslySetInnerHTML={{ __html: generateMatchConfirmationPreview() }}
                    />
                  </div>
                )}
              </div>

              {/* MVP Voting Reminder Email */}
              <div className="border border-border rounded-lg">
                <button
                  onClick={() => setExpandedEmail(expandedEmail === 'mvp' ? null : 'mvp')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                    }`}>
                      <Star className={`h-4 w-4 ${
                        theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">⭐ Recordatorio MVP y Pago</h3>
                      <p className="text-sm text-muted-foreground">Email automático/manual después de completar un partido</p>
                    </div>
                  </div>
                  {expandedEmail === 'mvp' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedEmail === 'mvp' && (
                  <div className="border-t border-border p-4 bg-background">
                    <div 
                      className="border border-border rounded-lg bg-card"
                      dangerouslySetInnerHTML={{ __html: generateMvpVotingReminderPreview() }}
                    />
                  </div>
                )}
              </div>

              <div className={`rounded-lg p-4 mt-4 ${
                theme === 'dark' 
                  ? 'bg-blue-950/40 border border-blue-600/30' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
                  }`}>
                    <Mail className={`h-4 w-4 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                    }`}>Sobre los Emails</h4>
                    <div className={`text-sm space-y-1 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                    }`}>
                      <p>• <strong>Recordatorio de Votación:</strong> Enviado manualmente desde este panel a usuarios específicos</p>
                      <p>• <strong>Alerta para Admins:</strong> Enviado automáticamente cuando un partido alcanza 10 jugadores</p>
                      <p>• <strong>Confirmación de Partido:</strong> Enviado manualmente desde este panel a jugadores confirmados</p>
                      <p>• <strong>Recordatorio MVP y Pago:</strong> Enviado automáticamente al completar un partido o manualmente desde este panel</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Tools */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-indigo-900/40' : 'bg-indigo-100'
            }`}>
              <Settings className={`h-6 w-6 ${
                theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Herramientas de Administración</h2>
              <p className="text-muted-foreground text-sm">Utilidades para mantener el sistema</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={sendTestEmail}
              className="bg-green-600 text-white border border-green-600 px-6 py-4 rounded-lg font-medium hover:bg-green-700 hover:border-green-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-semibold">📧 Test Email</div>
                  <div className="text-sm opacity-90">
                    Enviar email de prueba a admins
                  </div>
                </div>
              </div>
            </button>
            
            <button
              onClick={testConnection}
              className="bg-gray-600 text-white border border-gray-600 px-6 py-4 rounded-lg font-medium hover:bg-gray-700 hover:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <div className="font-semibold">🔍 Test Conexión</div>
                  <div className="text-sm opacity-90">
                    Verificar estado del sistema
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className={`rounded-lg p-6 mt-8 ${
          theme === 'dark' 
            ? 'bg-orange-950/40 border border-orange-600/30' 
            : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-orange-900/40' : 'bg-orange-100'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                theme === 'dark' ? 'text-orange-300' : 'text-orange-600'
              }`} />
            </div>
            <h3 className={`font-bold ${
              theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
            }`}>Nota Importante</h3>
          </div>
          <p className={`leading-relaxed ${
            theme === 'dark' ? 'text-orange-400' : 'text-orange-700'
          }`}>
            Los permisos de administrador permiten gestionar usuarios, crear partidos, organizar equipos y registrar resultados. 
            Ten cuidado al otorgar estos permisos ya que dan acceso completo al sistema.
          </p>
        </div>

        {/* Voting Reminder Confirmation Modal */}
        {showVotingConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
                }`}>
                  <Vote className={`h-6 w-6 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Confirmar Envío</h3>
                  <p className="text-sm text-muted-foreground">Recordatorios de votación</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                ¿Estás seguro que querés enviar recordatorios de votación a todos los usuarios que aún no han votado para el mes activo?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowVotingConfirmModal(false)}
                  className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendVotingReminder}
                  disabled={isLoadingVotingReminder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Enviar Recordatorios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Match Confirmation Modal */}
        {showMatchConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-emerald-900/40' : 'bg-emerald-100'
                }`}>
                  <Trophy className={`h-6 w-6 ${
                    theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Seleccionar Participantes</h3>
                  <p className="text-sm text-muted-foreground">Confirmaciones de partido</p>
                </div>
              </div>

              {confirmedGames.length === 0 ? (
                <p className="text-muted-foreground mb-6">
                  No hay partidos confirmados con participantes para enviar notificaciones.
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">
                    Selecciona los participantes que recibirán la confirmación del partido:
                  </p>

                  {/* Selection Controls */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={selectAllParticipants}
                      className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      onClick={deselectAllParticipants}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Deseleccionar Todos
                    </button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {selectedParticipants.size} participantes seleccionados
                    </span>
                  </div>

                  {/* Games and Participants */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {confirmedGames.map((game: GameWithParticipants) => (
                      <div key={game.id} className="border border-border rounded-lg p-4">
                        <h4 className="font-semibold text-foreground mb-2">
                          🏆 Partido {new Date(game.date).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {game.participantDetails.map((participant: User) => (
                            <label
                              key={participant.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                selectedParticipants.has(participant.id)
                                  ? (theme === 'dark' ? 'bg-emerald-950/40 border-emerald-600/30' : 'bg-emerald-50 border-emerald-200')
                                  : 'border-border hover:bg-background'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedParticipants.has(participant.id)}
                                onChange={() => toggleParticipantSelection(participant.id)}
                                className="rounded border-border"
                              />
                              {participant.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={participant.imageUrl} 
                                  alt={participant.name}
                                  className="w-6 h-6 rounded-full border border-border"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center border border-border">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {participant.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {participant.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMatchConfirmModal(false)}
                  className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendMatchConfirmation}
                  disabled={isLoadingMatchConfirmation || selectedParticipants.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar a {selectedParticipants.size} Participantes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MVP Reminder Modal */}
        {showMvpReminderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                }`}>
                  <Star className={`h-6 w-6 ${
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Seleccionar Participantes</h3>
                  <p className="text-sm text-muted-foreground">Recordatorio MVP y Pago</p>
                </div>
              </div>

              {!latestCompletedGame ? (
                <p className="text-muted-foreground mb-6">
                  No hay partidos completados con resultados para enviar recordatorios MVP.
                </p>
              ) : (
                <>
                  <div className={`rounded-lg p-4 mb-4 ${
                    theme === 'dark' 
                      ? 'bg-purple-950/40 border border-purple-600/30' 
                      : 'bg-purple-50 border border-purple-200'
                  }`}>
                    <h4 className="font-semibold text-foreground mb-2">
                      🏆 Último Partido Completado
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Fecha:</strong> {new Date(latestCompletedGame.date).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Participantes:</strong> {latestCompletedGame.participants.length} jugadores
                    </p>
                    {latestCompletedGame.reservationInfo?.location && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Ubicación:</strong> {latestCompletedGame.reservationInfo.location}
                      </p>
                    )}
                  </div>

                  <p className="text-muted-foreground mb-4">
                    Selecciona los participantes que recibirán el recordatorio para votar MVP y pagar:
                  </p>

                  {/* Selection Controls */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={selectAllMvpParticipants}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      onClick={deselectAllMvpParticipants}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Deseleccionar Todos
                    </button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {selectedMvpParticipants.size} participantes seleccionados
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="border border-border rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                    <h4 className="font-semibold text-foreground mb-3">
                      👥 Participantes del Partido
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {latestCompletedGame.participantDetails.map((participant: User) => (
                        <label
                          key={participant.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedMvpParticipants.has(participant.id)
                              ? (theme === 'dark' ? 'bg-purple-950/40 border-purple-600/30' : 'bg-purple-50 border-purple-200')
                              : 'border-border hover:bg-background'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMvpParticipants.has(participant.id)}
                            onChange={() => toggleMvpParticipantSelection(participant.id)}
                            className="rounded border-border"
                          />
                          {participant.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={participant.imageUrl} 
                              alt={participant.name}
                              className="w-6 h-6 rounded-full border border-border"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center border border-border">
                              <span className="text-xs font-bold text-muted-foreground">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {participant.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowMvpReminderModal(false)}
                  className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={sendMvpReminder}
                  disabled={isLoadingMvpReminder || selectedMvpParticipants.size === 0 || !latestCompletedGame}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Enviar a {selectedMvpParticipants.size} Participantes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}