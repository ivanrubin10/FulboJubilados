'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { getSundaysInMonth, formatDate, generateTeams } from '@/lib/utils';
import { Game, User, MonthlyAvailability } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

// API helper functions
const apiClient = {
  async getUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  
  async getGames() {
    const res = await fetch('/api/games');
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
  }
};

interface EditGameModal {
  game: Game;
  onSave: (updatedGame: Game) => void;
  onClose: () => void;
  users: User[];
}

function EditGameModal({ game, onSave, onClose, users }: EditGameModal) {
  const [editedGame, setEditedGame] = useState<Game>({ ...game });
  const [reservationInfo, setReservationInfo] = useState({
    location: game.reservationInfo?.location || '',
    time: game.reservationInfo?.time || '10:00',
    cost: game.reservationInfo?.cost?.toString() || '',
    reservedBy: game.reservationInfo?.reservedBy || ''
  });

  const handleSave = () => {
    const updatedGame: Game = {
      ...editedGame,
      participants: game.participants, // Keep original participants - no selection needed
      reservationInfo: reservationInfo.location ? {
        location: reservationInfo.location,
        time: reservationInfo.time,
        cost: reservationInfo.cost ? parseFloat(reservationInfo.cost) : undefined,
        reservedBy: reservationInfo.reservedBy
      } : undefined,
      updatedAt: new Date()
    };
    onSave(updatedGame);
  };

  const regenerateTeams = () => {
    const newTeams = generateTeams(game.participants);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Editar Partido</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Game Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado del Partido</label>
            <select
              value={editedGame.status}
              onChange={(e) => setEditedGame(prev => ({ ...prev, status: e.target.value as Game['status'] }))}
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="scheduled">Programado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Reservation Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información de Reserva</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                <input
                  type="text"
                  value={reservationInfo.location}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ej: Cancha Municipal"
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  value={reservationInfo.time}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo (opcional)</label>
                <input
                  type="number"
                  value={reservationInfo.cost}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservado por</label>
                <input
                  type="text"
                  value={reservationInfo.reservedBy}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, reservedBy: e.target.value }))}
                  placeholder="Nombre de quien reservó"
                  className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Participants Display - No selection needed, all available players assumed */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Participantes Confirmados ({game.participants.length})
              </h3>
              <button
                onClick={regenerateTeams}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Regenerar Equipos
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid md:grid-cols-3 gap-2">
                {game.participants.map(participantId => {
                  const player = users.find(u => u.id === participantId);
                  return (
                    <div
                      key={participantId}
                      className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      {player?.nickname || player?.name || 'Jugador desconocido'}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                💡 Los participantes se confirman automáticamente según disponibilidad. No es necesario seleccionar manualmente.
              </p>
            </div>
          </div>

          {/* Teams Display and Edit */}
          {editedGame.teams && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Equipos</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Equipo 1 ({editedGame.teams.team1.length})</h4>
                  {editedGame.teams.team1.map(playerId => {
                    const player = users.find(u => u.id === playerId);
                    return (
                      <div key={playerId} className="flex justify-between items-center py-1">
                        <span className="text-red-700">{player?.nickname || player?.name}</span>
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
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Equipo 2 ({editedGame.teams.team2.length})</h4>
                  {editedGame.teams.team2.map(playerId => {
                    const player = users.find(u => u.id === playerId);
                    return (
                      <div key={playerId} className="flex justify-between items-center py-1">
                        <span className="text-blue-700">{player?.nickname || player?.name}</span>
                        <button
                          onClick={() => swapPlayerBetweenTeams(playerId)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        >
                          ←
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { user, isLoaded } = useUser();
  const { success, error } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [isLoading, setIsLoading] = useState(true);
  const [availability, setAvailability] = useState<MonthlyAvailability[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [allUsers, allGames, monthlyAvailability] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getGames(),
          apiClient.getMonthlyAvailability()
        ]);
        
        const userData = allUsers.find((u: User) => u.id === user.id);
        
        // Fix dates that might be serialized as strings
        const gamesWithFixedDates = allGames.map((game: Game) => ({
          ...game,
          date: new Date(game.date),
          createdAt: new Date(game.createdAt),
          updatedAt: new Date(game.updatedAt),
        }));
      
      setUsers(allUsers);
        setGames(gamesWithFixedDates);
      setCurrentUser(userData || null);
        setAvailability(monthlyAvailability);
      } catch (error) {
        console.error('Error loading games data:', error);
      } finally {
        setIsLoading(false);
    }
    };

    loadData();
  }, [isLoaded, user]);

  const getAvailablePlayersForSunday = (year: number, month: number, sunday: number): User[] => {
    return users.filter(user => {
      // Include all whitelisted users (both admins and regular players)
      if (!user.isWhitelisted) return false;
      
      const userAvailability = availability.find(
        a => a.userId === user.id && a.month === month && a.year === year
      );
      
      // Only show users who have explicitly voted for this Sunday
      return userAvailability?.availableSundays.includes(sunday) || false;
    });
  };

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

  const updateGame = async (gameId: string, updatedGame: Game) => {
    try {
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
      setGames(updatedGames);
      await apiClient.saveGames(updatedGames);
    } catch (error) {
      console.error('Error updating game:', error);
    }
  };


  const handleEditGame = async (updatedGame: Game) => {
    try {
      const updatedGames = games.map(g => g.id === updatedGame.id ? updatedGame : g);
      setGames(updatedGames);
      await apiClient.saveGames(updatedGames);
      setEditingGame(null);
    } catch (error) {
      console.error('Error editing game:', error);
    }
  };

  const getCurrentMonthSundays = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Show current and next month's Sundays
    const monthsToShow = [
      { year: currentYear, month: currentMonth },
      { year: currentMonth === 12 ? currentYear + 1 : currentYear, month: currentMonth === 12 ? 1 : currentMonth + 1 }
    ];
    
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

  const organizeTeams = async (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.participants.length !== 10) return;

    const teams = generateTeams(game.participants);
    const updatedGame = { ...game, teams, updatedAt: new Date() };
    
    try {
      const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
      setGames(updatedGames);
      await apiClient.saveGames(updatedGames);
    } catch (error) {
      console.error('Error organizing teams:', error);
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

  if (!currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const upcomingSundays = getCurrentMonthSundays();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Partidos Programados</h1>
            <p className="text-gray-600">Gestiona partidos y organiza equipos automáticamente</p>
          </div>

        </div>
      </div>

      <div className="space-y-6">
        {upcomingSundays.map(({ date, sunday, month, year, availablePlayers, existingGame }, index) => {
          // Show month header for first item or when month changes
          const showMonthHeader = index === 0 || upcomingSundays[index - 1].month !== month;
          
          return (
            <div key={`${year}-${month}-${sunday}`}>
              {showMonthHeader && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    {month === 8 ? '🗓️ Agosto (Mock Users Disponibles)' : `📅 ${new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}`}
                  </h2>
                </div>
              )}
              <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatDate(date)}
                </h3>
                <p className="text-sm text-gray-600">
                  {availablePlayers.length} jugadores disponibles
                </p>
              </div>
              
              {!existingGame && availablePlayers.length >= 10 && (
                <button
                  onClick={() => createGameForSunday(year, month, sunday)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Confirmar Partido
                </button>
              )}
              
              {existingGame && existingGame.status === 'confirmed' && existingGame.participants.length >= 10 && (
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                  <span>🚫</span>
                  <span className="text-sm font-medium">Día completo (10 jugadores)</span>
                </div>
              )}
            </div>

            {availablePlayers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Jugadores disponibles:</h4>
                <div className="flex flex-wrap gap-2">
                  {availablePlayers.map(player => (
                    <span
                      key={player.id}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {player.nickname || player.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {existingGame && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    existingGame.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : existingGame.status === 'completed'
                      ? 'bg-purple-100 text-purple-800'
                      : existingGame.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {existingGame.status === 'confirmed' ? 'Confirmado' 
                     : existingGame.status === 'completed' ? 'Completado'
                     : existingGame.status === 'cancelled' ? 'Cancelado'
                     : 'Programado'}
                  </span>
                  
                  {currentUser.isAdmin && (
                    <div className="flex gap-2">
                      {!existingGame.teams && existingGame.participants.length === 10 && (
                    <button
                      onClick={() => organizeTeams(existingGame.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Organizar Equipos
                    </button>
                      )}
                      <button
                        onClick={() => setEditingGame(existingGame)}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                {existingGame.teams && (
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-red-800 mb-2">Equipo 1</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team1.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className="text-red-700 flex items-center gap-2">
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
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">Equipo 2</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team2.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className="text-blue-700 flex items-center gap-2">
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

                {existingGame.reservationInfo && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-800 mb-2">Información de Reserva</h5>
                    <p className="text-gray-900"><strong>Lugar:</strong> {existingGame.reservationInfo.location}</p>
                    <p className="text-gray-900"><strong>Hora:</strong> {existingGame.reservationInfo.time}</p>
                    {existingGame.reservationInfo.cost && (
                      <p className="text-gray-900"><strong>Costo:</strong> ${existingGame.reservationInfo.cost}</p>
                    )}
                    {existingGame.reservationInfo.reservedBy && (
                      <p className="text-gray-900"><strong>Reservado por:</strong> {existingGame.reservationInfo.reservedBy}</p>
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
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">No hay domingos disponibles</p>
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
    </div>
  );
}