'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Game, User, MvpResults } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/theme-context';
import { Trophy, Star, Crown, ChevronDown, ChevronUp } from 'lucide-react';

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
  },

  async voteMVP(gameId: string, votedForId: string) {
    const res = await fetch(`/api/games/${gameId}/mvp/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votedForId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to submit MVP vote');
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

  async getMVPVotesData() {
    const res = await fetch('/api/mvp/votes');
    if (!res.ok) throw new Error('Failed to fetch MVP votes data');
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
  const [mvpVotesData, setMvpVotesData] = useState<{[playerId: string]: number}>({});
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultForm, setResultForm] = useState({
    team1Score: 0,
    team2Score: 0,
    notes: '',
  });
  
  // MVP voting state
  const [showMVPVoting, setShowMVPVoting] = useState<{[gameId: string]: boolean}>({});
  const [mvpResults, setMvpResults] = useState<{[gameId: string]: MvpResults}>({});
  const [votedGames, setVotedGames] = useState<{[gameId: string]: boolean}>({});
  
  // Ranking explanation state
  const [showRankingExplanation, setShowRankingExplanation] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [allUsers, allGames, mvpVotesResponse] = await Promise.all([
          apiClient.getUsers(),
          apiClient.getGames(),
          apiClient.getMVPVotesData()
        ]);
        
        const userData = allUsers.find((u: User) => u.id === user.id);
        
        // Fix dates that might be serialized as strings
        const gamesWithFixedDates = allGames.map((game: Game) => ({
          ...game,
          date: new Date(game.date),
          createdAt: new Date(game.createdAt),
          updatedAt: new Date(game.updatedAt),
        }));
        
        // Process MVP votes data
        const votesMap: {[playerId: string]: number} = {};
        if (mvpVotesResponse.success) {
          mvpVotesResponse.playerVotes.forEach((voteData: {playerId: string, totalVotes: number}) => {
            votesMap[voteData.playerId] = voteData.totalVotes;
          });
        }
        
        setUsers(allUsers);
        setGames(gamesWithFixedDates);
        setCurrentUser(userData || null);
        setMvpVotesData(votesMap);
      } catch (err) {
        console.error('Error loading history data:', err);
        error('Error de carga', 'No se pudieron cargar los datos del historial');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoaded, user, error]);

  // MVP voting helper functions
  const hasUserVotedForGame = (gameId: string): boolean => {
    return votedGames[gameId] === true;
  };

  const loadVoteStatus = async (gameId: string) => {
    try {
      const result = await apiClient.checkVoteStatus(gameId);
      setVotedGames(prev => ({ ...prev, [gameId]: result.hasVoted }));
    } catch (error) {
      console.error('Error loading vote status:', error);
    }
  };

  const markGameAsVoted = (gameId: string) => {
    setVotedGames(prev => ({ ...prev, [gameId]: true }));
  };

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
      await apiClient.finalizeMVP(gameId);
      success('MVP finalizado', 'El MVP se ha establecido correctamente');
      
      // Refresh games to get updated result with MVP
      const [, allGames] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getGames()
      ]);
      
      const gamesWithFixedDates = allGames.map((game: Game) => ({
        ...game,
        date: new Date(game.date),
        createdAt: new Date(game.createdAt),
        updatedAt: new Date(game.updatedAt),
      }));
      
      setGames(gamesWithFixedDates);
      
      // Refresh MVP results
      await loadMVPResults(gameId);
    } catch (err) {
      console.error('Error finalizing MVP:', err);
      error('Error al finalizar MVP', 'No se pudo establecer el MVP');
    }
  };

  // Load vote status for completed games on initial load
  useEffect(() => {
    if (currentUser && games.length > 0) {
      const completedGamesWithResults = games.filter(game => 
        game.status === 'completed' && 
        game.result && 
        game.participants.includes(currentUser.id)
      );
      
      completedGamesWithResults.forEach(game => {
        if (votedGames[game.id] === undefined) {
          loadVoteStatus(game.id);
        }
      });
    }
  }, [currentUser, games]);

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
      mvpWins: number;
      mvpVotesReceived: number;
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
            mvpWins: 0,
            mvpVotesReceived: mvpVotesData[playerId] || 0,
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
      
      // Count MVP wins
      if (game.result.mvp && stats[game.result.mvp]) {
        stats[game.result.mvp].mvpWins++;
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
                    <div className="bg-accent/20 p-3 rounded mb-4">
                      <p className="text-sm text-foreground">
                        <strong>Notas:</strong> {game.result.notes}
                      </p>
                    </div>
                  )}

                  {/* MVP Voting Section */}
                  {game.status === 'completed' && game.result && (
                    <div className="mt-4">
                      {game.result.mvp ? (
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
                              const mvpPlayer = users.find(u => u.id === game.result!.mvp);
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
                            })()}
                          </div>
                        </div>
                      ) : game.participants.includes(currentUser?.id || '') ? (
                        // Show MVP Voting for Participants
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/20">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                              <Star className="h-5 w-5" />
                              Votación MVP
                            </h5>
                            {!hasUserVotedForGame(game.id) && (
                              <button
                                onClick={() => setShowMVPVoting(prev => ({ 
                                  ...prev, 
                                  [game.id]: !prev[game.id] 
                                }))}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
                              >
                                {showMVPVoting[game.id] ? 'Ocultar votación' : 'Votar MVP'}
                              </button>
                            )}
                          </div>
                          
                          {hasUserVotedForGame(game.id) ? (
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-2">
                                <Trophy className="h-5 w-5" />
                                <span className="font-medium">¡Ya votaste!</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Tu voto se registró correctamente. Los resultados se mostrarán cuando termine la votación.
                              </p>
                              {currentUser?.isAdmin && (
                                <button
                                  onClick={() => {
                                    loadMVPResults(game.id);
                                    setShowMVPVoting(prev => ({ 
                                      ...prev, 
                                      [game.id]: true 
                                    }));
                                  }}
                                  className="mt-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm font-medium"
                                >
                                  Ver resultados (Admin)
                                </button>
                              )}
                            </div>
                          ) : showMVPVoting[game.id] ? (
                            <div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Vota por el mejor jugador del partido (votación anónima):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {game.participants
                                  .map(participantId => users.find(u => u.id === participantId))
                                  .filter(Boolean)
                                  .map(player => (
                                    <button
                                      key={player!.id}
                                      onClick={() => submitMVPVote(game.id, player!.id)}
                                      className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-700/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                      {player!.imageUrl && (
                                        <img 
                                          src={player!.imageUrl} 
                                          alt={player!.name} 
                                          className="w-8 h-8 rounded-full"
                                        />
                                      )}
                                      <span className="font-medium text-blue-800 dark:text-blue-200">
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
                          {mvpResults[game.id] && showMVPVoting[game.id] && (
                            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700/30">
                              <h6 className="font-medium text-blue-800 dark:text-blue-200 mb-3">
                                Resultados actuales:
                              </h6>
                              <div className="space-y-2">
                                {mvpResults[game.id].voteResults.map(result => (
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
                                Total votos: {mvpResults[game.id].totalVotes} / {mvpResults[game.id].totalParticipants} jugadores
                              </div>
                              {currentUser?.isAdmin && mvpResults[game.id].mvp && (
                                <button
                                  onClick={() => finalizeMVP(game.id)}
                                  className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                  Finalizar MVP: {mvpResults[game.id].mvp!.playerNickname || mvpResults[game.id].mvp!.playerName}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show message for non-participants
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Star className="h-5 w-5" />
                            <span className="text-sm">Solo los jugadores que participaron pueden votar por el MVP</span>
                          </div>
                        </div>
                      )}
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
        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
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
                  
                  // Sort by win rate first, then by MVP wins, then by MVP votes received, then by goal difference
                  if (winRateB !== winRateA) return winRateB - winRateA;
                  if (b.mvpWins !== a.mvpWins) return b.mvpWins - a.mvpWins;
                  if (b.mvpVotesReceived !== a.mvpVotesReceived) return b.mvpVotesReceived - a.mvpVotesReceived;
                  return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
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

          {/* MVP Vote Leaders */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-foreground">Más Votados MVP</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .filter(([, stats]) => stats.mvpVotesReceived > 0) // Only show players with MVP votes
                .sort(([,a], [,b]) => b.mvpVotesReceived - a.mvpVotesReceived) // Sort by MVP votes received descending
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-600 text-blue-100' :
                        index === 1 ? 'bg-blue-500 text-blue-100' :
                        'bg-blue-400 text-blue-900'
                      }`}>
                        {index === 0 ? <Star className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                          {stats.player.nickname || stats.player.name}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {stats.wins + stats.losses + stats.draws} partidos jugados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-4 w-4 text-blue-500" />
                        <p className="font-bold text-blue-800 dark:text-blue-200">{stats.mvpVotesReceived}</p>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        {stats.mvpVotesReceived === 1 ? 'voto' : 'votos'}
                      </p>
                    </div>
                  </div>
                ))}
              {Object.entries(teamStats).filter(([, stats]) => stats.mvpVotesReceived > 0).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aún no hay votos MVP registrados</p>
                  <p className="text-sm">Los votos aparecerán aquí cuando los jugadores voten</p>
                </div>
              )}
            </div>
          </div>

          {/* MVP Winners Leaderboard */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              <h2 className="text-xl font-semibold text-foreground">MVPs Ganadores</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .filter(([, stats]) => stats.mvpWins > 0) // Only show players with MVP wins
                .sort(([,a], [,b]) => b.mvpWins - a.mvpWins) // Sort by MVP wins descending
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-600 text-yellow-100' :
                        index === 1 ? 'bg-yellow-500 text-yellow-100' :
                        'bg-yellow-400 text-yellow-900'
                      }`}>
                        {index === 0 ? <Crown className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          {stats.player.nickname || stats.player.name}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          {stats.wins + stats.losses + stats.draws} partidos jugados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <p className="font-bold text-yellow-800 dark:text-yellow-200">{stats.mvpWins}</p>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        {stats.mvpWins === 1 ? 'MVP' : 'MVPs'}
                      </p>
                    </div>
                  </div>
                ))}
              {Object.entries(teamStats).filter(([, stats]) => stats.mvpWins > 0).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Crown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aún no hay MVPs registrados</p>
                  <p className="text-sm">Los MVPs aparecerán aquí cuando se finalicen las votaciones</p>
                </div>
              )}
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
                  <th className="text-center py-3 px-2 text-foreground" title="Most Valuable Player awards">MVP</th>
                  <th className="text-center py-3 px-2 text-foreground" title="Total MVP votes received">Votos</th>
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
                    
                    // First sort by total wins, then by win rate, then by MVP wins, then by MVP votes received, then by goal difference
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    if (winRateB !== winRateA) return winRateB - winRateA;
                    if (b.mvpWins !== a.mvpWins) return b.mvpWins - a.mvpWins;
                    if (b.mvpVotesReceived !== a.mvpVotesReceived) return b.mvpVotesReceived - a.mvpVotesReceived;
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
                        <td className="text-center py-3 px-2 text-foreground">
                          <div className="flex items-center justify-center gap-1">
                            {stats.mvpWins > 0 && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                            <span className={stats.mvpWins > 0 ? 'font-semibold text-yellow-600 dark:text-yellow-400' : ''}>
                              {stats.mvpWins}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-foreground">
                          <span className={stats.mvpVotesReceived > 0 ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}>
                            {stats.mvpVotesReceived}
                          </span>
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
            <p><strong>GF:</strong> Goles a Favor, <strong>GC:</strong> Goles en Contra, <strong>DG:</strong> Diferencia de Goles, <strong>MVP:</strong> Premios MVP, <strong>Votos:</strong> Total votos MVP recibidos, <strong>%:</strong> Porcentaje de Victorias</p>
          </div>
        </div>
      )}

      {/* Expandable Ranking Explanation */}
      {Object.keys(teamStats).length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 mt-6">
          <button
            onClick={() => setShowRankingExplanation(!showRankingExplanation)}
            className="w-full flex items-center justify-between text-left hover:bg-accent/20 rounded-lg p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📏</span>
              <h2 className="text-lg font-semibold text-foreground">¿Cómo funciona el ranking?</h2>
            </div>
            {showRankingExplanation ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {showRankingExplanation && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-foreground space-y-3">
                <div>
                  <p className="font-semibold mb-2">🏆 Top Ganadores:</p>
                  <p className="ml-4 text-muted-foreground">Ordenados por total de victorias (más victorias = mejor posición)</p>
                </div>
                
                <div>
                  <p className="font-semibold mb-2">📈 Mejor Efectividad:</p>
                  <p className="ml-4 text-muted-foreground mb-1">Para jugadores con mínimo 3 partidos, ordenados por:</p>
                  <div className="ml-8 space-y-1 text-muted-foreground">
                    <p>• 1º Porcentaje de victoria (victorias ÷ partidos totales)</p>
                    <p>• 2º En caso de empate: Mayor cantidad de MVPs ganados</p>
                    <p>• 3º En caso de empate: Mayor cantidad de votos MVP recibidos</p>
                    <p>• 4º En caso de empate: Mejor diferencia de goles</p>
                  </div>
                </div>
                
                <div>
                  <p className="font-semibold mb-2">📊 Tabla Detallada:</p>
                  <p className="ml-4 text-muted-foreground mb-1">Ordenados por:</p>
                  <div className="ml-8 space-y-1 text-muted-foreground">
                    <p>• 1º Total de victorias</p>
                    <p>• 2º En caso de empate: Porcentaje de victoria</p>
                    <p>• 3º En caso de empate: Mayor cantidad de MVPs ganados</p>
                    <p>• 4º En caso de empate: Mayor cantidad de votos MVP recibidos</p>
                    <p>• 5º En caso de empate: Mejor diferencia de goles</p>
                  </div>
                </div>
                
                <div className={`mt-4 p-3 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-yellow-950/40 border border-yellow-600/30' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'
                  }`}>
                    <strong>💡 Tip:</strong> Los MVPs ganados y los votos MVP recibidos se usan como criterio de desempate - ¡incluso si no ganas el MVP pero recibes muchos votos, te ayuda a subir en el ranking!
                  </p>
                </div>
              </div>
            </div>
          )}
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