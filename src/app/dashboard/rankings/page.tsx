'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Game, User } from '@/types';
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
    const res = await fetch('/api/games?type=all');
    if (!res.ok) throw new Error('Failed to fetch games');
    return res.json();
  },

  async getAllMVPVotes() {
    const res = await fetch('/api/mvp/all-votes');
    if (!res.ok) throw new Error('Failed to fetch MVP votes');
    return res.json();
  }
};

// Quarter helper functions
const getQuarterFromDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11

  if (month >= 1 && month <= 3) return `${year}-Q1`;
  if (month >= 4 && month <= 6) return `${year}-Q2`;
  if (month >= 7 && month <= 9) return `${year}-Q3`;
  return `${year}-Q4`;
};

const getCurrentQuarter = (): string => {
  return getQuarterFromDate(new Date());
};

const getQuarterDisplayName = (quarter: string, short: boolean = false): string => {
  const [year, q] = quarter.split('-');
  const quarterNames = {
    'Q1': short ? 'Q1' : 'Q1 (Ene-Mar)',
    'Q2': short ? 'Q2' : 'Q2 (Abr-Jun)',
    'Q3': short ? 'Q3' : 'Q3 (Jul-Sep)',
    'Q4': short ? 'Q4' : 'Q4 (Oct-Dic)'
  };
  return `${year} ${quarterNames[q as keyof typeof quarterNames]}`;
};

const getAvailableQuarters = (games: Game[]): string[] => {
  const quarters = new Set<string>();

  // Always include the current quarter
  quarters.add(getCurrentQuarter());

  // Add quarters that have completed games
  games.forEach(game => {
    if (game.status === 'completed') {
      quarters.add(getQuarterFromDate(new Date(game.date)));
    }
  });

  return Array.from(quarters).sort().reverse(); // Most recent first
};

