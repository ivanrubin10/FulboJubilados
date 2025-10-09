'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSundaysInMonth, formatDate, generateTeams, getCapitalizedMonthYear } from '@/lib/utils';
import { Game, User, MonthlyAvailability, MvpResults } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTheme } from '@/contexts/theme-context';
import { Calendar, Ban, Trophy, Users, Edit3, X, Star, Crown } from 'lucide-react';

// API helper functions
const apiClient = {
  async getUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  
  async getGames() {
    const res = await fetch('/api/games', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) throw new Error('Failed to fetch games');
    return res.json();
  },
  
  async getMonthlyAvailability() {
    const res = await fetch('/api/availability?type=monthly');
    if (!res.ok) throw new Error('Failed to fetch availability');
    return res.json();
  },
  
  async saveGames(games: Game[]) {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(games)
    });
    if (!res.ok) throw new Error('Failed to save games');
    return res.json();
  },

  async voteMVP(gameId: string, votedForId: string) {
    console.log('Submitting MVP vote:', { gameId, votedForId });
    
    const res = await fetch(`/api/games/${gameId}/mvp/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votedForId })
    });
    
    console.log('MVP vote response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('MVP vote error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || 'Failed to submit MVP vote');
      } catch {
        throw new Error(`HTTP ${res.status}: ${errorText || 'Failed to submit MVP vote'}`);
      }
    }
    
    return res.json();
  },

  async getMVPResults(gameId: string): Promise<MvpResults> {
    const res = await fetch(`/api/games/${gameId}/mvp/results`);
    if (!res.ok) throw new Error('Failed to fetch MVP results');
    return res.json();
  },

  async finalizeMVP(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/mvp/finalize`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to finalize MVP');
    return res.json();
  },

  async checkVoteStatus(gameId: string) {
    const res = await fetch(`/api/games/${gameId}/mvp/voted`);
    if (!res.ok) throw new Error('Failed to check vote status');
    return res.json();
  },

};

interface EditGameModal {
  game: Game;
  onSave: (updatedGame: Game) => Promise<void>;
  onClose: () => void;
  users: User[];
}

