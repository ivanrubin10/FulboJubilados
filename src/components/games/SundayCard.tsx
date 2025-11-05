'use client';

import { Game, MvpResults } from '@/types';
import { useTheme } from '@/contexts/theme-context';
import { Calendar, Users, Trophy, Clock, MapPin, DollarSign, CheckCircle, Ban, Lock, AlertCircle, Settings, Star, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface VoterInfo {
  userId: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
  votedAt: Date;
  position: number;
}

interface UserInfo {
  userId: string;
  name: string;
  nickname?: string;
  imageUrl?: string;
}

interface SundayCardProps {
  date: Date;
  dayNumber: number;
  isPast: boolean;

  // User's vote
  userVoted: boolean;
  userVotedNo: boolean;
  userVoteTimestamp: Date | null;

  // Overall stats
  totalVotes: number;
  userPositionInQueue: number | null;

  // Voters list
  voters: VoterInfo[];
  noVoters: UserInfo[];
  nonVoters: UserInfo[];

  // Game info
  game: Game | null;
  userInGame: boolean;
  userInWaitlist: boolean;

  // Restrictions
  canVote: boolean;
  canUnvote: boolean;
  blockReason?: string;

  // Actions
  onVote: () => void;
  onVoteNo: () => void;
  onUnvote: () => void;

  // Admin
  isAdmin?: boolean;
  onManageGame?: () => void;

  // MVP Voting
  hasUserVotedMVP?: boolean;
  showMVPVoting?: boolean;
  onToggleMVPVoting?: () => void;
  onVoteMVP?: (playerId: string) => void;
  onViewMVPResults?: () => void;
  mvpResults?: MvpResults;
  onFinalizeMVP?: () => void;

  currentUserId: string;
}

export function SundayCard({
  date,
  dayNumber,
  isPast,
  userVoted,
  userVotedNo,
  totalVotes,
  voters,
  nonVoters,
  game,
  userInGame,
  userInWaitlist,
  canVote,
  canUnvote,
  blockReason,
  onVote,
  onVoteNo,
  onUnvote,
  isAdmin,
  onManageGame,
  hasUserVotedMVP,
  showMVPVoting,
  onToggleMVPVoting,
  onVoteMVP,
  onViewMVPResults,
  mvpResults,
  onFinalizeMVP,
  currentUserId
}: SundayCardProps) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  const monthYear = date.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const fullDate = `Domingo ${dayNumber} de ${monthYear}`;

  // Determine card state and styling
  const getCardStyle = () => {
    if (isPast) {
      return theme === 'dark'
        ? 'bg-card/50 border-border opacity-60'
        : 'bg-gray-50 border-gray-200 opacity-60';
    }

    // Yellow state: scheduled game with 10 players but no reservation info
    if (game?.status === 'scheduled' && game.participants.length === 10 && !game.reservationInfo) {
      return theme === 'dark'
        ? 'bg-yellow-950/40 border-yellow-600/30'
        : 'bg-yellow-50 border-yellow-200';
    }

    if (game?.status === 'confirmed' && userInGame) {
      return theme === 'dark'
        ? 'bg-blue-950/40 border-blue-600/30'
        : 'bg-blue-50 border-blue-200';
    }

    if (game?.status === 'confirmed' && userInWaitlist) {
      return theme === 'dark'
        ? 'bg-orange-950/40 border-orange-600/30'
        : 'bg-orange-50 border-orange-200';
    }

    if (userVotedNo) {
      return theme === 'dark'
        ? 'bg-red-950/40 border-red-600/30'
        : 'bg-red-50 border-red-200';
    }

    if (userVoted) {
      return theme === 'dark'
        ? 'bg-emerald-950/40 border-emerald-600/30'
        : 'bg-emerald-50 border-emerald-200';
    }

    return 'bg-card border-border';
  };

  return (
    <div className={`rounded-xl border-2 p-6 transition-all ${getCardStyle()}`}>
      {/* Header with Vote Buttons on Right */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Calendar className="h-6 w-6 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground">
            {fullDate}
          </h3>
        </div>

        {/* Vote Buttons on Right - Show for no game, scheduled, or any non-confirmed/non-completed status */}
        {!isPast && (!game || (game.status !== 'confirmed' && game.status !== 'completed')) ? (
          <div className="flex flex-col gap-2 min-w-[140px]">
            <div className="flex gap-2">
              <button
                onClick={!userVotedNo ? onVoteNo : onUnvote}
                disabled={!canVote && !canUnvote}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-1 ${
                  userVotedNo
                    ? theme === 'dark'
                      ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60 border-2 border-red-600/30'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300'
                    : !canVote && !canUnvote
                      ? 'bg-accent/50 text-muted-foreground cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/80 text-foreground'
                }`}
              >
                {userVotedNo && <Ban className="h-3.5 w-3.5" />}
                NO
              </button>
              <button
                onClick={!userVoted ? onVote : onUnvote}
                disabled={!canVote && !canUnvote}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-1 ${
                  userVoted
                    ? theme === 'dark'
                      ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60 border-2 border-emerald-600/30'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-2 border-emerald-300'
                    : !canVote && !canUnvote
                      ? 'bg-accent/50 text-muted-foreground cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/80 text-foreground'
                }`}
              >
                {userVoted && <CheckCircle className="h-3.5 w-3.5" />}
                SÍ
              </button>
            </div>
            {blockReason && !canVote && !canUnvote && (
              <p className="text-xs text-muted-foreground text-center">{blockReason}</p>
            )}
          </div>
        ) : isPast ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-semibold">PASADO</span>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      {!game && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-6 w-6" />
            <span className="text-lg font-semibold">
              {totalVotes}/10 jugadores
            </span>
          </div>
        </div>
      )}

      {/* Game Details */}
      {game ? (
        <div className={`rounded-lg p-4 mb-4 ${
          theme === 'dark' ? 'bg-background/50' : 'bg-white/50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-bold text-foreground">
                {game.status === 'confirmed' ? 'PARTIDO CONFIRMADO' : 'PARTIDO PROGRAMADO'}
              </span>
            </div>
            {game.reservationInfo && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar detalles
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver detalles
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {game.reservationInfo && showDetails && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{game.reservationInfo.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{game.reservationInfo.time || '10:00'}</span>
                </div>
                {game.reservationInfo.cost && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${(game.reservationInfo.cost / 10).toFixed(0)} por jugador</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Display Players List if teams not arranged yet */}
          {!game.teams && game.participants.length > 0 && (
            <div className={`mt-4 rounded-lg p-3 ${
              theme === 'dark' ? 'bg-background/70' : 'bg-white/70'
            }`}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Jugadores confirmados:
              </p>
              <div className="flex flex-wrap gap-2">
                {game.participants.map((playerId) => {
                  const player = voters.find(v => v.userId === playerId);
                  // Use yellow for scheduled, blue for confirmed, green for completed
                  const getPillColor = () => {
                    if (game.status === 'scheduled') {
                      return theme === 'dark'
                        ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-600/30'
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-300';
                    }
                    if (game.status === 'confirmed') {
                      return theme === 'dark'
                        ? 'bg-blue-900/40 text-blue-300 border border-blue-600/30'
                        : 'bg-blue-100 text-blue-700 border border-blue-300';
                    }
                    // completed or default
                    return theme === 'dark'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/30'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-300';
                  };

                  return (
                    <div
                      key={playerId}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${getPillColor()}`}
                    >
                      <span>{player?.nickname || player?.name || 'Jugador'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Display Teams if arranged */}
          {game.teams && (
            <div className={`mt-4 rounded-lg p-3 ${
              theme === 'dark' ? 'bg-background/70' : 'bg-white/70'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">EQUIPOS</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Team 1 */}
                <div>
                  <div className={`text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    EQUIPO 1
                  </div>
                  <div className="space-y-1">
                    {game.teams.team1.map((playerId, index) => {
                      const player = voters.find(v => v.userId === playerId);
                      return (
                        <div key={playerId} className={`text-xs px-2 py-1 rounded ${
                          playerId === currentUserId
                            ? theme === 'dark'
                              ? 'bg-blue-900/60 text-blue-200 font-semibold'
                              : 'bg-blue-200 text-blue-900 font-semibold'
                            : theme === 'dark'
                              ? 'bg-slate-800/50 text-slate-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {player?.nickname || player?.name || `Jugador ${index + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Team 2 */}
                <div>
                  <div className={`text-xs font-bold mb-2 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    EQUIPO 2
                  </div>
                  <div className="space-y-1">
                    {game.teams.team2.map((playerId, index) => {
                      const player = voters.find(v => v.userId === playerId);
                      return (
                        <div key={playerId} className={`text-xs px-2 py-1 rounded ${
                          playerId === currentUserId
                            ? theme === 'dark'
                              ? 'bg-red-900/60 text-red-200 font-semibold'
                              : 'bg-red-200 text-red-900 font-semibold'
                            : theme === 'dark'
                              ? 'bg-slate-800/50 text-slate-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {player?.nickname || player?.name || `Jugador ${index + 1}`}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Results if game is completed */}
          {game.result && (
            <div className={`mt-4 rounded-lg p-3 ${
              theme === 'dark' ? 'bg-background/70' : 'bg-white/70'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">RESULTADO</span>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className={`text-center px-4 py-2 rounded ${
                  game.result.team1Score > game.result.team2Score
                    ? theme === 'dark'
                      ? 'bg-green-900/40 text-green-300'
                      : 'bg-green-100 text-green-700'
                    : game.result.team1Score < game.result.team2Score
                      ? theme === 'dark'
                        ? 'bg-slate-800/50 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                      : theme === 'dark'
                        ? 'bg-yellow-900/40 text-yellow-300'
                        : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <div className="text-xs font-semibold">EQUIPO 1</div>
                  <div className="text-2xl font-bold">{game.result.team1Score}</div>
                </div>
                <div className="text-xl font-bold text-muted-foreground">-</div>
                <div className={`text-center px-4 py-2 rounded ${
                  game.result.team2Score > game.result.team1Score
                    ? theme === 'dark'
                      ? 'bg-green-900/40 text-green-300'
                      : 'bg-green-100 text-green-700'
                    : game.result.team2Score < game.result.team1Score
                      ? theme === 'dark'
                        ? 'bg-slate-800/50 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                      : theme === 'dark'
                        ? 'bg-yellow-900/40 text-yellow-300'
                        : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <div className="text-xs font-semibold">EQUIPO 2</div>
                  <div className="text-2xl font-bold">{game.result.team2Score}</div>
                </div>
              </div>

              {/* Winner/Draw Message */}
              <div className={`text-center text-sm font-semibold mb-2 ${
                game.result.team1Score === game.result.team2Score
                  ? theme === 'dark'
                    ? 'text-yellow-300'
                    : 'text-yellow-700'
                  : theme === 'dark'
                    ? 'text-green-300'
                    : 'text-green-700'
              }`}>
                {game.result.team1Score > game.result.team2Score
                  ? '🏆 Ganó Equipo 1'
                  : game.result.team2Score > game.result.team1Score
                    ? '🏆 Ganó Equipo 2'
                    : '🤝 Empate'}
              </div>

              {/* MVP Display/Voting */}
              {game.result.mvp ? (
                // Show MVP Result - Bigger Display
                <div className={`mt-4 p-4 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-yellow-950/20 to-amber-950/20 border-yellow-800/30'
                    : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                }`}>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Crown className={`h-6 w-6 ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`} />
                    <h5 className={`font-bold text-lg ${
                      theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
                    }`}>
                      MVP del Partido
                    </h5>
                    <Crown className={`h-6 w-6 ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="text-center">
                    {(() => {
                      const mvpIds = Array.isArray(game.result.mvp) ? game.result.mvp : [game.result.mvp];
                      const mvpPlayers = mvpIds.map(id => {
                        const player = voters.find(v => v.userId === id);
                        return player;
                      }).filter(Boolean);

                      if (mvpIds.length > 1) {
                        return (
                          <div className="space-y-2">
                            <p className={`text-sm font-medium mb-3 ${
                              theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                            }`}>
                              Empate en votación - {mvpIds.length} MVPs
                            </p>
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                              {mvpPlayers.map((mvpPlayer, index) => (
                                <div key={mvpPlayer?.userId || index} className="flex items-center gap-2">
                                  {mvpPlayer?.imageUrl && (
                                    <img
                                      src={mvpPlayer.imageUrl}
                                      alt={mvpPlayer.name}
                                      className="w-10 h-10 rounded-full border-2 border-yellow-400"
                                    />
                                  )}
                                  <span className={`text-lg font-bold ${
                                    theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
                                  }`}>
                                    {mvpPlayer?.nickname || mvpPlayer?.name || 'Jugador'}
                                    {mvpPlayer?.userId === currentUserId && ' (Tú)'}
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
                                className="w-14 h-14 rounded-full border-2 border-yellow-400"
                              />
                            )}
                            <span className={`text-2xl font-bold ${
                              theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'
                            }`}>
                              {mvpPlayer?.nickname || mvpPlayer?.name || 'Jugador'}
                              {mvpPlayer?.userId === currentUserId && ' (Tú)'}
                            </span>
                            <Star className="h-6 w-6 text-yellow-500 fill-current" />
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              ) : userInGame && game.status === 'completed' && onVoteMVP && onToggleMVPVoting ? (
                // Show MVP Voting for Participants
                <div className={`mt-4 p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-blue-950/40 border-blue-600/30' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className={`font-semibold flex items-center gap-2 ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-800'
                    }`}>
                      <Star className="h-5 w-5" />
                      Votación MVP
                    </h5>
                    {!hasUserVotedMVP && (
                      <button
                        onClick={onToggleMVPVoting}
                        className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        {showMVPVoting ? 'Ocultar votación' : 'Votar MVP'}
                      </button>
                    )}
                  </div>

                  {hasUserVotedMVP ? (
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
                      {isAdmin && onViewMVPResults && (
                        <button
                          onClick={onViewMVPResults}
                          className={`mt-2 text-sm font-medium ${
                            theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          Ver resultados (Admin)
                        </button>
                      )}
                    </div>
                  ) : showMVPVoting ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Vota por el mejor jugador del partido (votación anónima):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {game.participants
                          .map(participantId => voters.find(v => v.userId === participantId))
                          .filter(Boolean)
                          .map(player => (
                            <button
                              key={player!.userId}
                              onClick={() => onVoteMVP(player!.userId)}
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
                  {mvpResults && showMVPVoting && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700/30">
                      <h6 className={`font-medium ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      } mb-3`}>
                        Resultados actuales:
                      </h6>
                      <div className="space-y-2">
                        {mvpResults.voteResults.map(result => (
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
                        Total votos: {mvpResults.totalVotes} / {mvpResults.totalParticipants} jugadores
                      </div>

                      {/* Admin-only: Show non-voters list */}
                      {isAdmin && mvpResults.nonVoters && mvpResults.nonVoters.nonVotersCount > 0 && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          theme === 'dark' ? 'bg-orange-950/40 border border-orange-600/30' : 'bg-orange-50 border border-orange-200'
                        }`}>
                          <h6 className={`text-sm font-medium mb-2 ${
                            theme === 'dark' ? 'text-orange-300' : 'text-orange-800'
                          }`}>
                            Pendientes de votar ({mvpResults.nonVoters.nonVotersCount}):
                          </h6>
                          <div className="flex flex-wrap gap-2">
                            {mvpResults.nonVoters.nonVoters.map(user => (
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

                      {isAdmin && onFinalizeMVP && mvpResults.mvp && (
                        <button
                          onClick={onFinalizeMVP}
                          className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          {(() => {
                            const results = mvpResults.voteResults;
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
              ) : null}
            </div>
          )}

          {!game.teams && userInGame && (
            <div className={`mt-3 p-2 rounded-lg text-sm font-semibold text-center ${
              theme === 'dark'
                ? 'bg-blue-900/40 text-blue-300'
                : 'bg-blue-100 text-blue-700'
            }`}>
              ✅ Vas a jugar
            </div>
          )}

          {!game.teams && userInWaitlist && game.waitlist && (
            <div className={`mt-3 p-2 rounded-lg text-sm font-semibold text-center ${
              theme === 'dark'
                ? 'bg-orange-900/40 text-orange-300'
                : 'bg-orange-100 text-orange-700'
            }`}>
              ⏳ Lista de espera
            </div>
          )}

          {/* Admin Game Management Button */}
          {isAdmin && onManageGame && (
            <button
              onClick={onManageGame}
              className={`mt-4 w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Settings className="h-4 w-4" />
              Gestionar Partido
            </button>
          )}
        </div>
      ) : totalVotes > 0 ? (
        /* Voters List - Pills */
        <div className={`rounded-lg p-4 ${
          theme === 'dark' ? 'bg-background/50' : 'bg-white/50'
        }`}>
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            Jugadores disponibles (por orden):
          </p>
          <div className="flex flex-wrap gap-2">
            {voters.map((voter) => (
              <div
                key={voter.userId}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  userVotedNo
                    ? theme === 'dark'
                      ? 'bg-slate-800 text-slate-300 border border-slate-600'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                    : theme === 'dark'
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/30'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}
              >
                <span>{voter.nickname || voter.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`rounded-lg p-4 text-center ${
          theme === 'dark' ? 'bg-background/50' : 'bg-white/50'
        }`}>
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isPast ? 'No hubo votos para esta fecha' : 'Aún no hay votos para este domingo'}
          </p>
        </div>
      )}

      {/* Non-voters list */}
      {!isPast && nonVoters.length > 0 && (
        <div className={`rounded-lg p-4 mt-4 ${
          theme === 'dark' ? 'bg-background/50' : 'bg-white/50'
        }`}>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Jugadores que todavía no votaron: </span>
            {nonVoters.map((player, index) => (
              <span key={player.userId}>
                {player.nickname || player.name}
                {index < nonVoters.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
