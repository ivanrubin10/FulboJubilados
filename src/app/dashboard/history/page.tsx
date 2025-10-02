'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Game, User, MvpResults } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/theme-context';
import { Trophy, Star, Crown } from 'lucide-react';

// API helper functions
const apiClient = {
  async getUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  
  async getGames() {
    const res = await fetch('/api/games?type=all');
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
  const [, setMvpVotesData] = useState<{[playerId: string]: number}>({});
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
  const [voteStatusLoading, setVoteStatusLoading] = useState<{[gameId: string]: boolean}>({});

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
  }, [currentUser, games, votedGames]);

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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Historial de Partidos</h1>
        <p className="text-foreground">Resultados y registro de todos los partidos jugados</p>
        <p className="text-sm text-muted-foreground mt-1">📋 Consulta rankings y estadísticas en la sección de Rankings</p>
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
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
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm sm:text-base w-full sm:w-auto"
                    >
                      <span className="hidden sm:inline">Agregar Resultado</span>
                      <span className="sm:hidden">Agregar Resultado</span>
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
                        className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600"
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
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{formatDate(new Date(game.date))}</h3>
                      {game.reservationInfo && (
                        <p className="text-sm text-foreground">
                          {game.reservationInfo.location} - {game.reservationInfo.time}
                        </p>
                      )}
                    </div>

                    {game.result && (
                      <div className="text-left sm:text-right">
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
                              const mvpIds = Array.isArray(game.result!.mvp) ? game.result!.mvp : [game.result!.mvp];
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
                      ) : game.participants.includes(currentUser?.id || '') ? (
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
                            {!hasUserVotedForGame(game.id) && !isVoteStatusLoading(game.id) && (
                              <button
                                onClick={() => setShowMVPVoting(prev => ({ 
                                  ...prev, 
                                  [game.id]: !prev[game.id] 
                                }))}
                                className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                }`}
                              >
                                {showMVPVoting[game.id] ? 'Ocultar votación' : 'Votar MVP'}
                              </button>
                            )}
                          </div>
                          
                          {hasUserVotedForGame(game.id) ? (
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
                              {currentUser?.isAdmin && (
                                <button
                                  onClick={() => {
                                    loadMVPResults(game.id);
                                    setShowMVPVoting(prev => ({ 
                                      ...prev, 
                                      [game.id]: true 
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
                                      <span className={`font-medium ${
                                        theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
                                      }`}>
                                        {player!.nickname || player!.name}
                                      </span>
                                      <Star className={`h-4 w-4 ml-auto ${
                                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                      }`} />
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
                              <h6 className={`font-medium ${
                                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                } mb-3`}>
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
                              
                              {/* Admin-only: Show non-voters list */}
                              {currentUser?.isAdmin && mvpResults[game.id].nonVoters && mvpResults[game.id].nonVoters!.nonVotersCount > 0 && (
                                <div className={`mt-3 p-3 rounded-lg ${
                                  theme === 'dark' ? 'bg-orange-950/40 border border-orange-600/30' : 'bg-orange-50 border border-orange-200'
                                }`}>
                                  <h6 className={`text-sm font-medium mb-2 ${
                                    theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
                                  }`}>
                                    Pendientes de votar ({mvpResults[game.id].nonVoters!.nonVotersCount}):
                                  </h6>
                                  <div className="flex flex-wrap gap-2">
                                    {mvpResults[game.id].nonVoters!.nonVoters.map(user => (
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

                              {currentUser?.isAdmin && mvpResults[game.id].mvp && (
                                <button
                                  onClick={() => finalizeMVP(game.id)}
                                  className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                  {(() => {
                                    const results = mvpResults[game.id].voteResults;
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
                </div>
              ))}
          </div>
        ) : (
          <p className="text-foreground text-center py-8">
            Todavía no hay partidos jugados
          </p>
        )}
      </div>

    </div>
  );
}