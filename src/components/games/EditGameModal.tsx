'use client';

import { useState } from 'react';
import { Game, User } from '@/types';
import { useTheme } from '@/contexts/theme-context';
import { X, Users, Trophy, Info, MapPin, Clock, DollarSign } from 'lucide-react';
import { generateTeams } from '@/lib/utils';

interface EditGameModalProps {
  game: Game;
  users: User[];
  onSave: (updatedGame: Game) => void;
  onClose: () => void;
  currentUserId: string;
  noVoters?: string[]; // User IDs who voted "No" for this date
}

type TabType = 'info' | 'players' | 'teams';

export function EditGameModal({ game, users, onSave, onClose, currentUserId, noVoters = [] }: EditGameModalProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [editedGame, setEditedGame] = useState<Game>({ ...game });
  const [participants, setParticipants] = useState<string[]>([...game.participants]);
  const [waitlist, setWaitlist] = useState<string[]>(game.waitlist || []);
  const [reservationInfo, setReservationInfo] = useState({
    location: game.reservationInfo?.location || '',
    time: game.reservationInfo?.time || '10:00',
    cost: game.reservationInfo?.cost?.toString() || '',
    reservedBy: game.reservationInfo?.reservedBy || '',
    mapsLink: game.reservationInfo?.mapsLink || '',
    paymentAlias: game.reservationInfo?.paymentAlias || ''
  });
  const [specialMessage, setSpecialMessage] = useState(game.specialMessage || '');

  const handleSave = async () => {
    const updatedGame: Game = {
      ...editedGame,
      participants,
      waitlist,
      specialMessage: specialMessage || undefined,
      reservationInfo: reservationInfo.location ? {
        location: reservationInfo.location,
        time: reservationInfo.time,
        cost: reservationInfo.cost ? parseFloat(reservationInfo.cost) : undefined,
        reservedBy: reservationInfo.reservedBy,
        mapsLink: reservationInfo.mapsLink || undefined,
        paymentAlias: reservationInfo.paymentAlias || undefined
      } : undefined,
      updatedAt: new Date()
    };

    // Update participants via API (skip for test/mock games)
    const isTestGame = game.id.startsWith('mock-') || game.id.endsWith('-game-id') || game.id.endsWith('-id');
    if (!isTestGame) {
      try {
        const res = await fetch(`/api/games/${game.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participants, waitlist })
        });

        if (!res.ok) throw new Error('Failed to update participants');
      } catch (error) {
        console.error('Error updating participants:', error);
      }
    }

    onSave(updatedGame);
  };

  const regenerateTeams = () => {
    const newTeams = generateTeams(participants);
    setEditedGame(prev => ({ ...prev, teams: newTeams }));
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

  // Player management functions
  const availableUsers = users.filter(user =>
    user.isWhitelisted &&
    !participants.includes(user.id) &&
    !waitlist.includes(user.id) &&
    !noVoters.includes(user.id) // Don't show users who voted "No"
  );

  const moveToParticipants = (userId: string, fromWaitlist = false) => {
    if (participants.length >= 10) return;

    setParticipants(prev => [...prev, userId]);
    if (fromWaitlist) {
      setWaitlist(prev => prev.filter(id => id !== userId));
    }
  };

  const moveToWaitlist = (userId: string, fromParticipants = false) => {
    setWaitlist(prev => [...prev, userId]);
    if (fromParticipants) {
      setParticipants(prev => prev.filter(id => id !== userId));
    }
  };

  const removeUser = (userId: string) => {
    setParticipants(prev => prev.filter(id => id !== userId));
    setWaitlist(prev => prev.filter(id => id !== userId));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Gestionar Partido</h2>
              <p className="text-muted-foreground mt-1">
                {new Date(game.date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'info'
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-accent/20 text-muted-foreground hover:bg-accent/40'
              }`}
            >
              <Info className="h-4 w-4" />
              Información
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'players'
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-accent/20 text-muted-foreground hover:bg-accent/40'
              }`}
            >
              <Users className="h-4 w-4" />
              Jugadores ({participants.length}/10)
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'teams'
                  ? theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-accent/20 text-muted-foreground hover:bg-accent/40'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Equipos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Game Status */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Estado del Partido
                </label>
                <select
                  value={editedGame.status}
                  onChange={(e) => setEditedGame(prev => ({ ...prev, status: e.target.value as Game['status'] }))}
                  className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                >
                  <option value="scheduled">Programado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Reservation Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Información de Reserva</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Lugar
                    </label>
                    <input
                      type="text"
                      value={reservationInfo.location}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Ej: Cancha Municipal"
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Hora
                    </label>
                    <input
                      type="time"
                      value={reservationInfo.time}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Costo Total ARS (opcional)
                    </label>
                    <input
                      type="number"
                      value={reservationInfo.cost}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, cost: e.target.value }))}
                      placeholder="0"
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                    {reservationInfo.cost && parseFloat(reservationInfo.cost) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(parseFloat(reservationInfo.cost) / 10).toFixed(0)} ARS por jugador
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Reservado por
                    </label>
                    <input
                      type="text"
                      value={reservationInfo.reservedBy}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, reservedBy: e.target.value }))}
                      placeholder="Nombre de quien reservó"
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Google Maps (opcional)
                    </label>
                    <input
                      type="url"
                      value={reservationInfo.mapsLink}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, mapsLink: e.target.value }))}
                      placeholder="https://maps.google.com/..."
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Alias para Transferencia (opcional)
                    </label>
                    <input
                      type="text"
                      value={reservationInfo.paymentAlias}
                      onChange={(e) => setReservationInfo(prev => ({ ...prev, paymentAlias: e.target.value }))}
                      placeholder="Ej: fulbo.admin"
                      className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Special Message */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Mensaje Especial (opcional)
                </label>
                <textarea
                  value={specialMessage}
                  onChange={(e) => setSpecialMessage(e.target.value)}
                  placeholder="Ej: Traer pelotas extras, cambio de horario, etc."
                  rows={3}
                  className="w-full p-3 border border-border rounded-lg text-foreground bg-background"
                />
              </div>
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Participants Column */}
              <div className={`p-4 rounded-lg border-2 ${
                theme === 'dark'
                  ? 'bg-green-950/20 border-green-600/30'
                  : 'bg-green-50 border-green-200'
              }`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-800'
                }`}>
                  <Users className="h-5 w-5" />
                  Participantes ({participants.length}/10)
                </h3>

                <div className="space-y-2 min-h-[300px]">
                  {participants.map((userId, index) => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;

                    return (
                      <div key={userId} className={`flex items-center justify-between p-2 rounded ${
                        theme === 'dark' ? 'bg-green-900/20' : 'bg-green-100/50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            theme === 'dark' ? 'bg-green-800/40 text-green-200' : 'bg-green-200 text-green-800'
                          }`}>
                            #{index + 1}
                          </span>
                          {user.imageUrl && (
                            <img src={user.imageUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                          )}
                          <span className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                            {user.nickname || user.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveToWaitlist(userId, true)}
                            className={`p-1 rounded text-xs ${
                              theme === 'dark'
                                ? 'text-yellow-400 hover:bg-yellow-900/20'
                                : 'text-yellow-600 hover:bg-yellow-100'
                            }`}
                            title="Mover a lista de espera"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeUser(userId)}
                            className={`p-1 rounded text-xs ${
                              theme === 'dark'
                                ? 'text-red-400 hover:bg-red-900/20'
                                : 'text-red-600 hover:bg-red-100'
                            }`}
                            title="Eliminar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {participants.length === 0 && (
                    <div className={`text-center py-8 text-sm ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`}>
                      Sin participantes
                    </div>
                  )}
                </div>
              </div>

              {/* Waitlist Column */}
              <div className={`p-4 rounded-lg border-2 ${
                theme === 'dark'
                  ? 'bg-yellow-950/20 border-yellow-600/30'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  <Users className="h-5 w-5" />
                  Lista de Espera ({waitlist.length})
                </h3>

                <div className="space-y-2 min-h-[300px]">
                  {waitlist.map((userId, index) => {
                    const user = users.find(u => u.id === userId);
                    if (!user) return null;

                    return (
                      <div key={userId} className={`flex items-center justify-between p-2 rounded ${
                        theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-100/50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            theme === 'dark' ? 'bg-yellow-800/40 text-yellow-200' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            #{index + 1}
                          </span>
                          {user.imageUrl && (
                            <img src={user.imageUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                          )}
                          <span className={`text-sm ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
                            {user.nickname || user.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {participants.length < 10 && (
                            <button
                              onClick={() => moveToParticipants(userId, true)}
                              className={`p-1 rounded text-xs ${
                                theme === 'dark'
                                  ? 'text-green-400 hover:bg-green-900/20'
                                  : 'text-green-600 hover:bg-green-100'
                              }`}
                              title="Promover a participante"
                            >
                              ↑
                            </button>
                          )}
                          <button
                            onClick={() => removeUser(userId)}
                            className={`p-1 rounded text-xs ${
                              theme === 'dark'
                                ? 'text-red-400 hover:bg-red-900/20'
                                : 'text-red-600 hover:bg-red-100'
                            }`}
                            title="Eliminar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {waitlist.length === 0 && (
                    <div className={`text-center py-8 text-sm ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      Lista vacía
                    </div>
                  )}
                </div>
              </div>

              {/* Available Users Column */}
              <div className={`p-4 rounded-lg border-2 ${
                theme === 'dark'
                  ? 'bg-slate-950/20 border-slate-600/30'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  <Users className="h-5 w-5" />
                  Disponibles ({availableUsers.length})
                </h3>

                <div className="space-y-2 min-h-[300px]">
                  {availableUsers.map(user => (
                    <div key={user.id} className={`flex items-center justify-between p-2 rounded ${
                      theme === 'dark' ? 'bg-slate-900/20' : 'bg-slate-100/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        {user.imageUrl && (
                          <img src={user.imageUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                        )}
                        <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {user.nickname || user.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {participants.length < 10 && (
                          <button
                            onClick={() => moveToParticipants(user.id)}
                            className={`px-2 py-1 rounded text-xs ${
                              theme === 'dark'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                            title="Agregar como participante"
                          >
                            +P
                          </button>
                        )}
                        <button
                          onClick={() => moveToWaitlist(user.id)}
                          className={`px-2 py-1 rounded text-xs ${
                            theme === 'dark'
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                              : 'bg-yellow-500 text-white hover:bg-yellow-600'
                          }`}
                          title="Agregar a lista de espera"
                        >
                          +E
                        </button>
                      </div>
                    </div>
                  ))}

                  {availableUsers.length === 0 && (
                    <div className={`text-center py-8 text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      No hay usuarios disponibles
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">
                  Organización de Equipos ({participants.length} jugadores)
                </h3>
                <button
                  onClick={regenerateTeams}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  🎲 Regenerar Equipos
                </button>
              </div>

              {editedGame.teams ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Team 1 */}
                    <div className={`p-4 rounded-lg border-2 ${
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
                        const displayName = playerId === currentUserId
                          ? (player?.name || player?.nickname)
                          : (player?.nickname || player?.name);
                        return (
                          <div key={playerId} className="flex justify-between items-center py-2">
                            <span className={theme === 'dark' ? 'text-red-400' : 'text-red-700'}>
                              {displayName}
                            </span>
                            <button
                              onClick={() => swapPlayerBetweenTeams(playerId)}
                              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            >
                              →
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Team 2 */}
                    <div className={`p-4 rounded-lg border-2 ${
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
                        const displayName = playerId === currentUserId
                          ? (player?.name || player?.nickname)
                          : (player?.nickname || player?.name);
                        return (
                          <div key={playerId} className="flex justify-between items-center py-2">
                            <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}>
                              {displayName}
                            </span>
                            <button
                              onClick={() => swapPlayerBetweenTeams(playerId)}
                              className={`text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 ${
                                theme === 'dark' ? 'bg-red-600 hover:bg-red-500' : ''
                              }`}
                            >
                              ←
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${
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
                <div className={`p-8 rounded-lg text-center ${
                  theme === 'dark' ? 'bg-accent/20' : 'bg-accent/10'
                }`}>
                  <p className="text-muted-foreground mb-4">
                    ⚽ Los equipos aún no han sido generados
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en &quot;🎲 Regenerar Equipos&quot; para crear equipos balanceados automáticamente
                  </p>
                </div>
              )}

              {/* Match Result Section */}
              {editedGame.status === 'completed' && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Resultado del Partido</h3>
                  <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-accent/20' : 'bg-accent/10'}`}>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          Goles Equipo 1
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
                          Goles Equipo 2
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
                          <div className="text-center p-2 bg-card rounded-lg border border-border w-full">
                            <div className="text-2xl font-bold text-foreground">
                              {editedGame.result.team1Score} - {editedGame.result.team2Score}
                            </div>
                            <div className="text-xs text-muted-foreground">Resultado</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Notas (opcional)
                      </label>
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
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0 bg-card">
          <button
            onClick={onClose}
            className="px-6 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/20 font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
              theme === 'dark'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
