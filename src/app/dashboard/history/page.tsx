'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { Game, User } from '@/types';

export default function HistoryPage() {
  const { user, isLoaded } = useUser();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({
    team1Score: 0,
    team2Score: 0,
    notes: '',
  });

  useEffect(() => {
    if (isLoaded && user) {
      const allUsers = LocalStorage.getUsers();
      const allGames = LocalStorage.getGames();
      const userData = allUsers.find(u => u.id === user.id);
      
      setUsers(allUsers);
      setGames(allGames);
      setCurrentUser(userData || null);
    }
  }, [isLoaded, user]);

  const completedGames = games.filter(game => game.status === 'completed');
  const confirmedGames = games.filter(game => 
    game.status === 'confirmed' && 
    game.teams && 
    new Date(game.date) < new Date()
  );

  const addResult = (gameId: string) => {
    const updatedGames = games.map(game => 
      game.id === gameId 
        ? { 
            ...game, 
            status: 'completed' as const,
            result: {
              team1Score: resultForm.team1Score,
              team2Score: resultForm.team2Score,
              notes: resultForm.notes,
            },
            updatedAt: new Date()
          }
        : game
    );
    
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
    setSelectedGame(null);
    setResultForm({ team1Score: 0, team2Score: 0, notes: '' });
  };

  const getPlayerName = (playerId: string): string => {
    const player = users.find(u => u.id === playerId);
    return player?.name || 'Jugador desconocido';
  };

  const getTeamStats = () => {
    const stats: Record<string, { wins: number; losses: number; draws: number }> = {};
    
    completedGames.forEach(game => {
      if (!game.teams || !game.result) return;
      
      const { team1, team2 } = game.teams;
      const { team1Score, team2Score } = game.result;
      
      [...team1, ...team2].forEach(playerId => {
        if (!stats[playerId]) {
          stats[playerId] = { wins: 0, losses: 0, draws: 0 };
        }
      });
      
      if (team1Score > team2Score) {
        team1.forEach(playerId => stats[playerId].wins++);
        team2.forEach(playerId => stats[playerId].losses++);
      } else if (team2Score > team1Score) {
        team2.forEach(playerId => stats[playerId].wins++);
        team1.forEach(playerId => stats[playerId].losses++);
      } else {
        [...team1, ...team2].forEach(playerId => stats[playerId].draws++);
      }
    });
    
    return stats;
  };

  if (!isLoaded || !currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const teamStats = getTeamStats();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Historial de Partidos</h1>
        <p className="text-gray-600">Resultados y estadísticas de los partidos jugados</p>
      </div>

      {/* Partidos pendientes de resultado */}
      {confirmedGames.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Partidos pendientes de resultado
          </h2>
          <div className="space-y-4">
            {confirmedGames.map(game => (
              <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">{formatDate(new Date(game.date))}</h3>
                    {game.reservationInfo && (
                      <p className="text-sm text-gray-600">
                        {game.reservationInfo.location} - {game.reservationInfo.time}
                      </p>
                    )}
                  </div>
                  
                  {currentUser.isAdmin && (
                    <button
                      onClick={() => setSelectedGame(game.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Agregar Resultado
                    </button>
                  )}
                </div>

                {game.teams && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded">
                      <h4 className="font-medium text-red-800 mb-2">Equipo 1</h4>
                      <ul className="text-sm text-red-700">
                        {game.teams.team1.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800 mb-2">Equipo 2</h4>
                      <ul className="text-sm text-blue-700">
                        {game.teams.team2.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedGame === game.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium mb-3">Agregar resultado</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Goles Equipo 1
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={resultForm.team1Score}
                          onChange={(e) => setResultForm(prev => ({ 
                            ...prev, 
                            team1Score: parseInt(e.target.value) || 0 
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Goles Equipo 2
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={resultForm.team2Score}
                          onChange={(e) => setResultForm(prev => ({ 
                            ...prev, 
                            team2Score: parseInt(e.target.value) || 0 
                          }))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas (opcional)
                      </label>
                      <textarea
                        value={resultForm.notes}
                        onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        rows={3}
                        placeholder="Comentarios sobre el partido..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addResult(game.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Guardar Resultado
                      </button>
                      <button
                        onClick={() => setSelectedGame(null)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de partidos completados */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Partidos completados ({completedGames.length})
        </h2>
        
        {completedGames.length > 0 ? (
          <div className="space-y-4">
            {completedGames
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(game => (
                <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">{formatDate(new Date(game.date))}</h3>
                      {game.reservationInfo && (
                        <p className="text-sm text-gray-600">
                          {game.reservationInfo.location} - {game.reservationInfo.time}
                        </p>
                      )}
                    </div>
                    
                    {game.result && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {game.result.team1Score} - {game.result.team2Score}
                        </div>
                        <div className="text-sm text-gray-600">
                          {game.result.team1Score > game.result.team2Score 
                            ? 'Victoria Equipo 1' 
                            : game.result.team2Score > game.result.team1Score 
                              ? 'Victoria Equipo 2' 
                              : 'Empate'
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  {game.teams && (
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className={`p-3 rounded ${
                        game.result && game.result.team1Score > game.result.team2Score 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50'
                      }`}>
                        <h4 className="font-medium text-red-800 mb-2">
                          Equipo 1 {game.result && `(${game.result.team1Score})`}
                        </h4>
                        <ul className="text-sm text-red-700">
                          {game.teams.team1.map(playerId => (
                            <li key={playerId}>{getPlayerName(playerId)}</li>
                          ))}
                        </ul>
                      </div>
                      <div className={`p-3 rounded ${
                        game.result && game.result.team2Score > game.result.team1Score 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-blue-50'
                      }`}>
                        <h4 className="font-medium text-blue-800 mb-2">
                          Equipo 2 {game.result && `(${game.result.team2Score})`}
                        </h4>
                        <ul className="text-sm text-blue-700">
                          {game.teams.team2.map(playerId => (
                            <li key={playerId}>{getPlayerName(playerId)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {game.result?.notes && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Notas:</strong> {game.result.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No hay partidos completados aún
          </p>
        )}
      </div>

      {/* Estadísticas */}
      {Object.keys(teamStats).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas de Jugadores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Jugador</th>
                  <th className="text-center py-2">Victorias</th>
                  <th className="text-center py-2">Derrotas</th>
                  <th className="text-center py-2">Empates</th>
                  <th className="text-center py-2">Partidos</th>
                  <th className="text-center py-2">% Victorias</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(teamStats)
                  .sort(([,a], [,b]) => {
                    const totalA = a.wins + a.losses + a.draws;
                    const totalB = b.wins + b.losses + b.draws;
                    const winRateA = totalA > 0 ? a.wins / totalA : 0;
                    const winRateB = totalB > 0 ? b.wins / totalB : 0;
                    return winRateB - winRateA;
                  })
                  .map(([playerId, stats]) => {
                    const total = stats.wins + stats.losses + stats.draws;
                    const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <tr key={playerId} className="border-b">
                        <td className="py-2">{getPlayerName(playerId)}</td>
                        <td className="text-center py-2 text-green-600">{stats.wins}</td>
                        <td className="text-center py-2 text-red-600">{stats.losses}</td>
                        <td className="text-center py-2 text-yellow-600">{stats.draws}</td>
                        <td className="text-center py-2">{total}</td>
                        <td className="text-center py-2">{winRate}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}