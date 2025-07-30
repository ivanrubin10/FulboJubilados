'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { User as UserIcon, Edit2, Save, X, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { User, Game } from '@/types';
import { useToast } from '@/components/ui/toast';

const apiClient = {
  async getUserById(id: string) {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    const user = await res.json();
    return user === null ? undefined : user;
  },
  
  async updateUser(user: User) {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async getGames() {
    const res = await fetch('/api/games');
    if (!res.ok) throw new Error('Failed to fetch games');
    return res.json();
  },

  async getUsers() {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { success, error } = useToast();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [playerStats, setPlayerStats] = useState<{
    wins: number;
    losses: number;
    draws: number;
    goalsFor: number;
    goalsAgainst: number;
    totalGames: number;
    winRate: number;
    goalDifference: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoaded || !user) return;
      
      setIsLoading(true);
      try {
        const [userData, gamesData, usersData] = await Promise.all([
          apiClient.getUserById(user.id),
          apiClient.getGames(),
          apiClient.getUsers()
        ]);
        
        setDbUser(userData);
        setNewNickname(userData?.nickname || '');
        setGames(gamesData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error fetching data:', err);
        error('Error al cargar tu perfil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isLoaded, user, error]);

  const calculatePlayerStats = useCallback(() => {
    if (!user) return;

    const completedGames = games.filter(game => 
      game.status === 'completed' && 
      game.teams && 
      game.result &&
      (game.teams.team1.includes(user.id) || game.teams.team2.includes(user.id))
    );

    const stats = {
      wins: 0,
      losses: 0,
      draws: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      totalGames: 0,
      winRate: 0,
      goalDifference: 0
    };

    completedGames.forEach(game => {
      if (!game.teams || !game.result) return;
      
      const { team1, team2 } = game.teams;
      const { team1Score, team2Score } = game.result;
      const isInTeam1 = team1.includes(user.id);
      const isInTeam2 = team2.includes(user.id);
      
      if (!isInTeam1 && !isInTeam2) return;

      stats.totalGames++;
      
      if (team1Score > team2Score) {
        if (isInTeam1) {
          stats.wins++;
          stats.goalsFor += team1Score;
          stats.goalsAgainst += team2Score;
        } else {
          stats.losses++;
          stats.goalsFor += team2Score;
          stats.goalsAgainst += team1Score;
        }
      } else if (team2Score > team1Score) {
        if (isInTeam2) {
          stats.wins++;
          stats.goalsFor += team2Score;
          stats.goalsAgainst += team1Score;
        } else {
          stats.losses++;
          stats.goalsFor += team1Score;
          stats.goalsAgainst += team2Score;
        }
      } else {
        stats.draws++;
        stats.goalsFor += isInTeam1 ? team1Score : team2Score;
        stats.goalsAgainst += isInTeam1 ? team2Score : team1Score;
      }
    });

    stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0;
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

    setPlayerStats(stats);
  }, [user, games]);

  useEffect(() => {
    if (user && games.length > 0 && users.length > 0) {
      calculatePlayerStats();
    }
  }, [user, games, users, calculatePlayerStats]);

  const handleSave = async () => {
    if (!dbUser || !newNickname.trim()) return;
    
    setIsSaving(true);
    try {
      const updatedUser = { ...dbUser, nickname: newNickname.trim() };
      await apiClient.updateUser(updatedUser);
      setDbUser(updatedUser);
      setIsEditing(false);
      success('Apodo actualizado correctamente');
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
          <p className="text-gray-600">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-600">No se pudo cargar tu usuario</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tu Perfil</h1>
              <p className="text-emerald-100">Acá podés gestionar tu información</p>
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
                  className="w-24 h-24 rounded-full border-4 border-emerald-200"
                />
              </div>
            )}

            {/* User Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tu nombre completo
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                  {user.fullName || user.firstName || 'Sin nombre'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tu email
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                  {user.emailAddresses[0]?.emailAddress || 'Sin email'}
                </div>
              </div>

              {/* Nickname - Editable */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Tu apodo
                </label>
                
                {!isEditing ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-900 font-medium">
                      {dbUser?.nickname || 'Sin apodo'}
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-3 py-1 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
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
                      onChange={(e) => setNewNickname(e.target.value)}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900"
                      placeholder="Tu apodo"
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
                        className="flex items-center gap-2 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-slate-500">
                  Así te van a ver en los partidos y la lista de jugadores
                </p>
              </div>

              {/* Account Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Estado de tu cuenta
                </label>
                <div className="flex gap-2">
                  {dbUser?.isAdmin && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                      Administrador
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                    dbUser?.isWhitelisted 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {dbUser?.isWhitelisted ? 'Autorizado' : 'Esperando autorización'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Jugando desde
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
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

      {/* Player Statistics */}
      {playerStats && (
        <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Tus Estadísticas</h2>
                <p className="text-slate-300">Tu rendimiento en los partidos • Los goles del equipo se adjudican a todos</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {/* Total Games */}
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-800">{playerStats.totalGames}</div>
                <div className="text-sm text-slate-600 font-medium">Partidos</div>
              </div>

              {/* Win Rate */}
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <TrendingUp className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">{playerStats.winRate.toFixed(1)}%</div>
                <div className="text-sm text-emerald-600 font-medium">% Victoria</div>
              </div>

              {/* Goal Difference */}
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Target className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <div className={`text-2xl font-bold ${playerStats.goalDifference >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {playerStats.goalDifference >= 0 ? '+' : ''}{playerStats.goalDifference}
                </div>
                <div className="text-sm text-slate-600 font-medium">Diferencia</div>
              </div>

              {/* Goals */}
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Trophy className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-800">{playerStats.goalsFor}</div>
                <div className="text-sm text-slate-600 font-medium">Goles</div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Tu Récord</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="font-medium text-slate-800">Victorias</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">{playerStats.wins}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                      <span className="font-medium text-slate-800">Empates</span>
                    </div>
                    <span className="text-xl font-bold text-slate-600">{playerStats.draws}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <span className="font-medium text-slate-800">Derrotas</span>
                    </div>
                    <span className="text-xl font-bold text-red-500">{playerStats.losses}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Estadísticas de Goles</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                      <div>
                        <span className="font-medium text-slate-800">Goles a favor</span>
                        <p className="text-xs text-slate-500">Goles que hizo tu equipo</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-700">{playerStats.goalsFor}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                      <div>
                        <span className="font-medium text-slate-800">Goles en contra</span>
                        <p className="text-xs text-slate-500">Goles que te hicieron</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-slate-600">{playerStats.goalsAgainst}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-slate-800">Promedio por partido</span>
                        <p className="text-xs text-slate-500">Goles que hizo tu equipo por partido</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">
                      {playerStats.totalGames > 0 ? (playerStats.goalsFor / playerStats.totalGames).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {playerStats.totalGames === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Todavía no tenés estadísticas</h3>
                <p className="text-slate-500">Metete en algunos partidos para ver tu rendimiento acá</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}