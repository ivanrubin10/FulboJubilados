'use client';

import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Edit2, Save, X, Sun, Moon, User as UserIcon, Trophy, Target, TrendingUp, Calendar, Crown } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/components/ui/toast';
import { User, Game } from '@/types';

const ProfilePage = () => {
  const { user, isLoaded } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { success, error } = useToast();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [playerStats, setPlayerStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    totalGames: 0,
    winRate: 0,
    goalDifference: 0,
    mvpWins: 0
  });


  // Fetch user data and games
  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [userRes, gamesRes] = await Promise.all([
          fetch(`/api/users/${user.id}`),
          fetch('/api/games')
        ]);
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setDbUser(userData);
          setNewNickname(userData?.nickname || '');
        }
        
        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          setGames(gamesData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        error('Error al cargar tu perfil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isLoaded, user, error]);

  // Calculate player statistics - simple approach without useCallback
  useEffect(() => {
    if (!user || !games.length) return;

    const completedGames = games.filter(game => 
      game.status === 'completed' && 
      game.teams && 
      game.result &&
      (game.teams.team1.includes(user.id) || game.teams.team2.includes(user.id))
    );

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let mvpWins = 0;

    completedGames.forEach(game => {
      if (!game.teams || !game.result) return;
      
      const { team1, team2 } = game.teams;
      const { team1Score, team2Score } = game.result;
      const isInTeam1 = team1.includes(user.id);
      const isInTeam2 = team2.includes(user.id);
      
      if (!isInTeam1 && !isInTeam2) return;

      // Count MVP wins
      if (game.result.mvp) {
        const mvpIds = Array.isArray(game.result.mvp) ? game.result.mvp : [game.result.mvp];
        if (mvpIds.includes(user.id)) {
          mvpWins++;
        }
      }

      if (team1Score > team2Score) {
        if (isInTeam1) {
          wins++;
          goalsFor += team1Score;
          goalsAgainst += team2Score;
        } else {
          losses++;
          goalsFor += team2Score;
          goalsAgainst += team1Score;
        }
      } else if (team2Score > team1Score) {
        if (isInTeam2) {
          wins++;
          goalsFor += team2Score;
          goalsAgainst += team1Score;
        } else {
          losses++;
          goalsFor += team1Score;
          goalsAgainst += team2Score;
        }
      } else {
        draws++;
        goalsFor += isInTeam1 ? team1Score : team2Score;
        goalsAgainst += isInTeam1 ? team2Score : team1Score;
      }
    });

    const totalGames = completedGames.length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const goalDifference = goalsFor - goalsAgainst;

    setPlayerStats({
      wins,
      losses,
      draws,
      goalsFor,
      goalsAgainst,
      totalGames,
      winRate,
      goalDifference,
      mvpWins
    });
  }, [user, games]);

  const handleSave = async () => {
    if (!dbUser || !newNickname.trim()) return;
    
    setIsSaving(true);
    try {
      const updatedUser = { ...dbUser, nickname: newNickname.trim() };
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      
      if (res.ok) {
        setDbUser(updatedUser);
        setIsEditing(false);
        success('Apodo actualizado correctamente');
      } else {
        throw new Error('Failed to update');
      }
    } catch (err) {
      console.error('Error updating nickname:', err);
      error('Error al actualizar tu apodo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewNickname(dbUser?.nickname || '');
    setIsEditing(false);
  };



  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">No se pudo cargar tu usuario</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className={`px-8 py-6 ${theme === 'dark' ? 'bg-gradient-to-r from-emerald-900 to-sky-900' : 'bg-gradient-to-r from-emerald-500 to-sky-500'}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-card/20 rounded-2xl flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tu Perfil</h1>
              <p className={theme === 'dark' ? 'text-emerald-200' : 'text-emerald-100'}>Acá podés gestionar tu información</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid gap-6">
            {/* User Image */}
            {user.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={user.imageUrl}
                  alt="Foto de perfil"
                  className={`w-24 h-24 rounded-full border-4 ${theme === 'dark' ? 'border-emerald-600' : 'border-emerald-300'}`}
                />
              </div>
            )}

            {/* User Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Tu nombre completo
                </label>
                <div className="px-4 py-3 bg-accent/20 border border-border rounded-xl text-foreground">
                  {user.fullName || user.firstName || 'Sin nombre'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Tu email
                </label>
                <div className="px-4 py-3 bg-accent/20 border border-border rounded-xl text-foreground">
                  {user.emailAddresses[0]?.emailAddress || 'Sin email'}
                </div>
              </div>

              {/* Nickname - Editable */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Tu apodo
                </label>
                
                {!isEditing ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-accent/20 border border-border rounded-xl">
                    <span className="text-foreground font-medium">
                      {dbUser?.nickname || 'Sin apodo'}
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                        theme === 'dark' 
                          ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20' 
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value.substring(0, 10))}
                      className="flex-1 px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-foreground bg-background"
                      placeholder="Tu apodo"
                      maxLength={10}
                      disabled={isSaving}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={!newNickname.trim() || isSaving}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-2 bg-accent text-muted-foreground rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Así te van a ver en los partidos y la lista de jugadores (máximo 10 caracteres)
                </p>
              </div>

              {/* Account Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Estado de tu cuenta
                </label>
                <div className="flex gap-2">
                  {dbUser?.isAdmin && (
                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                      theme === 'dark' 
                        ? 'bg-red-900/40 text-red-300' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      Administrador
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                    dbUser?.isWhitelisted 
                      ? (theme === 'dark' ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700')
                      : (theme === 'dark' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                  }`}>
                    {dbUser?.isWhitelisted ? 'Autorizado' : 'Esperando autorización'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Jugando desde
                </label>
                <div className="px-4 py-3 bg-accent/20 border border-border rounded-xl text-foreground">
                  {dbUser?.createdAt 
                    ? new Date(dbUser.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Fecha no disponible'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="mt-8 bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className={`px-8 py-6 ${theme === 'dark' ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-card/20 rounded-2xl flex items-center justify-center">
              {theme === 'dark' ? (
                <Moon className="h-8 w-8 text-white" />
              ) : (
                <Sun className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Configuración de Tema</h2>
              <p className={theme === 'dark' ? 'text-purple-200' : 'text-purple-100'}>Personaliza la apariencia de la aplicación</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between p-6 bg-accent/20 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-amber-100'
              }`}>
                {theme === 'dark' ? (
                  <Moon className="h-6 w-6 text-slate-300" />
                ) : (
                  <Sun className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' 
                    ? 'Interfaz oscura para reducir la fatiga visual' 
                    : 'Interfaz clara y brillante'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                theme === 'dark' ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> El modo oscuro puede ayudar a reducir la fatiga visual durante sesiones largas y ahorra batería en pantallas OLED.
            </p>
          </div>
        </div>
      </div>

      {/* MVP Awards Section */}
      {playerStats.mvpWins > 0 && (
        <div className="mt-8 bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className={`px-8 py-6 ${theme === 'dark' ? 'bg-gradient-to-r from-yellow-900 to-amber-900' : 'bg-gradient-to-r from-yellow-500 to-amber-500'}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-card/20 rounded-2xl flex items-center justify-center">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Premios MVP</h2>
                <p className={theme === 'dark' ? 'text-yellow-200' : 'text-yellow-100'}>Tus reconocimientos como jugador más valioso</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                theme === 'dark' 
                  ? 'bg-yellow-950/40 border-4 border-yellow-600/30' 
                  : 'bg-yellow-50 border-4 border-yellow-300'
              }`}>
                <Crown className={`h-12 w-12 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                }`} />
              </div>
              
              <h3 className={`text-4xl font-bold mb-2 ${
                theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'
              }`}>
                {playerStats.mvpWins}
              </h3>
              
              <p className={`text-lg font-medium mb-4 ${
                theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
              }`}>
                {playerStats.mvpWins === 1 ? 'Premio MVP' : 'Premios MVP'}
              </p>
              
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                theme === 'dark' 
                  ? 'bg-yellow-950/60 text-yellow-200' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {((playerStats.mvpWins / playerStats.totalGames) * 100).toFixed(1)}% de tus partidos
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Statistics */}
      {playerStats.totalGames > 0 && (
        <div className="mt-8 bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className={`px-8 py-6 ${theme === 'dark' ? 'bg-gradient-to-r from-slate-700 to-slate-800' : 'bg-gradient-to-r from-slate-500 to-slate-600'}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-card/10 rounded-2xl flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Tus Estadísticas</h2>
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-100'}>Tu rendimiento en los partidos • Los goles del equipo se adjudican a todos</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {/* Total Games */}
              <div className="text-center p-4 bg-accent/20 rounded-xl border border-border">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{playerStats.totalGames}</div>
                <div className="text-sm text-muted-foreground font-medium">Partidos</div>
              </div>

              {/* Win Rate */}
              <div className={`text-center p-4 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-emerald-950/40 border border-emerald-600/30' 
                  : 'bg-emerald-50 border border-emerald-200'
              }`}>
                <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                }`} />
                <div className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700'
                }`}>{playerStats.winRate.toFixed(1)}%</div>
                <div className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'
                }`}>% Victoria</div>
              </div>

              {/* Goal Difference */}
              <div className="text-center p-4 bg-accent/20 rounded-xl border border-border">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <div className={`text-2xl font-bold ${playerStats.goalDifference >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                  {playerStats.goalDifference >= 0 ? '+' : ''}{playerStats.goalDifference}
                </div>
                <div className="text-sm text-muted-foreground font-medium">Diferencia</div>
              </div>

              {/* MVP Wins */}
              <div className={`text-center p-4 rounded-xl ${
                theme === 'dark' 
                  ? 'bg-yellow-950/40 border border-yellow-600/30' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <Crown className={`h-8 w-8 mx-auto mb-2 ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                }`} />
                <div className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'
                }`}>{playerStats.mvpWins}</div>
                <div className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-600'
                }`}>MVP</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Tu Récord</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="font-medium text-foreground">Victorias</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">{playerStats.wins}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      <span className="font-medium text-foreground">Empates</span>
                    </div>
                    <span className="text-xl font-bold text-muted-foreground">{playerStats.draws}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-foreground">Derrotas</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">{playerStats.losses}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Estadísticas de Goles</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                      <div>
                        <span className="font-medium text-foreground">Goles a favor</span>
                        <p className="text-xs text-muted-foreground">Goles que hizo tu equipo</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-muted-foreground">{playerStats.goalsFor}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-foreground">Goles en contra</span>
                        <p className="text-xs text-muted-foreground">Goles que te hicieron</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-muted-foreground">{playerStats.goalsAgainst}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-foreground">Promedio por partido</span>
                        <p className="text-xs text-muted-foreground">Goles que hizo tu equipo por partido</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">
                      {playerStats.totalGames > 0 ? (playerStats.goalsFor / playerStats.totalGames).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Stats Message */}
      {playerStats.totalGames === 0 && (
        <div className="mt-8 bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className={`px-8 py-6 ${theme === 'dark' ? 'bg-gradient-to-r from-slate-700 to-slate-800' : 'bg-gradient-to-r from-slate-500 to-slate-600'}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-card/10 rounded-2xl flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Tus Estadísticas</h2>
                <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-100'}>Tu rendimiento en los partidos</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Todavía no tenés estadísticas</h3>
              <p className="text-muted-foreground">Metete en algunos partidos para ver tu rendimiento acá</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ProfilePage), {
  ssr: false,
});