export default function RankingsPage() {
  const { user, isLoaded } = useUser();
  const { error } = useToast();
  const { theme } = useTheme();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allMvpVotes, setAllMvpVotes] = useState<{gameId: string, votedForId: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quarter filtering state
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

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
          apiClient.getAllMVPVotes()
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
        setAllMvpVotes(mvpVotesResponse.votes || []);

        // Set current quarter as default if no quarter is selected
        if (!selectedQuarter) {
          setSelectedQuarter(getCurrentQuarter());
        }
      } catch (err) {
        console.error('Error loading rankings data:', err);
        error('Error de carga', 'No se pudieron cargar los datos de rankings');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoaded, user, error, selectedQuarter]);

  const completedGames = games.filter(game => {
    if (game.status !== 'completed') return false;
    if (!selectedQuarter) return true;
    return getQuarterFromDate(new Date(game.date)) === selectedQuarter;
  });

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

    // Get game IDs from completed games in the selected quarter
    const completedGameIds = new Set(completedGames.map(game => game.id));

    // Filter MVP votes to only include those from completed games in the selected quarter
    const quarterMvpVotes = allMvpVotes.filter(vote => completedGameIds.has(vote.gameId));

    completedGames.forEach(game => {
      if (!game.teams || !game.result) return;

      const { team1, team2 } = game.teams;
      const { team1Score, team2Score } = game.result;

      [...team1, ...team2].forEach(playerId => {
        const player = users.find(u => u.id === playerId);
        if (!stats[playerId] && player) {
          // Count MVP votes for this player from games in the selected quarter
          const votesForPlayer = quarterMvpVotes.filter(vote => vote.votedForId === playerId).length;

          stats[playerId] = {
            wins: 0,
            losses: 0,
            draws: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            mvpWins: 0,
            mvpVotesReceived: votesForPlayer,
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
      if (game.result.mvp) {
        const mvpIds = Array.isArray(game.result.mvp) ? game.result.mvp : [game.result.mvp];
        mvpIds.forEach(mvpId => {
          if (stats[mvpId]) {
            stats[mvpId].mvpWins++;
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
          <p className="text-foreground">Cargando rankings...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Usuario no encontrado</div>;
  }

  const teamStats = getTeamStats();

  const availableQuarters = getAvailableQuarters(games);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-card rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Rankings y Estadísticas</h1>
            <p className="text-foreground">Clasificaciones y estadísticas de todos los jugadores</p>
            <p className="text-sm text-muted-foreground mt-1">
              📊 Los goles del equipo se les adjudican a todos los jugadores del equipo
              {selectedQuarter && completedGames.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {completedGames.length} partido{completedGames.length !== 1 ? 's' : ''} jugado{completedGames.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Quarter Selector */}
          {availableQuarters.length > 0 && (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-muted-foreground">
                Período:
              </label>
              <div className="relative">
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="appearance-none bg-background border border-border rounded-lg px-3 sm:px-4 py-2 pr-8 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:min-w-[200px] text-sm sm:text-base"
                >
                  {availableQuarters.map(quarter => (
                    <option key={quarter} value={quarter}>
                      {getQuarterDisplayName(quarter, true)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas y Ranking */}
      {Object.keys(teamStats).length > 0 ? (
        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {/* Ranking de Victorias */}
          <div className="bg-card rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🏆</span>
              <h2 className="text-xl font-semibold text-foreground">
                Top Ganadores
                {selectedQuarter && (
                  <span className="block text-sm font-normal text-muted-foreground mt-1">
                    {getQuarterDisplayName(selectedQuarter, false)}
                  </span>
                )}
              </h2>
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
              <h2 className="text-xl font-semibold text-foreground">
                Mejor Efectividad
                {selectedQuarter && (
                  <span className="block text-sm font-normal text-muted-foreground mt-1">
                    {getQuarterDisplayName(selectedQuarter, false)}
                  </span>
                )}
              </h2>
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
              <h2 className="text-xl font-semibold text-foreground">
                Más Votados MVP
                {selectedQuarter && (
                  <span className="block text-sm font-normal text-muted-foreground mt-1">
                    {getQuarterDisplayName(selectedQuarter, false)}
                  </span>
                )}
              </h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .filter(([, stats]) => stats.mvpVotesReceived > 0) // Only show players with MVP votes
                .sort(([,a], [,b]) => b.mvpVotesReceived - a.mvpVotesReceived) // Sort by MVP votes received descending
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className={`flex items-center justify-between p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border-blue-600/30'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-600 text-blue-100' :
                        index === 1 ? 'bg-blue-500 text-blue-100' :
                        'bg-blue-400 text-blue-900'
                      }`}>
                        {index === 0 ? <Star className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
                        }`}>
                          {stats.player.nickname || stats.player.name}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          {stats.wins + stats.losses + stats.draws} partidos jugados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Trophy className={`h-4 w-4 ${
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                        }`} />
                        <p className={`font-bold ${
                          theme === 'dark' ? 'text-blue-200' : 'text-blue-800'
                        }`}>{stats.mvpVotesReceived}</p>
                      </div>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                      }`}>
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
              <h2 className="text-xl font-semibold text-foreground">
                MVPs Ganadores
                {selectedQuarter && (
                  <span className="block text-sm font-normal text-muted-foreground mt-1">
                    {getQuarterDisplayName(selectedQuarter, false)}
                  </span>
                )}
              </h2>
            </div>
            <div className="space-y-3">
              {Object.entries(teamStats)
                .filter(([, stats]) => stats.mvpWins > 0) // Only show players with MVP wins
                .sort(([,a], [,b]) => b.mvpWins - a.mvpWins) // Sort by MVP wins descending
                .slice(0, 5)
                .map(([playerId, stats], index) => (
                  <div key={playerId} className={`flex items-center justify-between p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-yellow-950/40 to-amber-950/40 border-yellow-600/30'
                      : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-600 text-yellow-100' :
                        index === 1 ? 'bg-yellow-500 text-yellow-100' :
                        'bg-yellow-400 text-yellow-900'
                      }`}>
                        {index === 0 ? <Crown className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
                        }`}>
                          {stats.player.nickname || stats.player.name}
                        </p>
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                        }`}>
                          {stats.wins + stats.losses + stats.draws} partidos jugados
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className={`h-4 w-4 fill-current ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'
                        }`} />
                        <p className={`font-bold ${
                          theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
                        }`}>{stats.mvpWins}</p>
                      </div>
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                      }`}>
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
      ) : (
        <div className="bg-card rounded-lg shadow-md p-8 mb-6">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Sin datos de ranking</h2>
            <p>
              {selectedQuarter
                ? selectedQuarter === getCurrentQuarter()
                  ? `Aún no hay partidos completados en ${getQuarterDisplayName(selectedQuarter, false)}`
                  : `No hay partidos completados en ${getQuarterDisplayName(selectedQuarter, false)}`
                : 'Los rankings aparecerán cuando haya partidos completados'
              }
            </p>
            {selectedQuarter && availableQuarters.length > 1 && (
              <p className="text-sm mt-2">
                {selectedQuarter === getCurrentQuarter()
                  ? 'Los rankings aparecerán aquí cuando se completen partidos en este período'
                  : 'Prueba seleccionando otro período en el menú desplegable'
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      {Object.keys(teamStats).length > 0 && (
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Estadísticas Detalladas
            {selectedQuarter && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                - {getQuarterDisplayName(selectedQuarter)}
              </span>
            )}
          </h2>
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
                          <span className={stats.mvpVotesReceived > 0 ? 'font-medium text-blue-400 dark:text-blue-400' : 'text-muted-foreground'}>
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
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
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
          <div className="bg-card rounded-lg shadow-md p-6">
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