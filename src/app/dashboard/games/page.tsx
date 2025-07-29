'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/store';
import { getSundaysInMonth, formatDate, generateTeams, createMockUsers } from '@/lib/utils';
import { Game, User } from '@/types';

interface EditGameModal {
  game: Game;
  onSave: (updatedGame: Game) => void;
  onClose: () => void;
  users: User[];
}

function EditGameModal({ game, onSave, onClose, users }: EditGameModal) {
  const [editedGame, setEditedGame] = useState<Game>({ ...game });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(game.participants);
  const [reservationInfo, setReservationInfo] = useState({
    location: game.reservationInfo?.location || '',
    time: game.reservationInfo?.time || '10:00',
    cost: game.reservationInfo?.cost?.toString() || '',
    reservedBy: game.reservationInfo?.reservedBy || ''
  });

  const handleSave = () => {
    const updatedGame: Game = {
      ...editedGame,
      participants: selectedParticipants,
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

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId].slice(0, 10) // Max 10 players
    );
  };

  const regenerateTeams = () => {
    if (selectedParticipants.length === 10) {
      const newTeams = generateTeams(selectedParticipants);
      setEditedGame(prev => ({ ...prev, teams: newTeams }));
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
              className="w-full p-2 border border-gray-300 rounded-lg"
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
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  value={reservationInfo.time}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo (opcional)</label>
                <input
                  type="number"
                  value={reservationInfo.cost}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reservado por</label>
                <input
                  type="text"
                  value={reservationInfo.reservedBy}
                  onChange={(e) => setReservationInfo(prev => ({ ...prev, reservedBy: e.target.value }))}
                  placeholder="Nombre de quien reservó"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Participants Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Participantes ({selectedParticipants.length}/10)
              </h3>
              {selectedParticipants.length === 10 && (
                <button
                  onClick={regenerateTeams}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Regenerar Equipos
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {users.filter(u => u.isWhitelisted && !u.isAdmin).map(user => (
                <label
                  key={user.id}
                  className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedParticipants.includes(user.id)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(user.id)}
                    onChange={() => toggleParticipant(user.id)}
                    disabled={!selectedParticipants.includes(user.id) && selectedParticipants.length >= 10}
                    className="mr-2"
                  />
                  <span className="text-sm">{user.nickname || user.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Teams Display and Edit */}
          {editedGame.teams && selectedParticipants.length === 10 && (
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
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showMockUsersButton, setShowMockUsersButton] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const allUsers = LocalStorage.getUsers();
      const allGames = LocalStorage.getGames();
      const userData = allUsers.find(u => u.id === user.id);
      
      setUsers(allUsers);
      setGames(allGames);
      setCurrentUser(userData || null);
      
      // Show mock users button if there are less than 10 users
      setShowMockUsersButton(allUsers.filter(u => u.isWhitelisted && !u.isAdmin).length < 10);
    }
  }, [isLoaded, user]);

  const handleCreateMockUsers = () => {
    createMockUsers();
    // Refresh users list
    const allUsers = LocalStorage.getUsers();
    setUsers(allUsers);
    setShowMockUsersButton(allUsers.filter(u => u.isWhitelisted && !u.isAdmin).length < 10);
  };

  const createTestMatch = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    
    const availableUsers = users.filter(u => u.isWhitelisted && !u.isAdmin);
    const selectedPlayers = availableUsers.slice(0, 10);
    
    if (selectedPlayers.length < 10) {
      alert(`Solo hay ${selectedPlayers.length} usuarios disponibles. Crea usuarios de prueba primero.`);
      return;
    }

    const testGame: Game = {
      id: `test-game-${Date.now()}`,
      date: nextSunday,
      status: 'confirmed',
      participants: selectedPlayers.map(p => p.id),
      reservationInfo: {
        location: 'Cancha de Prueba',
        time: '10:00',
        cost: 20,
        reservedBy: 'Administrador'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGames = [...games, testGame];
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
    
    alert('✅ Partido de prueba creado! Ahora puedes editarlo.');
  };

  const showDebugInfo = () => {
    const availability = LocalStorage.getMonthlyAvailability();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const upcomingSundays = getCurrentMonthSundays();
    const mockUsers = users.filter(u => u.id.startsWith('mock-user-'));
    
    // Check August availability
    const augustAvailability = availability.filter(a => a.month === 8 && a.year === currentYear);
    const mockUsersWithAugust = augustAvailability.filter(a => a.userId.startsWith('mock-user-'));
    
    const debugInfo = `
🔍 Información de Debug:

👥 Usuarios:
• Total: ${users.length}
• Mock users: ${mockUsers.length}
• Administradores: ${users.filter(u => u.isAdmin).length}
• Jugadores (whitelisted): ${users.filter(u => u.isWhitelisted && !u.isAdmin).length}

📅 Disponibilidad:
• Registros totales: ${availability.length}
• Mes actual: ${currentMonth}/${currentYear}
• Domingos próximos: ${upcomingSundays.length}

🗓️ Agosto ${currentYear}:
• Registros de disponibilidad: ${augustAvailability.length}
• Mock users con disponibilidad: ${mockUsersWithAugust.length}/${mockUsers.length}

🎮 Partidos:
• Total creados: ${games.length}
• Estados: ${games.map(g => g.status).join(', ') || 'Ninguno'}

👤 Usuario actual:
• Admin: ${currentUser?.isAdmin ? 'Sí' : 'No'}
• ID: ${currentUser?.id}
    `.trim();
    
    console.log(debugInfo);
    alert(debugInfo);
  };

  const getAvailablePlayersForSunday = (year: number, month: number, sunday: number): User[] => {
    const availability = LocalStorage.getMonthlyAvailability();
    return users.filter(user => {
      if (!user.isWhitelisted || user.isAdmin) return false;
      const userAvailability = availability.find(
        a => a.userId === user.id && a.month === month && a.year === year
      );
      return userAvailability?.availableSundays.includes(sunday) || false;
    });
  };

  const createGameForSunday = (year: number, month: number, sunday: number) => {
    const gameDate = new Date(year, month - 1, sunday);
    const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
    
    if (availablePlayers.length < 10) {
      alert(`Solo hay ${availablePlayers.length} jugadores disponibles. Se necesitan 10 para crear un partido.`);
      return;
    }

    const newGame: Game = {
      id: `game-${Date.now()}`,
      date: gameDate,
      status: availablePlayers.length >= 10 ? 'confirmed' : 'scheduled',
      participants: availablePlayers.slice(0, 10).map(p => p.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
  };

  const organizeTeams = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.participants.length !== 10) return;

    const teams = generateTeams(game.participants);
    const updatedGame = { ...game, teams, updatedAt: new Date() };
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
  };

  const deleteGame = (gameId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este partido?')) return;
    
    const updatedGames = games.filter(g => g.id !== gameId);
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
  };

  const handleEditGame = (updatedGame: Game) => {
    const updatedGames = games.map(g => g.id === updatedGame.id ? updatedGame : g);
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
    setEditingGame(null);
  };

  const getCurrentMonthSundays = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Always show August (where mock users have availability) and current month
    const monthsToShow = [
      { year: currentYear, month: 8 }, // August with mock users
      { year: currentYear, month: currentMonth }, // Current month
    ];
    
    // Remove duplicates if current month is August
    const uniqueMonths = monthsToShow.filter((item, index, arr) => 
      index === arr.findIndex(t => t.year === item.year && t.month === item.month)
    );
    
    const allSundays = [];
    
    for (const { year, month } of uniqueMonths) {
      const sundays = getSundaysInMonth(year, month);
      
      const filteredSundays = sundays
        .filter(sunday => {
          // For current month, only show future dates
          // For August, show all dates to see mock availability
          if (month === currentMonth && year === currentYear) {
            const sundayDate = new Date(year, month - 1, sunday);
            return sundayDate >= now;
          }
          return true; // Show all August Sundays
        })
        .map(sunday => {
          const date = new Date(year, month - 1, sunday);
          const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
          const existingGame = games.find(g => 
            g.date.getTime() === date.getTime()
          );
          
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

  if (!isLoaded || !currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const upcomingSundays = getCurrentMonthSundays();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Partidos Programados</h1>
            <p className="text-gray-600">Gestiona partidos de Agosto (usuarios mock) y del mes actual</p>
          </div>
          <div className="flex gap-2">
            {showMockUsersButton && currentUser.isAdmin && (
              <button
                onClick={handleCreateMockUsers}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <span>👥</span>
                Crear Usuarios de Prueba
              </button>
            )}
            {currentUser?.isAdmin && (
              <>
                <button
                  onClick={createTestMatch}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <span>🎮</span>
                  Crear Partido de Prueba
                </button>
                <button
                  onClick={showDebugInfo}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <span>🔍</span>
                  Debug Info
                </button>
              </>
            )}
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
                      <button
                        onClick={() => deleteGame(existingGame.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Eliminar
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
                    <p><strong>Lugar:</strong> {existingGame.reservationInfo.location}</p>
                    <p><strong>Hora:</strong> {existingGame.reservationInfo.time}</p>
                    {existingGame.reservationInfo.cost && (
                      <p><strong>Costo:</strong> ${existingGame.reservationInfo.cost}</p>
                    )}
                    {existingGame.reservationInfo.reservedBy && (
                      <p><strong>Reservado por:</strong> {existingGame.reservationInfo.reservedBy}</p>
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