function EditGameModal({ game, onSave, onClose, users }: EditGameModal) {
  const { theme } = useTheme();
  const { success } = useToast();
  const { confirm } = useConfirm();
  const [editedGame, setEditedGame] = useState<Game>({ ...game });
  const [isSaving, setIsSaving] = useState(false);
  const [reservationInfo, setReservationInfo] = useState({
    location: game.reservationInfo?.location || '',
    time: game.reservationInfo?.time || '10:00',
    cost: game.reservationInfo?.cost?.toString() || '',
    reservedBy: game.reservationInfo?.reservedBy || '',
    mapsLink: game.reservationInfo?.mapsLink || '',
    paymentAlias: game.reservationInfo?.paymentAlias || ''
  });

  // Effect to handle status changes and offer to clear reservation data
  useEffect(() => {
    // If status changes from confirmed to scheduled and we have reservation data, ask if they want to clear it
    if (editedGame.status === 'scheduled' &&
        game.status === 'confirmed' &&
        reservationInfo.location &&
        reservationInfo.location.trim() !== '') {

      const shouldClear = window.confirm(
        'Has cambiado el estado de "Confirmado" a "Programado". ¿Quieres limpiar la información de reserva también?'
      );

      if (shouldClear) {
        setReservationInfo({
          location: '',
          time: '10:00',
          cost: '',
          reservedBy: '',
          mapsLink: '',
          paymentAlias: ''
        });
      }
    }
  }, [editedGame.status, game.status, reservationInfo.location]);

  const handleSave = async () => {
    if (isSaving) return; // Prevent double-clicks

    setIsSaving(true);
    try {
      // Check if reservation info has meaningful data (location is required for reservation)
      const hasReservationData = reservationInfo.location && reservationInfo.location.trim() !== '';

      const updatedGame: Game = {
        ...editedGame,
        participants: game.participants, // Keep original participants - no selection needed
        reservationInfo: hasReservationData ? {
          location: reservationInfo.location.trim(),
          time: reservationInfo.time,
          cost: reservationInfo.cost && reservationInfo.cost.trim() !== '' ? parseFloat(reservationInfo.cost) : undefined,
          reservedBy: reservationInfo.reservedBy?.trim() || 'Administrador',
          mapsLink: reservationInfo.mapsLink && reservationInfo.mapsLink.trim() !== '' ? reservationInfo.mapsLink.trim() : undefined,
          paymentAlias: reservationInfo.paymentAlias && reservationInfo.paymentAlias.trim() !== '' ? reservationInfo.paymentAlias.trim() : undefined
        } : undefined,
        updatedAt: new Date()
      };

      await onSave(updatedGame);
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateTeams = () => {
    const newTeams = generateTeams(game.participants);
    setEditedGame(prev => ({ ...prev, teams: newTeams }));
  };

  const undoTeamsToOriginal = () => {
    if (game.originalTeams) {
      setEditedGame(prev => ({ ...prev, teams: game.originalTeams }));
    }
  };

  const swapPlayerBetweenTeams = (playerId: string) => {
    if (!editedGame.teams) return;
    
    const isInTeam1 = editedGame.teams.team1.includes(playerId);
    const newTeams = {
      team1: isInTeam1 
        ? editedGame.teams.team1.filter(id => id !== playerId)
        : [...editedGame.teams.team1, playerId],
      team2: isInTeam1 
        ? [...editedGame.teams.team2, playerId]
        : editedGame.teams.team2.filter(id => id !== playerId)
    };
    setEditedGame(prev => ({ ...prev, teams: newTeams }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">Editar Partido</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-2xl"
            >
              ×
            </button>
          </div>

          {/* Game Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">Estado del Partido</label>
            <select
              value={editedGame.status}
              onChange={(e) => setEditedGame(prev => ({ ...prev, status: e.target.value as Game['status'] }))}
              className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
            >
              <option value="scheduled">Programado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Reservation Information */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-foreground">Información de Reserva</h3>
              <button
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Limpiar Reserva',
                    message: '¿Estás seguro de que quieres limpiar toda la información de reserva? Esta acción no se puede deshacer.',
                    confirmText: 'Limpiar',
                    cancelText: 'Cancelar',
                    type: 'danger'
                  });

                  if (confirmed) {
                    setReservationInfo({
                      location: '',
                      time: '10:00',
                      cost: '',
                      reservedBy: '',
                      mapsLink: '',
                      paymentAlias: ''
                    });
                    success('Información limpiada', 'La información de reserva ha sido limpiada. Recuerda guardar los cambios.');
                  }
                }}
                className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
              >
                Limpiar Reserva
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Lugar</label>
                <input
                  type="text"
                  value={reservationInfo.location}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ej: Cancha Municipal"
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Hora</label>
                <input
                  type="time"
                  value={reservationInfo.time}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Costo ARS (opcional)</label>
                <input
                  type="number"
                  value={reservationInfo.cost}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Reservado por</label>
                <input
                  type="text"
                  value={reservationInfo.reservedBy}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, reservedBy: e.target.value }))}
                  placeholder="Nombre de quien reservó"
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Google Maps (opcional)</label>
                <input
                  type="url"
                  value={reservationInfo.mapsLink}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, mapsLink: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Alias para Transferencia (opcional)</label>
                <input
                  type="text"
                  value={reservationInfo.paymentAlias}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, paymentAlias: e.target.value }))}
                  placeholder="Ej: fulbo.admin"
                  className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
            </div>
          </div>

          {/* Team Organization */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Organización de Equipos ({game.participants.length} jugadores)
              </h3>
              <div className="flex flex-wrap gap-2">
                {game.originalTeams && (
                  <button
                    onClick={undoTeamsToOriginal}
                    className="bg-orange-600 dark:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">↶ Volver a Original</span>
                    <span className="sm:hidden">↶ Original</span>
                  </button>
                )}
                <button
                  onClick={regenerateTeams}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">🎲 Regenerar Equipos (Aleatorio)</span>
                  <span className="sm:hidden">🎲 Regenerar</span>
                </button>
              </div>
            </div>
            
            {editedGame.teams ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-red-950/20 border-red-800/30' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-800'
                    }`}>
                      🔴 Equipo 1 ({editedGame.teams.team1.length} jugadores)
                    </h4>
                    {editedGame.teams.team1.map(playerId => {
                      const player = users.find(u => u.id === playerId);
                      return (
                        <div key={playerId} className="flex justify-between items-center py-1">
                          <span className={theme === 'dark' ? 'text-red-400' : 'text-red-700'}>{player?.nickname || player?.name}</span>
                          <button
                            onClick={() => swapPlayerBetweenTeams(playerId)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-blue-950/20 border-blue-800/30' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-800'
                    }`}>
                      🔵 Equipo 2 ({editedGame.teams.team2.length} jugadores)
                    </h4>
                    {editedGame.teams.team2.map(playerId => {
                      const player = users.find(u => u.id === playerId);
                      return (
                        <div key={playerId} className="flex justify-between items-center py-1">
                          <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}>{player?.nickname || player?.name}</span>
                          <button
                            onClick={() => swapPlayerBetweenTeams(playerId)}
                            className="text-xs bg-red-500 dark:bg-red-600 text-white px-2 py-1 rounded hover:bg-red-600 dark:hover:bg-red-500"
                          >
                            ←
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={`mt-4 p-3 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className={`text-sm flex items-center gap-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-blue-700'
                  }`}>
                    💡 <strong>Tip:</strong> Usa las flechas (→ ←) para intercambiar jugadores entre equipos
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-accent/20 p-6 rounded-lg text-center">
                <p className="text-muted-foreground mb-4">
                  ⚽ Los equipos aún no han sido generados
                </p>
                <p className="text-sm text-muted-foreground">
                  Haz clic en &quot;🎲 Regenerar Equipos (Aleatorio)&quot; para crear equipos balanceados automáticamente
                </p>
              </div>
            )}
          </div>

          {/* Match Result Section */}
          {editedGame.status === 'completed' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-foreground">Resultado del Partido</h3>
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Limpiar Resultado',
                      message: '¿Estás seguro de que quieres limpiar el resultado del partido? Esta acción no se puede deshacer.',
                      confirmText: 'Limpiar',
                      cancelText: 'Cancelar',
                      type: 'danger'
                    });

                    if (confirmed) {
                      setEditedGame(prev => ({ ...prev, result: undefined }));
                      success('Resultado limpiado', 'El resultado del partido ha sido limpiado. Recuerda guardar los cambios.');
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
                >
                  Limpiar Resultado
                </button>
              </div>
              <div className="bg-accent/20 p-4 rounded-lg">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Goles Equipo 1 {editedGame.teams && `(${editedGame.teams.team1.map(id => users.find(u => u.id === id)?.nickname || users.find(u => u.id === id)?.name).join(', ')})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editedGame.result?.team1Score ?? ''}
                      onChange={(e) => setEditedGame(prev => ({
                        ...prev,
                        result: {
                          ...prev.result,
                          team1Score: parseInt(e.target.value) || 0,
                          team2Score: prev.result?.team2Score ?? 0,
                          notes: prev.result?.notes
                        }
                      }))}
                      placeholder="0"
                      className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Goles Equipo 2 {editedGame.teams && `(${editedGame.teams.team2.map(id => users.find(u => u.id === id)?.nickname || users.find(u => u.id === id)?.name).join(', ')})`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editedGame.result?.team2Score ?? ''}
                      onChange={(e) => setEditedGame(prev => ({
                        ...prev,
                        result: {
                          ...prev.result,
                          team1Score: prev.result?.team1Score ?? 0,
                          team2Score: parseInt(e.target.value) || 0,
                          notes: prev.result?.notes
                        }
                      }))}
                      placeholder="0"
                      className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div className="flex items-end">
                    {editedGame.result && (
                      <div className="text-center p-2 bg-card rounded-lg border border-border">
                        <div className="text-2xl font-bold text-foreground">
                          {editedGame.result.team1Score} - {editedGame.result.team2Score}
                        </div>
                        <div className="text-xs text-muted-foreground">Resultado</div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Notas (opcional)</label>
                  <textarea
                    value={editedGame.result?.notes ?? ''}
                    onChange={(e) => setEditedGame(prev => ({
                      ...prev,
                      result: {
                        ...prev.result,
                        team1Score: prev.result?.team1Score ?? 0,
                        team2Score: prev.result?.team2Score ?? 0,
                        notes: e.target.value || undefined
                      }
                    }))}
                    placeholder="Ej: Partido muy reñido, gran actuación de Juan..."
                    rows={3}
                    className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ParticipantManagementModalProps {
  game: Game;
  users: User[];
  onSave: (updatedGame: Game) => void;
  onClose: () => void;
}

function ParticipantManagementModal({ game, users, onSave, onClose }: ParticipantManagementModalProps) {
  const { theme } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // State management for participants and waitlist
  const [participants, setParticipants] = useState<string[]>(game.participants || []);
  const [waitlist, setWaitlist] = useState<string[]>(game.waitlist || []);
  
  // Get all players currently in the game (participants + waitlist)
  const allGamePlayers = [...participants, ...waitlist];
  const gameParticipants = participants.slice(0, 10);
  const waitlistPlayers = waitlist;
  
  // Get current team assignments
  const [team1Players, setTeam1Players] = useState<string[]>(game.teams?.team1 || []);
  const [team2Players, setTeam2Players] = useState<string[]>(game.teams?.team2 || []);
  const [confirmRemoveModal, setConfirmRemoveModal] = useState<{isOpen: boolean, playerId: string, playerName: string}>({isOpen: false, playerId: '', playerName: ''});
  
  // Helper function to get player display info
  const getPlayerInfo = (playerId: string) => {
    const player = users.find(u => u.id === playerId);
    const isPlayerInGame = allGamePlayers.includes(playerId);
    return {
      id: playerId,
      name: player?.nickname || player?.name || 'Jugador desconocido',
      imageUrl: player?.imageUrl,
      isPlayerInGame,
      isValid: isPlayerInGame // Player should be in the game to be valid in teams
    };
  };

  // Remove player from teams
  const removeFromTeams = (playerId: string) => {
    setTeam1Players(prev => prev.filter(id => id !== playerId));
    setTeam2Players(prev => prev.filter(id => id !== playerId));
  };

  // Remove player from match completely (participants + waitlist + teams)
  const removeFromMatch = (playerId: string) => {
    // Remove from participants and waitlist
    setParticipants(prev => prev.filter(id => id !== playerId));
    setWaitlist(prev => prev.filter(id => id !== playerId));
    
    // Also remove from teams
    removeFromTeams(playerId);
  };

  // Add player to team
  const addToTeam = (playerId: string, teamNumber: 1 | 2) => {
    // First remove from any existing team
    removeFromTeams(playerId);
    
    // Then add to the specified team
    if (teamNumber === 1) {
      setTeam1Players(prev => [...prev, playerId]);
    } else {
      setTeam2Players(prev => [...prev, playerId]);
    }
  };

  // Handle confirmed removal from match
  const handleConfirmRemoveFromMatch = async () => {
    if (confirmRemoveModal.playerId) {
      await removeFromMatch(confirmRemoveModal.playerId);
      setConfirmRemoveModal({isOpen: false, playerId: '', playerName: ''});
    }
  };

  // Clean up teams - remove invalid players
  const cleanupTeams = async () => {
    const validPlayers = new Set(allGamePlayers);
    const newTeam1 = team1Players.filter(id => validPlayers.has(id));
    const newTeam2 = team2Players.filter(id => validPlayers.has(id));
    
    setTeam1Players(newTeam1);
    setTeam2Players(newTeam2);
    
    // Save changes to database
    await saveChanges();
  };

  // Undo teams to original state
  const undoTeamsToOriginal = async () => {
    if (game.originalTeams) {
      setTeam1Players(game.originalTeams.team1);
      setTeam2Players(game.originalTeams.team2);
      // Save changes to database
      await saveChanges();
    }
  };

  // Sync match participants with actual voters for this day
  const syncWithVoters = async () => {
    setIsUpdating(true);
    
    try {
      const gameDate = new Date(game.date);
      const month = gameDate.getMonth() + 1;
      const year = gameDate.getFullYear();
      const day = gameDate.getDate();
      
      // Fetch monthly availability for this month
      const availabilityRes = await fetch(`/api/availability/month?month=${month}&year=${year}`);
      if (!availabilityRes.ok) {
        throw new Error('Failed to fetch availability data');
      }
      
      const availabilityData = await availabilityRes.json();
      
      // Get players who voted as available for this specific day
      const votersForThisDay = availabilityData
        .filter((av: MonthlyAvailability) => av.availableSundays.includes(day) && av.hasVoted)
        .map((av: MonthlyAvailability) => av.userId)
        .filter((userId: string) => {
          // Only include whitelisted users
          const user = users.find(u => u.id === userId);
          return user?.isWhitelisted;
        });
      
      // Sort by voting timestamp if available, otherwise maintain current order
      const sortedVoters = votersForThisDay.sort((a: string, b: string) => {
        const aData = availabilityData.find((av: MonthlyAvailability) => av.userId === a);
        const bData = availabilityData.find((av: MonthlyAvailability) => av.userId === b);
        
        if (aData?.votedAt && bData?.votedAt) {
          return new Date(aData.votedAt).getTime() - new Date(bData.votedAt).getTime();
        }
        return 0;
      });
      
      // Update participants (first 10) and waitlist (rest)
      const newParticipants = sortedVoters.slice(0, 10);
      const newWaitlist = sortedVoters.slice(10);
      
      setParticipants(newParticipants);
      setWaitlist(newWaitlist);
      
      // Clean up teams to only include players who are now in the match
      const allNewGamePlayers = new Set([...newParticipants, ...newWaitlist]);
      setTeam1Players(prev => prev.filter(id => allNewGamePlayers.has(id)));
      setTeam2Players(prev => prev.filter(id => allNewGamePlayers.has(id)));
      
      console.log(`🔄 Synced match with ${sortedVoters.length} voters for ${day}/${month}/${year}`);
    } catch (error) {
      console.error('Error syncing with voters:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Save all changes (participants, waitlist, teams)
  const saveChanges = async () => {
    setIsUpdating(true);

    try {
      const updatedTeams = {
        team1: team1Players,
        team2: team2Players
      };

      // Sync participants with team members
      // All players in teams should be in participants
      const allTeamPlayers = [...team1Players, ...team2Players];
      const syncedParticipants = [...new Set([...participants, ...allTeamPlayers])];

      // Remove any participants who were removed from the match
      const finalParticipants = syncedParticipants.filter(playerId =>
        participants.includes(playerId)
      );

      const updateData = {
        participants: finalParticipants,
        waitlist,
        teams: updatedTeams
      };

      const updatedGame: Game = {
        ...game,
        participants: finalParticipants,
        waitlist,
        teams: updatedTeams,
        updatedAt: new Date()
      };

      console.log('💾 Saving game with synced participants:', {
        originalParticipants: participants.length,
        finalParticipants: finalParticipants.length,
        team1: team1Players.length,
        team2: team2Players.length
      });

      // Update via API
      const res = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) throw new Error('Failed to update game');

      onSave(updatedGame);
      onClose();
    } catch (error) {
      console.error('Error updating game:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestionar Participantes</h2>
              <p className="text-muted-foreground">
                {new Date(game.date).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {game.status === 'confirmed' && (
                  <span className="ml-2 text-sm text-orange-600 dark:text-orange-400">
                    ⚠️ Partido confirmado - Los jugadores ya no pueden desvotar
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent/20 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Action buttons */}
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h3 className="text-lg font-semibold text-foreground">Organizar Equipos y Participantes</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={syncWithVoters}
                disabled={isUpdating}
                className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm disabled:opacity-50"
              >
                <span className="hidden sm:inline">🔄 Sincronizar con Votos</span>
                <span className="sm:hidden">🔄 Sincronizar</span>
              </button>
              {game.originalTeams && (
                <button
                  onClick={undoTeamsToOriginal}
                  className="px-3 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 text-sm"
                >
                  ↶ Volver a Original
                </button>
              )}
              <button
                onClick={cleanupTeams}
                className="px-3 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 text-sm"
              >
                🧹 Limpiar Equipos
              </button>
            </div>
          </div>

          {/* Team Management */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team 1 */}
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-red-950/40 border border-red-600/30' : 'bg-red-50 border border-red-200'
            }`}>
              <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-red-300' : 'text-red-800'
              }`}>
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                Equipo 1 ({team1Players.length} jugadores)
              </h4>
              <div className="space-y-2 min-h-[200px]">
                {team1Players.map((playerId) => {
                  const playerInfo = getPlayerInfo(playerId);
                  const position = gameParticipants.indexOf(playerId) !== -1 
                    ? gameParticipants.indexOf(playerId) + 1 
                    : waitlistPlayers.indexOf(playerId) + 11;
                  
                  return (
                    <div key={playerId} className={`flex items-center justify-between gap-2 p-2 rounded ${
                      theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100/50'
                    } ${!playerInfo.isValid ? 'opacity-50 border-2 border-red-500' : ''}`}>
                      <div className="flex items-center gap-2">
                        {playerInfo.imageUrl && (
                          <img 
                            src={playerInfo.imageUrl} 
                            alt={playerInfo.name} 
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className={`${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                          #{position || '?'} {playerInfo.name}
                          {!playerInfo.isValid && ' ❌'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => removeFromTeams(playerId)}
                          className="w-6 h-6 flex items-center justify-center text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                          title="Quitar del equipo solamente"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setConfirmRemoveModal({
                              isOpen: true,
                              playerId: playerId,
                              playerName: playerInfo.name
                            });
                          }}
                          className="w-6 h-6 flex items-center justify-center text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          title="Quitar del partido completamente"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team 2 */}
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-blue-950/40 border border-blue-600/30' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                Equipo 2 ({team2Players.length} jugadores)
              </h4>
              <div className="space-y-2 min-h-[200px]">
                {team2Players.map((playerId) => {
                  const playerInfo = getPlayerInfo(playerId);
                  const position = gameParticipants.indexOf(playerId) !== -1 
                    ? gameParticipants.indexOf(playerId) + 1 
                    : waitlistPlayers.indexOf(playerId) + 11;
                  
                  return (
                    <div key={playerId} className={`flex items-center justify-between gap-2 p-2 rounded ${
                      theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100/50'
                    } ${!playerInfo.isValid ? 'opacity-50 border-2 border-red-500' : ''}`}>
                      <div className="flex items-center gap-2">
                        {playerInfo.imageUrl && (
                          <img 
                            src={playerInfo.imageUrl} 
                            alt={playerInfo.name} 
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className={`${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                          #{position || '?'} {playerInfo.name}
                          {!playerInfo.isValid && ' ❌'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => removeFromTeams(playerId)}
                          className="w-6 h-6 flex items-center justify-center text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                          title="Quitar del equipo solamente"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => {
                            setConfirmRemoveModal({
                              isOpen: true,
                              playerId: playerId,
                              playerName: playerInfo.name
                            });
                          }}
                          className="w-6 h-6 flex items-center justify-center text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          title="Quitar del partido completamente"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Available Players */}
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-green-950/40 border border-green-600/30' : 'bg-green-50 border border-green-200'
          }`}>
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
              theme === 'dark' ? 'text-green-300' : 'text-green-800'
            }`}>
              <Trophy className="w-4 h-4" />
              Jugadores Disponibles ({allGamePlayers.filter(id => !team1Players.includes(id) && !team2Players.includes(id)).length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {allGamePlayers
                .filter(playerId => !team1Players.includes(playerId) && !team2Players.includes(playerId))
                .map((playerId) => {
                  const playerInfo = getPlayerInfo(playerId);
                  const position = gameParticipants.indexOf(playerId) !== -1 
                    ? gameParticipants.indexOf(playerId) + 1 
                    : waitlistPlayers.indexOf(playerId) + 11;
                  
                  return (
                    <div key={playerId} className={`p-2 rounded border ${
                      theme === 'dark' ? 'bg-green-900/20 border-green-600/30' : 'bg-green-100 border-green-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {playerInfo.imageUrl && (
                          <img 
                            src={playerInfo.imageUrl} 
                            alt={playerInfo.name} 
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                          #{position} {playerInfo.name}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          <button
                            onClick={() => addToTeam(playerId, 1)}
                            className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            → Equipo 1
                          </button>
                          <button
                            onClick={() => addToTeam(playerId, 2)}
                            className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            → Equipo 2
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setConfirmRemoveModal({
                              isOpen: true,
                              playerId: playerId,
                              playerName: playerInfo.name
                            });
                          }}
                          className="w-full px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          title="Quitar del partido completamente"
                        >
                          ✕ Quitar del Partido
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-accent/10">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              onClick={saveChanges}
              disabled={isUpdating}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Remove from Match */}
      {confirmRemoveModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-card rounded-lg shadow-xl border border-border max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-destructive">
                ⚠️ Confirmar Eliminación
              </h3>
              <p className="text-muted-foreground mb-6">
                ¿Estás seguro que quieres eliminar a <strong>{confirmRemoveModal.playerName}</strong> del partido completamente?
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Esta acción eliminará al jugador de los participantes, lista de espera y equipos.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemoveModal({isOpen: false, playerId: '', playerName: ''})}
                  className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/20"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRemoveFromMatch}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  const { user, isLoaded } = useUser();
  const { success, error } = useToast();
  const { theme } = useTheme();
  useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [addingResultToGame, setAddingResultToGame] = useState<Game | null>(null);
  const [managingParticipants, setManagingParticipants] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  const [availability, setAvailability] = useState<MonthlyAvailability[]>([]);
  const [availabilityCache, setAvailabilityCache] = useState<{[key: string]: MonthlyAvailability[]}>({});
  const [sortedPlayersCache, setSortedPlayersCache] = useState<{[key: string]: User[]}>({});
  const [settingsCurrentMonth, setSettingsCurrentMonth] = useState<{month: number, year: number} | null>(null);
  const [showCountdown, setShowCountdown] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  
  // MVP voting state
  const [showMVPVoting, setShowMVPVoting] = useState<{[gameId: string]: boolean}>({});
  const [mvpResults, setMvpResults] = useState<{[gameId: string]: MvpResults}>({});
  const [votedGames, setVotedGames] = useState<{[gameId: string]: boolean}>({});
  const [voteStatusLoading, setVoteStatusLoading] = useState<{[gameId: string]: boolean}>({});

  // MVP voting helper functions
  const hasUserVotedForGame = (gameId: string): boolean => {
    return votedGames[gameId] === true;
  };

  const isVoteStatusLoading = (gameId: string): boolean => {
    return voteStatusLoading[gameId] === true;
  };

  const loadVoteStatus = async (gameId: string) => {
    setVoteStatusLoading(prev => ({ ...prev, [gameId]: true }));
    try {
      const result = await apiClient.checkVoteStatus(gameId);
      setVotedGames(prev => ({ ...prev, [gameId]: result.hasVoted }));
    } catch (error) {
      console.error('Error loading vote status:', error);
      setVotedGames(prev => ({ ...prev, [gameId]: false }));
    } finally {
      setVoteStatusLoading(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const markGameAsVoted = (gameId: string) => {
    setVotedGames(prev => ({ ...prev, [gameId]: true }));
  };

  // Helper function to get next confirmed match for current user
  const getNextConfirmedMatch = useCallback((): Game | null => {
    if (!currentUser) return null;
    
    const now = new Date();
    const userConfirmedGames = games.filter(game => 
      game.status === 'confirmed' && 
      game.participants.includes(currentUser.id) &&
      new Date(game.date) > now
    );
    
    if (userConfirmedGames.length === 0) return null;
    
    // Sort by date and return the earliest one
    return userConfirmedGames.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
  }, [currentUser, games]);

  // Helper function to calculate time remaining
  const calculateTimeLeft = useCallback((targetDate: Date) => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();
    
    if (difference <= 0) return null;
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  }, []);

  // Get next match data
  const nextMatch = useMemo(() => getNextConfirmedMatch(), [getNextConfirmedMatch]);

  // Countdown timer effect
  useEffect(() => {
    if (!nextMatch) {
      setTimeLeft(null);
      return;
    }

    // Create match date with time (assume 10:00 AM if no time specified)
    const matchDate = new Date(nextMatch.date);
    const matchTime = nextMatch.reservationInfo?.time || '10:00';
    const [hours, minutes] = matchTime.split(':');
    matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const updateCountdown = () => {
      const time = calculateTimeLeft(matchDate);
      setTimeLeft(time);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextMatch, calculateTimeLeft]);

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [allUsers, allGames, monthlyAvailability, settingsResponse] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getGames(),
          apiClient.getMonthlyAvailability(),
          fetch('/api/settings')
        ]);
        
        const userData = allUsers.find((u: User) => u.id === user.id);
        
        // Fix dates that might be serialized as strings
        const gamesWithFixedDates = allGames.map((game: Game) => ({
          ...game,
          date: new Date(game.date),
          createdAt: new Date(game.createdAt),
          updatedAt: new Date(game.updatedAt),
        }));
      
        // Parse settings response
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setSettingsCurrentMonth({ month: settings.month, year: settings.year });
        } else {
          // Fallback to actual current month if settings fail to load
          const now = new Date();
          setSettingsCurrentMonth({ month: now.getMonth() + 1, year: now.getFullYear() });
        }

      setUsers(allUsers);
        setGames(gamesWithFixedDates);
      setCurrentUser(userData || null);
        setAvailability(monthlyAvailability);

        // Load vote status for completed games where user participated
        if (userData) {
          const completedGames = gamesWithFixedDates.filter((game: Game) => 
            game.status === 'completed' && 
            game.result && 
            game.participants.includes(userData.id)
          );
          
          completedGames.forEach((game: Game) => {
            loadVoteStatus(game.id);
          });
        }
      } catch (error) {
        console.error('Error loading games data:', error);
      } finally {
        setIsLoading(false);
    }
    };

    loadData();
  }, [isLoaded, user]);

  // Pre-fetch availability for current and next month when settings are loaded
  useEffect(() => {
    if (settingsCurrentMonth) {
      const { month: currentMonth, year: currentYear } = settingsCurrentMonth;
      const monthsToPreFetch = [
        { year: currentYear, month: currentMonth },
        { year: currentMonth === 12 ? currentYear + 1 : currentYear, month: currentMonth === 12 ? 1 : currentMonth + 1 }
      ];
      
      monthsToPreFetch.forEach(({ year, month }) => {
        fetchAvailabilityForMonth(year, month);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsCurrentMonth]);

  const fetchAvailabilityForMonth = useCallback(async (year: number, month: number): Promise<MonthlyAvailability[]> => {
    const cacheKey = `${month}-${year}`;
    
    if (availabilityCache[cacheKey]) {
      return availabilityCache[cacheKey];
    }

    try {
      const response = await fetch(`/api/availability/month?year=${year}&month=${month}`);
      if (!response.ok) {
        console.error(`Failed to fetch availability for ${year}-${month}`);
        return [];
      }
      const monthlyData = await response.json();
      
      setAvailabilityCache(prev => ({
        ...prev,
        [cacheKey]: monthlyData
      }));
      
      return monthlyData;
    } catch (error) {
      console.error(`Error fetching availability for ${year}-${month}:`, error);
      return [];
    }
  }, [availabilityCache, setAvailabilityCache]);

  const getAvailablePlayersForSunday = useCallback((year: number, month: number, sunday: number): User[] => {
    const cacheKey = `${month}-${year}`;
    
    return users.filter(user => {
      // Include all whitelisted users (both admins and regular players)
      if (!user.isWhitelisted) return false;
      
      // First check from main availability (current active month)
      let userAvailability = availability.find(
        a => a.userId === user.id && a.month === month && a.year === year
      );
      
      // If not found, check from cache for this specific month
      if (!userAvailability && availabilityCache[cacheKey]) {
        userAvailability = availabilityCache[cacheKey].find(
          a => a.userId === user.id && a.month === month && a.year === year
        );
      }
      
      // Only show users who have explicitly voted for this Sunday
      return userAvailability?.availableSundays.includes(sunday) || false;
    });
  }, [users, availability, availabilityCache]);

  const getAvailablePlayersWithVotingOrder = useCallback(async (year: number, month: number, sunday: number): Promise<User[]> => {
    const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
    
    // Use cached availability data instead of making individual API calls
    const cacheKey = `${month}-${year}`;
    const monthlyAvailability = availabilityCache[cacheKey] || [];
    
    const playersWithTimestamps = availablePlayers.map((player) => {
      // Find the availability record for this player and month
      const availabilityRecord = monthlyAvailability.find(record => record.userId === player.id);
      
      let votingTimestamp = new Date(0); // Default to epoch if not found
      if (availabilityRecord && availabilityRecord.votedAt) {
        votingTimestamp = new Date(availabilityRecord.votedAt);
      }
      
      return {
        player,
        votedAt: votingTimestamp
      };
    });
    
    // Sort by voting timestamp (earliest first)
    playersWithTimestamps.sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime());
    
    return playersWithTimestamps.map(p => p.player);
  }, [getAvailablePlayersForSunday, availabilityCache]);

  const createGameForSunday = async (year: number, month: number, sunday: number) => {
    const gameDate = new Date(year, month - 1, sunday);
    const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
    
    // Double-check for existing games to prevent duplicates
    const existingGame = games.find(g => {
      const gDate = g.date instanceof Date ? g.date : new Date(g.date);
      return gDate.getFullYear() === gameDate.getFullYear() &&
             gDate.getMonth() === gameDate.getMonth() &&
             gDate.getDate() === gameDate.getDate();
    });
    
    if (existingGame) {
      error('Partido ya existe', 'Ya existe un partido programado para esta fecha.');
      return;
    }
    
    if (availablePlayers.length < 10) {
      error('Jugadores insuficientes', `Solo hay ${availablePlayers.length} jugadores disponibles. Se necesitan 10 para crear un partido.`);
      return;
    }

    const newGame: Game = {
      id: `game-${Date.now()}`,
      date: gameDate,
      status: 'confirmed',
      participants: availablePlayers.slice(0, 10).map(p => p.id),
      waitlist: availablePlayers.slice(10).map(p => p.id),
      reservationInfo: {
        location: 'Cancha Principal', 
        time: '10:00',
        cost: 25,
        reservedBy: currentUser?.name || 'Administrador'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
    const updatedGames = [...games, newGame];
    setGames(updatedGames);
      await apiClient.saveGames(updatedGames);
      success('Partido creado', '¡Partido creado exitosamente!');
    } catch (err) {
      console.error('Error creating game:', err);
      error('Error al crear partido', 'No se pudo crear el partido');
    }
  };



  const handleEditGame = async (updatedGame: Game) => {
    try {
      const payload = {
        status: updatedGame.status,
        teams: updatedGame.teams,
        reservationInfo: updatedGame.reservationInfo === undefined ? null : updatedGame.reservationInfo,
        result: updatedGame.result === undefined ? null : updatedGame.result
      };

      console.log('🔄 Sending game update:', { gameId: updatedGame.id, payload });

      // Use the individual game update API endpoint
      const response = await fetch(`/api/games/${updatedGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      // Update local state
      const updatedGames = games.map(g => g.id === updatedGame.id ? updatedGame : g);
      setGames(updatedGames);
      setEditingGame(null);
      success('Partido actualizado', 'Los cambios se guardaron correctamente');
    } catch (err) {
      console.error('Error editing game:', err);
      error('Error al actualizar', 'No se pudieron guardar los cambios');
    }
  };

  const getCurrentMonthSundays = () => {
    // Don't render until settings are loaded
    if (!settingsCurrentMonth) {
      return [];
    }
    
    const { month: currentMonth, year: currentYear } = settingsCurrentMonth;
    const now = new Date(); // Still needed for filtering past dates
    
    // Show current and next month's Sundays based on settings
    const monthsToShow = [
      { year: currentYear, month: currentMonth },
      { year: currentMonth === 12 ? currentYear + 1 : currentYear, month: currentMonth === 12 ? 1 : currentMonth + 1 }
    ];
    
    // Pre-fetch availability for months being displayed
    monthsToShow.forEach(({ year, month }) => {
      fetchAvailabilityForMonth(year, month);
    });
    
    const allSundays = [];
    
    for (const { year, month } of monthsToShow) {
    const sundays = getSundaysInMonth(year, month);
    
      const filteredSundays = sundays
      .filter(sunday => {
        const sundayDate = new Date(year, month - 1, sunday);
          // Only show future or current day
          return sundayDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      })
      .map(sunday => {
        const date = new Date(year, month - 1, sunday);
        const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
          const existingGame = games.find(g => {
            const gameDate = g.date instanceof Date ? g.date : new Date(g.date);
            // Compare only year, month, and day (ignore time)
            return gameDate.getFullYear() === date.getFullYear() &&
                   gameDate.getMonth() === date.getMonth() &&
                   gameDate.getDate() === date.getDate();
          });
        
        return {
          date,
          sunday,
          month,
          year,
          availablePlayers,
          existingGame,
        };
      });
        
      allSundays.push(...filteredSundays);
    }
    
    // Sort by date to show chronologically
    return allSundays.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getActivePlayersWhoHaventVoted = useCallback((year: number, month: number): User[] => {
    // Get all active (whitelisted) users who are not admins and exclude mock players
    const activePlayers = users.filter(user =>
      user.isWhitelisted &&
      !user.isAdmin &&
      !user.id.startsWith('mock_player_')
    );

    // Get monthly availability data for the specific month from cache
    const cacheKey = `${month}-${year}`;
    const monthlyAvailability = availabilityCache[cacheKey];

    // If we don't have the data yet, trigger fetch and return empty list for now
    // This prevents incorrect data from being shown
    if (!monthlyAvailability) {
      // Trigger async fetch (will update cache and cause re-render)
      fetchAvailabilityForMonth(year, month).catch(console.error);
      return []; // Return empty until data is loaded
    }

    // Filter players who haven't voted for this month
    return activePlayers.filter(user => {
      // Check if user has voted for this specific month
      const userAvailability = monthlyAvailability.find(
        a => a.userId === user.id
      );

      // Return true if user hasn't voted (check hasVoted property instead of record existence)
      return !userAvailability || !userAvailability.hasVoted;
    });
  }, [users, availabilityCache, fetchAvailabilityForMonth]);

  const organizeTeams = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.participants.length !== 10) return;

    const teams = generateTeams(game.participants);
    // Store original teams if not already stored
    const originalTeams = game.originalTeams || teams;
    const updatedGame = { ...game, teams, originalTeams, updatedAt: new Date() };
    
    try {
      const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
      setGames(updatedGames);
      await apiClient.saveGames(updatedGames);
    } catch (error) {
      console.error('Error organizing teams:', error);
    }
  };

  const updateGameResult = async (gameId: string, team1Score: number, team2Score: number, notes?: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/result`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team1Score, team2Score, notes })
      });

      if (response.ok) {
        // Update local games state
        const updatedGames = games.map(g => 
          g.id === gameId 
            ? { ...g, result: { team1Score, team2Score, notes } }
            : g
        );
        setGames(updatedGames);
        success('Resultado guardado', 'El resultado del partido se guardó correctamente');
      } else {
        const errorData = await response.json();
        error('Error al guardar', errorData.error || 'No se pudo guardar el resultado');
      }
    } catch (err) {
      console.error('Error updating game result:', err);
      error('Error de conexión', 'No se pudo conectar con el servidor');
    }
  };

  // MVP voting functions continue here

  const loadMVPResults = async (gameId: string) => {
    try {
      const results = await apiClient.getMVPResults(gameId);
      setMvpResults(prev => ({ ...prev, [gameId]: results }));
    } catch (error) {
      console.error('Error loading MVP results:', error);
    }
  };

  const submitMVPVote = async (gameId: string, votedForId: string) => {
    try {
      await apiClient.voteMVP(gameId, votedForId);
      markGameAsVoted(gameId);
      success('Voto enviado', 'Tu voto para MVP se envió correctamente');
      
      // Refresh MVP results
      await loadMVPResults(gameId);
      
      // Hide voting UI
      setShowMVPVoting(prev => ({ ...prev, [gameId]: false }));
    } catch (err) {
      console.error('Error voting MVP:', err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo enviar el voto para MVP';
      error('Error al votar', errorMessage);
    }
  };

  const finalizeMVP = async (gameId: string) => {
    try {
      const result = await apiClient.finalizeMVP(gameId);
      success('MVP finalizado', 'El MVP se ha establecido correctamente');
      
      // Update the game in local state with the new MVP result
      setGames(prevGames => 
        prevGames.map(game => {
          if (game.id === gameId && game.result) {
            return {
              ...game,
              result: {
                ...game.result,
                mvp: result.mvp.isTie ? result.mvp.playerIds : result.mvp.playerId
              },
              updatedAt: new Date()
            };
          }
          return game;
        })
      );
      
      // Refresh MVP results
      await loadMVPResults(gameId);
    } catch (err) {
      console.error('Error finalizing MVP:', err);
      error('Error al finalizar MVP', 'No se pudo establecer el MVP');
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

  if (!currentUser || !settingsCurrentMonth) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const upcomingSundays = getCurrentMonthSundays();

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen bg-background">
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Partidos Programados</h1>
            <p className="text-muted-foreground">Gestiona partidos y organiza equipos automáticamente</p>
          </div>

        </div>
      </div>

      <div className="space-y-6">
        {upcomingSundays.map(({ date, sunday, month, year, availablePlayers, existingGame }, index) => {
          // Show month header for first item or when month changes
          const showMonthHeader = index === 0 || upcomingSundays[index - 1].month !== month;
          const playersWhoHaventVoted = getActivePlayersWhoHaventVoted(year, month);
          
          return (
            <div key={`${year}-${month}-${sunday}`}>
              {showMonthHeader && (
                <div className="mb-4">
                  <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground bg-accent px-4 py-2 rounded-lg">
                    <Calendar className="h-5 w-5" />
                    {getCapitalizedMonthYear(year, month)}
                  </h2>
                  
                  {/* Players who haven't voted section */}
                  {playersWhoHaventVoted.length > 0 && (
                    <div className={`mt-3 rounded-lg p-4 ${
                      theme === 'dark' 
                        ? 'bg-amber-950/40 border border-amber-600/30' 
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⚠️</span>
                        <h3 className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-amber-300' : 'text-amber-800'
                        }`}>
                          Jugadores que aún no votaron para {getCapitalizedMonthYear(year, month)}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {playersWhoHaventVoted.map(player => (
                          <span
                            key={player.id}
                            className={`px-3 py-1 rounded-full text-sm ${
                              theme === 'dark' 
                                ? 'bg-amber-900/40 text-amber-200 border border-amber-600/40'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}
                          >
                            {(player.nickname || player.name).substring(0, 10)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {formatDate(date)}
                </h3>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xl font-bold text-foreground">
                    {availablePlayers.length}/10
                  </span>
                  <span className="text-sm text-muted-foreground">jugadores</span>
                </div>
              </div>
              
              {!existingGame && availablePlayers.length >= 10 && (
                <button
                  onClick={() => createGameForSunday(year, month, sunday)}
                  className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
                >
                  Confirmar Partido
                </button>
              )}
              
              {existingGame && existingGame.status === 'confirmed' && existingGame.participants.length >= 10 && (
                existingGame.participants.includes(currentUser?.id || '') ? (
                  <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                    theme === 'dark' 
                      ? 'text-green-300 bg-green-950/40 border border-green-600/30'
                      : 'text-green-700 bg-green-50 border border-green-200'
                  }`}>
                    <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">
                      <span className="sm:hidden">¡Confirmado!</span>
                      <span className="hidden sm:inline">¡Confirmado! Estás en este partido</span>
                    </span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                    theme === 'dark' 
                      ? 'text-orange-300 bg-orange-950/40 border border-orange-600/30'
                      : 'text-orange-700 bg-orange-50 border border-orange-200'
                  }`}>
                    <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium">
                      <span className="sm:hidden">Completo</span>
                      <span className="hidden sm:inline">Día completo (10 jugadores)</span>
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Show players who voted available for this day (only if game is not confirmed or completed) */}
            <PlayersForSunday 
              year={year} 
              month={month} 
              sunday={sunday} 
              existingGame={existingGame} 
              theme={theme}
              getAvailablePlayersWithVotingOrder={getAvailablePlayersWithVotingOrder}
              sortedPlayersCache={sortedPlayersCache}
              setSortedPlayersCache={setSortedPlayersCache}
              availabilityCache={availabilityCache}
            />

            {existingGame && (
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm self-start ${
                    existingGame.status === 'confirmed'
                      ? (theme === 'dark' ? 'bg-green-950/40 text-green-300 border border-green-600/30' : 'bg-green-100 text-green-800')
                      : existingGame.status === 'completed'
                      ? (theme === 'dark' ? 'bg-purple-950/40 text-purple-300 border border-purple-600/30' : 'bg-purple-100 text-purple-800')
                      : existingGame.status === 'cancelled'
                      ? (theme === 'dark' ? 'bg-red-950/40 text-red-300 border border-red-600/30' : 'bg-red-100 text-red-800')
                      : (theme === 'dark' ? 'bg-yellow-950/40 text-yellow-300 border border-yellow-600/30' : 'bg-yellow-100 text-yellow-800')
                  }`}>
                    {existingGame.status === 'confirmed' ? 'Confirmado'
                     : existingGame.status === 'completed' ? 'Completado'
                     : existingGame.status === 'cancelled' ? 'Cancelado'
                     : 'Programado'}
                  </span>

                  {currentUser.isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {existingGame.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            const updatedGame = { ...existingGame, status: 'confirmed' as const };
                            handleEditGame(updatedGame);
                          }}
                          className="bg-green-600 dark:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 text-sm sm:text-base"
                        >
                          <span className="hidden sm:inline">Confirmar Partido</span>
                          <span className="sm:hidden">Confirmar</span>
                        </button>
                      )}
                      {!existingGame.teams && existingGame.participants.length === 10 && (
                    <button
                      onClick={() => organizeTeams(existingGame.id)}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm sm:text-base"
                    >
                      <span className="hidden sm:inline">Organizar Equipos</span>
                      <span className="sm:hidden">Organizar</span>
                    </button>
                      )}
                      {existingGame.status === 'completed' && !existingGame.result && (
                        <button
                          onClick={() => setAddingResultToGame(existingGame)}
                          className="bg-green-600 dark:bg-green-700 text-white px-3 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                        >
                          <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Agregar Resultado</span>
                          <span className="sm:hidden">Resultado</span>
                        </button>
                      )}
                      <button
                        onClick={() => setManagingParticipants(existingGame)}
                        className="bg-purple-600 dark:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                      >
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Gestionar Participantes</span>
                        <span className="sm:hidden">Gestionar</span>
                      </button>
                      <button
                        onClick={() => setEditingGame(existingGame)}
                        className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 text-sm sm:text-base"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                {existingGame.teams && (
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-red-950/40 border border-red-600/30' : 'bg-red-50'
                    }`}>
                      <h5 className={`font-semibold mb-2 ${
                        theme === 'dark' ? 'text-red-300' : 'text-red-800'
                      }`}>Equipo 1</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team1.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className={`flex items-center gap-2 ${
                              theme === 'dark' ? 'text-red-300' : 'text-red-700'
                            }`}>
                              {player?.imageUrl && (
                                <img 
                                  src={player.imageUrl} 
                                  alt={player.name} 
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              {player?.nickname || player?.name || 'Jugador desconocido'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    
                    <div className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-blue-950/40 border border-blue-600/30' : 'bg-blue-50'
                    }`}>
                      <h5 className={`font-semibold mb-2 ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                      }`}>Equipo 2</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team2.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className={`flex items-center gap-2 ${
                              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                            }`}>
                              {player?.imageUrl && (
                                <img 
                                  src={player.imageUrl} 
                                  alt={player.name} 
                                  className="w-6 h-6 rounded-full"
                                />
                              )}
                              {player?.nickname || player?.name || 'Jugador desconocido'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}


                {existingGame.result && (
                  <div className={`p-4 rounded-lg mb-4 ${
                    theme === 'dark' ? 'bg-green-950/40 border border-green-600/30' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className={`font-semibold flex items-center gap-2 ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-800'
                      }`}>
                        <Trophy className="h-5 w-5" />
                        Resultado Final
                      </h5>
                      {currentUser.isAdmin && (
                        <button
                          onClick={() => setAddingResultToGame(existingGame)}
                          className={`p-1 ${
                            theme === 'dark' ? 'text-green-400 hover:text-green-200' : 'text-green-600 hover:text-green-800'
                          }`}
                          title="Editar resultado"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground mb-2">
                        {existingGame.result.team1Score} - {existingGame.result.team2Score}
                      </div>
                      {existingGame.teams && (
                        <div className={`text-sm mb-2 ${
                          theme === 'dark' ? 'text-green-300' : 'text-green-700'
                        }`}>
                          <span className="font-medium">Equipo 1</span> vs <span className="font-medium">Equipo 2</span>
                        </div>
                      )}
                      {existingGame.result.notes && (
                        <div className="text-sm text-muted-foreground italic bg-card p-2 rounded border">
                          &quot;{existingGame.result.notes}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MVP Voting Section */}
                {existingGame.status === 'completed' && existingGame.result && (
                  <div className="mb-4">
                    {existingGame.result.mvp ? (
                      // Show MVP Result
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                          <h5 className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">
                            MVP del Partido
                          </h5>
                          <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="text-center">
                          {(() => {
                            const mvpIds = Array.isArray(existingGame.result!.mvp) ? existingGame.result!.mvp : [existingGame.result!.mvp];
                            const mvpPlayers = mvpIds.map(id => users.find(u => u.id === id)).filter(Boolean);
                            
                            if (mvpIds.length > 1) {
                              return (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-3">
                                    Empate en votación - {mvpIds.length} MVPs
                                  </p>
                                  <div className="flex items-center justify-center gap-4 flex-wrap">
                                    {mvpPlayers.map((mvpPlayer, index) => (
                                      <div key={mvpPlayer?.id || index} className="flex items-center gap-2">
                                        {mvpPlayer?.imageUrl && (
                                          <img 
                                            src={mvpPlayer.imageUrl} 
                                            alt={mvpPlayer.name} 
                                            className="w-10 h-10 rounded-full border-2 border-yellow-400"
                                          />
                                        )}
                                        <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                                          {mvpPlayer?.nickname || mvpPlayer?.name || 'Jugador desconocido'}
                                        </span>
                                        <Star className="h-5 w-5 text-yellow-500 fill-current" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            } else {
                              const mvpPlayer = mvpPlayers[0];
                              return (
                                <div className="flex items-center justify-center gap-3">
                                  {mvpPlayer?.imageUrl && (
                                    <img 
                                      src={mvpPlayer.imageUrl} 
                                      alt={mvpPlayer.name} 
                                      className="w-12 h-12 rounded-full border-2 border-yellow-400"
                                    />
                                  )}
                                  <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                                    {mvpPlayer?.nickname || mvpPlayer?.name || 'Jugador desconocido'}
                                  </span>
                                  <Star className="h-6 w-6 text-yellow-500 fill-current" />
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ) : existingGame.participants.includes(currentUser.id) ? (
                      // Show MVP Voting for Participants
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark' ? 'bg-blue-950/40 border border-blue-600/30' : 'bg-blue-50 border border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className={`font-semibold flex items-center gap-2 ${
                            theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                          }`}>
                            <Star className="h-5 w-5" />
                            Votación MVP
                          </h5>
                          {!hasUserVotedForGame(existingGame.id) && !isVoteStatusLoading(existingGame.id) && (
                            <button
                              onClick={() => setShowMVPVoting(prev => ({ 
                                ...prev, 
                                [existingGame.id]: !prev[existingGame.id] 
                              }))}
                              className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              {showMVPVoting[existingGame.id] ? 'Ocultar votación' : 'Votar MVP'}
                            </button>
                          )}
                        </div>
                        
                        {hasUserVotedForGame(existingGame.id) ? (
                          <div className="text-center">
                            <div className={`flex items-center justify-center gap-2 mb-2 ${
                              theme === 'dark' ? 'text-green-400' : 'text-green-600'
                            }`}>
                              <Trophy className="h-5 w-5" />
                              <span className="font-medium">¡Ya votaste!</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Tu voto se registró correctamente. Los resultados se mostrarán cuando termine la votación.
                            </p>
                            {currentUser.isAdmin && (
                              <button
                                onClick={() => {
                                  loadMVPResults(existingGame.id);
                                  setShowMVPVoting(prev => ({ 
                                    ...prev, 
                                    [existingGame.id]: true 
                                  }));
                                }}
                                className={`mt-2 text-sm font-medium ${
                                  theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                              >
                                Ver resultados (Admin)
                              </button>
                            )}
                          </div>
                        ) : showMVPVoting[existingGame.id] ? (
                          <div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Vota por el mejor jugador del partido (votación anónima):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {existingGame.participants
                                .map(participantId => users.find(u => u.id === participantId))
                                .filter(Boolean)
                                .map(player => (
                                  <button
                                    key={player!.id}
                                    onClick={() => submitMVPVote(existingGame.id, player!.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                      theme === 'dark' 
                                        ? 'border-blue-700/30 hover:bg-blue-900/20' 
                                        : 'border-blue-200 hover:bg-blue-100'
                                    }`}
                                  >
                                    {player!.imageUrl && (
                                      <img 
                                        src={player!.imageUrl} 
                                        alt={player!.name} 
                                        className="w-8 h-8 rounded-full"
                                      />
                                    )}
                                    <span className="font-medium text-blue-400 dark:text-blue-200">
                                      {player!.nickname || player!.name}
                                    </span>
                                    <Star className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto" />
                                  </button>
                                ))
                              }
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">
                            Haz clic en &quot;Votar MVP&quot; para elegir al mejor jugador del partido
                          </p>
                        )}

                        {/* Show results if available (for admins or after voting) */}
                        {mvpResults[existingGame.id] && showMVPVoting[existingGame.id] && (
                          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700/30">
                            <h6 className={`font-medium ${
                                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                } mb-3`}>
                              Resultados actuales:
                            </h6>
                            <div className="space-y-2">
                              {mvpResults[existingGame.id].voteResults.map(result => (
                                <div key={result.playerId} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    {result.playerImageUrl && (
                                      <img 
                                        src={result.playerImageUrl} 
                                        alt={result.playerName} 
                                        className="w-6 h-6 rounded-full"
                                      />
                                    )}
                                    <span>{result.playerNickname || result.playerName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{result.voteCount} voto{result.voteCount !== 1 ? 's' : ''}</span>
                                    <span className="text-muted-foreground">({result.votePercentage}%)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground text-center">
                              Total votos: {mvpResults[existingGame.id].totalVotes} / {mvpResults[existingGame.id].totalParticipants} jugadores
                            </div>
                            
                            {/* Admin-only: Show non-voters list */}
                            {currentUser.isAdmin && mvpResults[existingGame.id].nonVoters && mvpResults[existingGame.id].nonVoters!.nonVotersCount > 0 && (
                              <div className={`mt-3 p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-orange-950/40 border border-orange-600/30' : 'bg-orange-50 border border-orange-200'
                              }`}>
                                <h6 className={`text-sm font-medium mb-2 ${
                                  theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
                                }`}>
                                  Pendientes de votar ({mvpResults[existingGame.id].nonVoters!.nonVotersCount}):
                                </h6>
                                <div className="flex flex-wrap gap-2">
                                  {mvpResults[existingGame.id].nonVoters!.nonVoters.map(user => (
                                    <div key={user.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                      theme === 'dark' ? 'bg-orange-900/40 text-orange-200' : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {user.imageUrl && (
                                        <img 
                                          src={user.imageUrl} 
                                          alt={user.name} 
                                          className="w-4 h-4 rounded-full"
                                        />
                                      )}
                                      <span>{user.displayName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {currentUser.isAdmin && mvpResults[existingGame.id].mvp && (
                              <button
                                onClick={() => finalizeMVP(existingGame.id)}
                                className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                              >
                                {(() => {
                                  const results = mvpResults[existingGame.id].voteResults;
                                  if (results.length === 0) return "Finalizar MVP";
                                  
                                  const highestVoteCount = results[0].voteCount;
                                  const tiedPlayers = results.filter(r => r.voteCount === highestVoteCount);
                                  
                                  if (tiedPlayers.length === 1) {
                                    const winner = tiedPlayers[0];
                                    return `Finalizar MVP: ${winner.playerNickname || winner.playerName}`;
                                  } else {
                                    const names = tiedPlayers.map(p => p.playerNickname || p.playerName).join(", ");
                                    return `Finalizar MVP (Empate): ${names}`;
                                  }
                                })()}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Show message for non-participants
                      <div className={`p-4 rounded-lg border ${
                        theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Star className="h-5 w-5" />
                          <span className="text-sm">Solo los jugadores que participaron pueden votar por el MVP</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {existingGame.reservationInfo && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h5 className="font-semibold text-foreground mb-2">Información de Reserva</h5>
                    <p className="text-foreground"><strong>Lugar:</strong> {existingGame.reservationInfo.location}</p>
                    {existingGame.reservationInfo.mapsLink && (
                      <p className="text-foreground">
                        <strong>Dirección:</strong> 
                        <a 
                          href={existingGame.reservationInfo.mapsLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`ml-2 ${
                            theme === 'dark' 
                              ? 'text-blue-400 hover:text-blue-300' 
                              : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          🗺️ Ver en Google Maps
                        </a>
                      </p>
                    )}
                    <p className="text-foreground"><strong>Hora:</strong> {existingGame.reservationInfo.time}</p>
                    {existingGame.reservationInfo.cost && (
                      <p className="text-foreground"><strong>Costo:</strong> ARS ${existingGame.reservationInfo.cost}</p>
                    )}
                    {existingGame.reservationInfo.reservedBy && (
                      <p className="text-foreground"><strong>Reservado por:</strong> {existingGame.reservationInfo.reservedBy}</p>
                    )}
                    {existingGame.reservationInfo.paymentAlias && (
                      <p className="text-foreground">
                        <strong>Alias para transferir:</strong> {existingGame.reservationInfo.paymentAlias}
                        {existingGame.reservationInfo.cost && (
                          <span className="text-green-700 font-semibold ml-2">
                            (ARS ${(existingGame.reservationInfo.cost / 10).toFixed(0)} por persona)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
            </div>
          );
        })}

        {upcomingSundays.length === 0 && (
          <div className="bg-card rounded-lg shadow-md p-8 text-center">
            <p className="text-muted-foreground mb-4">No hay domingos disponibles</p>
            <p className="text-sm text-gray-400">
              Tip: Crea usuarios de prueba para ver domingos con jugadores disponibles
            </p>
          </div>
        )}
      </div>

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onSave={handleEditGame}
          onClose={() => setEditingGame(null)}
          users={users}
        />
      )}

      {addingResultToGame && (
        <ResultInputModal 
          game={addingResultToGame}
          users={users}
          onSave={updateGameResult}
          onClose={() => setAddingResultToGame(null)}
        />
      )}

      {managingParticipants && (
        <ParticipantManagementModal 
          game={managingParticipants}
          users={users}
          onSave={(updatedGame) => {
            const updatedGames = games.map(g => g.id === updatedGame.id ? updatedGame : g);
            setGames(updatedGames);
            setManagingParticipants(null);
            success('Participantes actualizados', 'Los cambios se guardaron correctamente');
          }}
          onClose={() => setManagingParticipants(null)}
        />
      )}

      {/* Floating Countdown Timer */}
      {timeLeft && showCountdown && (
        <div className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 ${
          theme === 'dark' 
            ? 'bg-blue-950/95 border border-blue-600/30 backdrop-blur-sm'
            : 'bg-blue-50/95 border border-blue-200 backdrop-blur-sm'
        } rounded-xl shadow-lg p-3 sm:p-4 max-w-[280px] sm:max-w-sm`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className={`h-4 w-4 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
              }`}>
                Próximo Partido
              </h3>
            </div>
            <button
              onClick={() => setShowCountdown(false)}
              className={`p-1 rounded-lg hover:bg-blue-100/50 transition-colors ${
                theme === 'dark' 
                  ? 'text-blue-400 hover:bg-blue-900/30' 
                  : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          
          <div className={`text-xs mb-3 ${
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {(() => {
              if (!nextMatch) return '';
              const date = formatDate(new Date(nextMatch.date));
              const time = nextMatch.reservationInfo?.time || '10:00';
              return `${date} • ${time}`;
            })()}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className={`${
              theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
            } rounded-lg p-2`}>
              <div className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {timeLeft.days}
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                días
              </div>
            </div>
            <div className={`${
              theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
            } rounded-lg p-2`}>
              <div className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {timeLeft.hours}
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                hrs
              </div>
            </div>
            <div className={`${
              theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
            } rounded-lg p-2`}>
              <div className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {timeLeft.minutes}
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                min
              </div>
            </div>
            <div className={`${
              theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'
            } rounded-lg p-2`}>
              <div className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {timeLeft.seconds}
              </div>
              <div className={`text-xs ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`}>
                seg
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Result Input Modal Component
interface ResultInputModalProps {
  game: Game;
  users: User[];
  onSave: (gameId: string, team1Score: number, team2Score: number, notes?: string) => void;
  onClose: () => void;
}

interface PlayersForSundayProps {
  year: number;
  month: number;
  sunday: number;
  existingGame: Game | undefined;
  theme: string;
  getAvailablePlayersWithVotingOrder: (year: number, month: number, sunday: number) => Promise<User[]>;
  sortedPlayersCache: {[key: string]: User[]};
  setSortedPlayersCache: React.Dispatch<React.SetStateAction<{[key: string]: User[]}>>;
  availabilityCache: {[key: string]: MonthlyAvailability[]};
}

function PlayersForSunday({ 
  year, 
  month, 
  sunday, 
  existingGame, 
  theme, 
  getAvailablePlayersWithVotingOrder,
  sortedPlayersCache,
  setSortedPlayersCache,
  availabilityCache
}: PlayersForSundayProps) {
  const [sortedPlayers, setSortedPlayers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${year}-${month}-${sunday}`;
    const availabilityCacheKey = `${month}-${year}`;
    
    if (sortedPlayersCache[cacheKey]) {
      setSortedPlayers(sortedPlayersCache[cacheKey]);
      setIsLoading(false);
    } else if (availabilityCache[availabilityCacheKey]) {
      // Only fetch if we have the availability data
      setIsLoading(true);
      getAvailablePlayersWithVotingOrder(year, month, sunday)
        .then(players => {
          setSortedPlayers(players);
          setSortedPlayersCache(prev => ({ ...prev, [cacheKey]: players }));
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading sorted players:', error);
          setIsLoading(false);
        });
    } else {
      // Availability data not loaded yet, keep loading state
      setIsLoading(true);
    }
  }, [year, month, sunday, getAvailablePlayersWithVotingOrder, sortedPlayersCache, setSortedPlayersCache, availabilityCache]);

  if (existingGame && (existingGame.status === 'confirmed' || existingGame.status === 'completed')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mb-4">
        <h4 className="font-medium text-muted-foreground mb-2">
          Jugadores disponibles:
        </h4>
        <div className="text-sm text-muted-foreground">Cargando orden de votación...</div>
      </div>
    );
  }

  if (sortedPlayers.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="font-medium text-muted-foreground mb-2">
        Jugadores disponibles (por orden de voto):
      </h4>
      <div className="flex flex-wrap gap-2">
        {sortedPlayers.map((player, index) => {
          // Players 1-10 are participants, 11+ are substitutes (but all voted equally)
          const isParticipant = index < 10;
          
          return (
            <span
              key={player.id}
              className={`px-3 py-1 rounded-full text-sm ${
                isParticipant ? (
                  theme === 'dark' 
                    ? 'bg-green-950/40 text-green-300 border border-green-600/30' 
                    : 'bg-green-100 text-green-800'
                ) : (
                  theme === 'dark'
                    ? 'bg-yellow-950/40 text-yellow-300 border border-yellow-600/30'
                    : 'bg-yellow-100 text-yellow-800'
                )
              }`}
            >
              <span className="text-xs mr-1 opacity-70">#{index + 1}</span>
              {player.nickname || player.name}
              {!isParticipant && <span className="ml-1 text-xs">(Suplente)</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ResultInputModal({ game, users, onSave, onClose }: ResultInputModalProps) {
  const [team1Score, setTeam1Score] = useState(game.result?.team1Score ?? 0);
  const [team2Score, setTeam2Score] = useState(game.result?.team2Score ?? 0);
  const [notes, setNotes] = useState(game.result?.notes ?? '');

  const handleSave = () => {
    onSave(game.id, team1Score, team2Score, notes.trim() || undefined);
    onClose();
  };

  const getTeamName = (teamIds: string[]) => {
    return teamIds.map(id => {
      const player = users.find(u => u.id === id);
      return player?.nickname || player?.name || 'Jugador';
    }).slice(0, 3).join(', ') + (teamIds.length > 3 ? '...' : '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-green-600" />
              {game.result ? 'Editar Resultado' : 'Agregar Resultado'}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {formatDate(game.date)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-red-700 mb-1">
                  Equipo 1
                </label>
                {game.teams && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {getTeamName(game.teams.team1)}
                  </p>
                )}
                <input
                  type="number"
                  min="0"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-border rounded-lg text-center text-xl font-bold"
                />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground mb-4">VS</div>
                <div className="text-3xl font-bold text-foreground">
                  {team1Score} - {team2Score}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Equipo 2
                </label>
                {game.teams && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {getTeamName(game.teams.team2)}
                  </p>
                )}
                <input
                  type="number"
                  min="0"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border border-border rounded-lg text-center text-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Notas del partido (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Partido muy reñido, gran actuación de Juan..."
                rows={3}
                className="w-full p-2 border border-border rounded-lg text-foreground bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/20"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
            >
              Guardar Resultado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}