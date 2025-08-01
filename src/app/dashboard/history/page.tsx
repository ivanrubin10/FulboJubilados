'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Game, User } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/theme-context';

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
  const { theme } = useTheme();
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
          <p className="text-foreground">Cargando historial...</p>
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
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Historial de Partidos</h1>
        <p className="text-foreground">Resultados y estadísticas de los partidos que jugaste</p>
        <p className="text-sm text-muted-foreground mt-1">📊 Los goles del equipo se les adjudican a todos los jugadores del equipo</p>
      </div>

      {/* Partidos pendientes de resultado */}
      {confirmedGames.length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Partidos que necesitan resultado
          </h2>
          <div className="space-y-4">
            {confirmedGames.map(game => (
              <div key={game.id} className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{formatDate(new Date(game.date))}</h3>
                    {game.reservationInfo && (
                      <p className="text-sm text-foreground">
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
                    <div className={`p-3 rounded ${
                      theme === 'dark' ? 'bg-red-950/40 border border-red-600/30' : 'bg-red-50'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        theme === 'dark' ? 'text-red-300' : 'text-red-800'
                      }`}>Equipo 1</h4>
                      <ul className="text-sm text-foreground">
                        {game.teams.team1.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                    <div className={`p-3 rounded ${
                      theme === 'dark' ? 'bg-blue-950/40 border border-blue-600/30' : 'bg-blue-50'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                      }`}>Equipo 2</h4>
                      <ul className="text-sm text-foreground">
                        {game.teams.team2.map(playerId => (
                          <li key={playerId}>{getPlayerName(playerId)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedGame === game.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-medium mb-3 text-foreground">Agregar resultado</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
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
                          className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
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
                          className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Notas (opcional)
                      </label>
                      <textarea
                        value={resultForm.notes}
                        onChange={(e) => setResultForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full border border-border rounded-md px-3 py-2 placeholder:text-muted-foreground"
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
                        className="bg-accent text-muted-foreground px-4 py-2 rounded-lg hover:bg-accent/80"
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
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Partidos jugados ({completedGames.length})
        </h2>
        
        {completedGames.length > 0 ? (
          <div className="space-y-4">
            {completedGames
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(game => (
                <div key={game.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{formatDate(new Date(game.date))}</h3>
                      {game.reservationInfo && (
                        <p className="text-sm text-foreground">
                          {game.reservationInfo.location} - {game.reservationInfo.time}
                        </p>
                      )}
                    </div>
                    
                    {game.result && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {game.result.team1Score} - {game.result.team2Score}
                        </div>
                        <div className="text-sm text-foreground">
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
                          ? (theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200')
                          : (theme === 'dark' ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200')
                      }`}>
                        <h4 className={`font-medium mb-2 ${
                          theme === 'dark' ? 'text-red-300' : 'text-red-700'
                        }`}>
                          Equipo 1 {game.result && `(${game.result.team1Score})`}
                        </h4>
                        <ul className="text-sm text-foreground">
                          {game.teams.team1.map(playerId => (
                            <li key={playerId}>{getPlayerName(playerId)}</li>
                          ))}
                        </ul>
                      </div>
                      <div className={`p-3 rounded ${
                        game.result && game.result.team2Score > game.result.team1Score 
                          ? (theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200')
                          : (theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200')
                      }`}>
                        <h4 className={`font-medium mb-2 ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          Equipo 2 {game.result && `(${game.result.team2Score})`}
                        </h4>
                        <ul className="text-sm text-foreground">
                          {game.teams.team2.map(playerId => (
                            <li key={playerId}>{getPlayerName(playerId)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {game.result?.notes && (
                    <div className="bg-accent/20 p-3 rounded">
                      <p className="text-sm text-foreground">
                        <strong>Notas:</strong> {game.result.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <p className="text-foreground text-center py-8">
            Todavía no hay partidos jugados
          </p>
        )}
      </div>

      {/* Estadísticas y Ranking */}
      {Object.keys(teamStats).length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ranking de Victorias */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-semibold text-foreground">Top Ganadores</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .sort(([,a], [,b]) => b.wins - a.wins)
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-600 text-yellow-100' :
                        index === 1 ? 'bg-accent text-foreground' :
                        index === 2 ? 'bg-orange-600 text-orange-100' :
                        'bg-blue-600 text-blue-100'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{stats.player.nickname || stats.player.name}</p>
                        <p className="text-xs text-foreground">{stats.wins + stats.losses + stats.draws} partidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{stats.wins}</p>
                      <p className="text-xs text-foreground">victorias</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Mejores % de Victoria */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📈</span>
              <h2 className="text-xl font-semibold text-foreground">Mejor Efectividad</h2>
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
                    <div key={playerId} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-600 text-yellow-100' :
                          index === 1 ? 'bg-accent text-foreground' :
                          index === 2 ? 'bg-orange-600 text-orange-100' :
                          'bg-blue-600 text-blue-100'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{stats.player.nickname || stats.player.name}</p>
                          <p className="text-xs text-foreground">{stats.wins}V - {stats.losses}D - {stats.draws}E</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{winRate}%</p>
                        <p className="text-xs text-foreground">efectividad</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Estadísticas Generales */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-semibold text-foreground">Estadísticas</h2>
            </div>
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-blue-900/20 border border-blue-500/30' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                }`}>{completedGames.length}</p>
                <p className="text-sm text-foreground">Partidos jugados</p>
              </div>
              <div className={`p-3 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-green-900/20 border border-green-500/30' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-700'
                }`}>
                  {completedGames.reduce((sum, game) => {
                    if (game.result) {
                      return sum + game.result.team1Score + game.result.team2Score;
                    }
                    return sum;
                  }, 0)}
                </p>
                <p className="text-sm text-foreground">Goles totales</p>
              </div>
              <div className={`p-3 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-purple-900/20 border border-purple-500/30' 
                  : 'bg-purple-50 border border-purple-200'
              }`}>
                <p className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                }`}>
                  {Math.round(completedGames.reduce((sum, game) => {
                    if (game.result) {
                      return sum + game.result.team1Score + game.result.team2Score;
                    }
                    return sum;
                  }, 0) / Math.max(completedGames.length, 1) * 10) / 10}
                </p>
                <p className="text-sm text-foreground">Goles por partido</p>
              </div>
              <div className={`p-3 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-orange-900/20 border border-orange-500/30' 
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                <p className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                }`}>
                  {Object.keys(teamStats).length}
                </p>
                <p className="text-sm text-foreground">Jugadores activos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      {Object.keys(teamStats).length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Estadísticas Detalladas</h2>
          <p className="text-sm text-muted-foreground mb-4">Los goles corresponden al equipo completo en cada partido</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-2 text-foreground">Pos</th>
                  <th className="text-left py-3 px-2 text-foreground">Jugador</th>
                  <th className="text-center py-3 px-2 text-foreground">PJ</th>
                  <th className="text-center py-3 px-2 text-foreground">V</th>
                  <th className="text-center py-3 px-2 text-foreground">E</th>
                  <th className="text-center py-3 px-2 text-foreground">D</th>
                  <th className="text-center py-3 px-2 text-foreground" title="Goles a favor - Goles del equipo">GF</th>
                  <th className="text-center py-3 px-2 text-foreground" title="Goles en contra - Goles del equipo rival">GC</th>
                  <th className="text-center py-3 px-2 text-foreground">DG</th>
                  <th className="text-center py-3 px-2 text-foreground">%</th>
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
                      <tr key={playerId} className={`border-b hover:bg-accent/20 ${
                        index < 3 ? (theme === 'dark' 
                          ? 'bg-amber-900/20 border-l-4 border-l-amber-500' 
                          : 'bg-amber-50 border-l-4 border-l-amber-400'
                        ) : ''
                      }`}>
                        <td className="py-3 px-2 font-medium text-foreground">{index + 1}</td>
                        <td className="py-3 px-2 text-foreground">
                          <div className="flex items-center gap-2">
                            {stats.player.imageUrl && (
                              <img 
                                src={stats.player.imageUrl} 
                                alt={stats.player.name} 
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="font-medium text-foreground">{stats.player.nickname || stats.player.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-foreground">{total}</td>
                        <td className="text-center py-3 px-2 text-foreground font-semibold">{stats.wins}</td>
                        <td className="text-center py-3 px-2 text-foreground">{stats.draws}</td>
                        <td className="text-center py-3 px-2 text-foreground">{stats.losses}</td>
                        <td className="text-center py-3 px-2 text-foreground">{stats.goalsFor}</td>
                        <td className="text-center py-3 px-2 text-foreground">{stats.goalsAgainst}</td>
                        <td className="text-center py-3 px-2 font-medium text-foreground">
                          {goalDiff > 0 ? '+' : ''}{goalDiff}
                        </td>
                        <td className="text-center py-3 px-2 font-semibold text-foreground">{winRate}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-foreground">
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
          <div className="bg-card rounded-lg shadow-md p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💀</span>
              <h2 className="text-xl font-semibold text-foreground">Hall of Shame</h2>
              <span className="text-sm text-foreground opacity-70">(Jugadores con más ausencias)</span>
            </div>
            <div className="space-y-3">
              {playersWithAbsences.map((data, index) => {
                const attendanceRate = data.totalGames > 0 ? ((data.attended / data.totalGames) * 100).toFixed(1) : '0.0';
                
                return (
                  <div key={data.player.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === 'dark' 
                      ? 'bg-red-900/20 border border-red-500/30' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        theme === 'dark' ? 'bg-red-600 text-red-100' : 'bg-red-500 text-red-50'
                      }`}>
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
                          <p className="font-medium text-foreground">{data.player.nickname || data.player.name}</p>
                          <p className="text-xs text-foreground">
                            {data.attended}/{data.totalGames} partidos - {attendanceRate}% asistencia
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        theme === 'dark' ? 'text-red-300' : 'text-red-600'
                      }`}>{data.absences}</p>
                      <p className="text-xs text-foreground">ausencias</p>
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