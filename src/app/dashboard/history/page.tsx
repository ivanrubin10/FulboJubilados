'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Game, User } from '@/types';
import { useToast } from '@/components/ui/toast';

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
  
  async updateGame(gameId: string, updates: Partial<Game>) {
    const res = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update game');
    return res.json();
  }
};

export default function HistoryPage() {
  const { user, isLoaded } = useUser();
  const { success, error } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultForm, setResultForm] = useState({
    team1Score: 0,
    team2Score: 0,
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [allUsers, allGames] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getGames()
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
      } catch (err) {
        console.error('Error loading history data:', err);
        error('Error de carga', 'No se pudieron cargar los datos del historial');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoaded, user, error]);

  const completedGames = games.filter(game => game.status === 'completed');
  const confirmedGames = games.filter(game => 
    game.status === 'confirmed' && 
    game.teams && 
    new Date(game.date) < new Date()
  );

  const addResult = async (gameId: string) => {
    try {
      const updates = {
        status: 'completed' as const,
        result: {
          team1Score: resultForm.team1Score,
          team2Score: resultForm.team2Score,
          notes: resultForm.notes,
        },
        updatedAt: new Date()
      };
      
      await apiClient.updateGame(gameId, updates);
      
      const updatedGames = games.map(game => 
        game.id === gameId ? { ...game, ...updates } : game
      );
      
      setGames(updatedGames);
      setSelectedGame(null);
      setResultForm({ team1Score: 0, team2Score: 0, notes: '' });
      success('Resultado guardado', 'El resultado del partido se ha guardado correctamente');
    } catch (err) {
      console.error('Error saving result:', err);
      error('Error al guardar', 'No se pudo guardar el resultado del partido');
    }
  };

  const getPlayerName = (playerId: string): string => {
    const player = users.find(u => u.id === playerId);
    return player?.nickname || player?.name || 'Jugador desconocido';
  };

  const getTeamStats = () => {
    const stats: Record<string, { 
      wins: number; 
      losses: number; 
      draws: number; 
      goalsFor: number; 
      goalsAgainst: number;
      player: User;
    }> = {};
    
    completedGames.forEach(game => {
      if (!game.teams || !game.result) return;
      
      const { team1, team2 } = game.teams;
      const { team1Score, team2Score } = game.result;
      
      [...team1, ...team2].forEach(playerId => {
        const player = users.find(u => u.id === playerId);
        if (!stats[playerId] && player) {
          stats[playerId] = { 
            wins: 0, 
            losses: 0, 
            draws: 0, 
            goalsFor: 0, 
            goalsAgainst: 0,
            player 
          };
        }
      });
      
      if (team1Score > team2Score) {
        team1.forEach(playerId => {
          if (stats[playerId]) {
            stats[playerId].wins++;
            stats[playerId].goalsFor += team1Score;
            stats[playerId].goalsAgainst += team2Score;
          }
        });
        team2.forEach(playerId => {
          if (stats[playerId]) {
            stats[playerId].losses++;
            stats[playerId].goalsFor += team2Score;
            stats[playerId].goalsAgainst += team1Score;
          }
        });
      } else if (team2Score > team1Score) {
        team2.forEach(playerId => {
          if (stats[playerId]) {
            stats[playerId].wins++;
            stats[playerId].goalsFor += team2Score;
            stats[playerId].goalsAgainst += team1Score;
          }
        });
        team1.forEach(playerId => {
          if (stats[playerId]) {
            stats[playerId].losses++;
            stats[playerId].goalsFor += team1Score;
            stats[playerId].goalsAgainst += team2Score;
          }
        });
      } else {
        [...team1, ...team2].forEach(playerId => {
          if (stats[playerId]) {
            stats[playerId].draws++;
            stats[playerId].goalsFor += team1Score; // Same for both teams in draw
            stats[playerId].goalsAgainst += team2Score;
          }
        });
      }
    });
    
    return stats;
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-black">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Usuario no encontrado</div>;
  }

  const teamStats = getTeamStats();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-black mb-2">Historial de Partidos</h1>
        <p className="text-black">Resultados y estadísticas de los partidos que jugaste</p>
        <p className="text-sm text-slate-600 mt-1">📊 Los goles del equipo se les adjudican a todos los jugadores del equipo</p>
      </div>

      {/* Partidos pendientes de resultado */}
      {confirmedGames.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">
            Partidos que necesitan resultado
          </h2>
          <div className="space-y-4">
            {confirmedGames.map(game => (
              <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-black">{formatDate(new Date(game.date))}</h3>
                    {game.reservationInfo && (
                      <p className="text-sm text-black">
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
                      <ul className="text-sm text-black">
                        {game.teams.team1.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <h4 className="font-medium text-blue-800 mb-2">Equipo 2</h4>
                      <ul className="text-sm text-black">
                        {game.teams.team2.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedGame === game.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium mb-3 text-black">Agregar resultado</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-black placeholder:text-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
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
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-black placeholder:text-gray-600"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-black mb-1">
                        Notas (opcional)
                      </label>
                      <textarea
                        value={resultForm.notes}
                        onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 placeholder:text-gray-600"
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
                        className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
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
        <h2 className="text-xl font-semibold text-black mb-4">
          Partidos jugados ({completedGames.length})
        </h2>
        
        {completedGames.length > 0 ? (
          <div className="space-y-4">
            {completedGames
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(game => (
                <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-black">{formatDate(new Date(game.date))}</h3>
                      {game.reservationInfo && (
                        <p className="text-sm text-black">
                          {game.reservationInfo.location} - {game.reservationInfo.time}
                        </p>
                      )}
                    </div>
                    
                    {game.result && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-black">
                          {game.result.team1Score} - {game.result.team2Score}
                        </div>
                        <div className="text-sm text-black">
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
                        <ul className="text-sm text-black">
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
                        <ul className="text-sm text-black">
                          {game.teams.team2.map(playerId => (
                            <li key={playerId}>{getPlayerName(playerId)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {game.result?.notes && (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-black">
                        <strong>Notas:</strong> {game.result.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-black text-center py-8">
            Todavía no hay partidos jugados
          </p>
        )}
      </div>

      {/* Estadísticas y Ranking */}
      {Object.keys(teamStats).length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ranking de Victorias */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-semibold text-black">Top Ganadores</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .sort(([,a], [,b]) => b.wins - a.wins)
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-black' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-black">{stats.player.nickname || stats.player.name}</p>
                        <p className="text-xs text-black">{stats.wins + stats.losses + stats.draws} partidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">{stats.wins}</p>
                      <p className="text-xs text-black">victorias</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Mejores % de Victoria */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📈</span>
              <h2 className="text-xl font-semibold text-black">Mejor Efectividad</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .filter(([, stats]) => (stats.wins + stats.losses + stats.draws) >= 3) // Mínimo 3 partidos
                .sort(([,a], [,b]) => {
                  const totalA = a.wins + a.losses + a.draws;
                  const totalB = b.wins + b.losses + b.draws;
                  const winRateA = totalA > 0 ? a.wins / totalA : 0;
                  const winRateB = totalB > 0 ? b.wins / totalB : 0;
                  return winRateB - winRateA;
                })
                .slice(0, 5)
                .map(([playerId, stats], index) => {
                  const total = stats.wins + stats.losses + stats.draws;
                  const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-black' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-black">{stats.player.nickname || stats.player.name}</p>
                          <p className="text-xs text-black">{stats.wins}V - {stats.losses}D - {stats.draws}E</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-black">{winRate}%</p>
                        <p className="text-xs text-black">efectividad</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Estadísticas Generales */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-semibold text-black">Estadísticas</h2>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-800">{completedGames.length}</p>
                <p className="text-sm text-black">Partidos jugados</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-800">
                  {completedGames.reduce((sum, game) => {
                    if (game.result) {
                      return sum + game.result.team1Score + game.result.team2Score;
                    }
                    return sum;
                  }, 0)}
                </p>
                <p className="text-sm text-black">Goles totales</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-800">
                  {Math.round(completedGames.reduce((sum, game) => {
                    if (game.result) {
                      return sum + game.result.team1Score + game.result.team2Score;
                    }
                    return sum;
                  }, 0) / Math.max(completedGames.length, 1) * 10) / 10}
                </p>
                <p className="text-sm text-black">Goles por partido</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-800">
                  {Object.keys(teamStats).length}
                </p>
                <p className="text-sm text-black">Jugadores activos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      {Object.keys(teamStats).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-black mb-2">Estadísticas Detalladas</h2>
          <p className="text-sm text-slate-600 mb-4">Los goles corresponden al equipo completo en cada partido</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-2 text-black">Pos</th>
                  <th className="text-left py-3 px-2 text-black">Jugador</th>
                  <th className="text-center py-3 px-2 text-black">PJ</th>
                  <th className="text-center py-3 px-2 text-black">V</th>
                  <th className="text-center py-3 px-2 text-black">E</th>
                  <th className="text-center py-3 px-2 text-black">D</th>
                  <th className="text-center py-3 px-2 text-black" title="Goles a favor - Goles del equipo">GF</th>
                  <th className="text-center py-3 px-2 text-black" title="Goles en contra - Goles del equipo rival">GC</th>
                  <th className="text-center py-3 px-2 text-black">DG</th>
                  <th className="text-center py-3 px-2 text-black">%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(teamStats)
                  .sort(([,a], [,b]) => {
                    const totalA = a.wins + a.losses + a.draws;
                    const totalB = b.wins + b.losses + b.draws;
                    const winRateA = totalA > 0 ? a.wins / totalA : 0;
                    const winRateB = totalB > 0 ? b.wins / totalB : 0;
                    
                    // First sort by total wins, then by win rate, then by goal difference
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    if (winRateB !== winRateA) return winRateB - winRateA;
                    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                  })
                  .map(([playerId, stats], index) => {
                    const total = stats.wins + stats.losses + stats.draws;
                    const winRate = total > 0 ? ((stats.wins / total) * 100).toFixed(1) : '0.0';
                    const goalDiff = stats.goalsFor - stats.goalsAgainst;
                    
                    return (
                      <tr key={playerId} className={`border-b hover:bg-gray-50 ${
                        index < 3 ? 'bg-amber-50' : ''
                      }`}>
                        <td className="py-3 px-2 font-medium text-black">{index + 1}</td>
                        <td className="py-3 px-2 text-black">
                          <div className="flex items-center gap-2">
                            {stats.player.imageUrl && (
                              <img 
                                src={stats.player.imageUrl} 
                                alt={stats.player.name} 
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="font-medium text-black">{stats.player.nickname || stats.player.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-black">{total}</td>
                        <td className="text-center py-3 px-2 text-black font-semibold">{stats.wins}</td>
                        <td className="text-center py-3 px-2 text-black">{stats.draws}</td>
                        <td className="text-center py-3 px-2 text-black">{stats.losses}</td>
                        <td className="text-center py-3 px-2 text-black">{stats.goalsFor}</td>
                        <td className="text-center py-3 px-2 text-black">{stats.goalsAgainst}</td>
                        <td className="text-center py-3 px-2 font-medium text-black">
                          {goalDiff > 0 ? '+' : ''}{goalDiff}
                        </td>
                        <td className="text-center py-3 px-2 font-semibold text-black">{winRate}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-black">
            <p><strong>PJ:</strong> Partidos Jugados, <strong>V:</strong> Victorias, <strong>E:</strong> Empates, <strong>D:</strong> Derrotas</p>
            <p><strong>GF:</strong> Goles a Favor, <strong>GC:</strong> Goles en Contra, <strong>DG:</strong> Diferencia de Goles, <strong>%:</strong> Porcentaje de Victorias</p>
          </div>
        </div>
      )}

      {/* Hall of Shame - Jugadores con más ausencias */}
      {(() => {
        // Calcular ausencias para cada jugador activo
        const playerAbsences: Record<string, { player: User; attended: number; totalGames: number; absences: number }> = {};
        
        // Inicializar todos los jugadores activos (whitelisted, no admin)
        users.forEach(user => {
          if (user.isWhitelisted && !user.isAdmin) {
            playerAbsences[user.id] = {
              player: user,
              attended: 0,
              totalGames: completedGames.length,
              absences: 0
            };
          }
        });
        
        // Contar asistencias para cada jugador
        completedGames.forEach(game => {
          if (game.teams) {
            const playersWhoAttended = [...game.teams.team1, ...game.teams.team2];
            playersWhoAttended.forEach(playerId => {
              if (playerAbsences[playerId]) {
                playerAbsences[playerId].attended++;
              }
            });
          }
        });
        
        // Calcular ausencias y filtrar solo jugadores que faltaron al menos una vez
        const playersWithAbsences = Object.values(playerAbsences)
          .map(data => ({
            ...data,
            absences: data.totalGames - data.attended
          }))
          .filter(data => data.absences > 0 && data.totalGames > 0) // Solo jugadores que faltaron al menos una vez
          .sort((a, b) => b.absences - a.absences) // Ordenar por más ausencias
          .slice(0, 5); // Top 5
        
        return playersWithAbsences.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💀</span>
              <h2 className="text-xl font-semibold text-black">Hall of Shame</h2>
              <span className="text-sm text-black opacity-70">(Jugadores con más ausencias)</span>
            </div>
            <div className="space-y-3">
              {playersWithAbsences.map((data, index) => {
                const attendanceRate = data.totalGames > 0 ? ((data.attended / data.totalGames) * 100).toFixed(1) : '0.0';
                
                return (
                  <div key={data.player.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-red-100 text-red-800">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {data.player.imageUrl && (
                          <img 
                            src={data.player.imageUrl} 
                            alt={data.player.name} 
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-black">{data.player.nickname || data.player.name}</p>
                          <p className="text-xs text-black">
                            {data.attended}/{data.totalGames} partidos - {attendanceRate}% asistencia
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700">{data.absences}</p>
                      <p className="text-xs text-black">ausencias</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}