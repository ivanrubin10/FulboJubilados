'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSundaysInMonth, getCapitalizedMonthYear } from '@/lib/utils';
import { Game, User } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/contexts/theme-context';
import { SundayCard } from '@/components/games/SundayCard';
import { EditGameModal } from '@/components/games/EditGameModal';
import { Calendar, AlertCircle } from 'lucide-react';

interface DayVote {
  userId: string;
  day: number;
  votedAt: Date;
  voteType: 'yes' | 'no';
}

interface SundayData {
  date: Date;
  dayNumber: number;
  isPast: boolean;
  userVoted: boolean;
  userVotedNo: boolean;
  userVoteTimestamp: Date | null;
  totalVotes: number;
  userPositionInQueue: number | null;
  voters: Array<{
    userId: string;
    name: string;
    nickname?: string;
    imageUrl?: string;
    votedAt: Date;
    position: number;
  }>;
  noVoters: Array<{
    userId: string;
    name: string;
    nickname?: string;
    imageUrl?: string;
  }>;
  nonVoters: Array<{
    userId: string;
    name: string;
    nickname?: string;
    imageUrl?: string;
  }>;
  game: Game | null;
  userInGame: boolean;
  userInWaitlist: boolean;
  canVote: boolean;
  canUnvote: boolean;
  blockReason?: string;
}

export default function GamesPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { success, error } = useToast();
  const { theme } = useTheme();

  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [activeYear, setActiveYear] = useState<number>(new Date().getFullYear());

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [currentMonthDayVotes, setCurrentMonthDayVotes] = useState<DayVote[]>([]);
  const [nextMonthDayVotes, setNextMonthDayVotes] = useState<DayVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingGame, setEditingGame] = useState<{ game: Game; noVoters: string[] } | null>(null);

  const [currentMonthSundaysData, setCurrentMonthSundaysData] = useState<SundayData[]>([]);
  const [nextMonthSundaysData, setNextMonthSundaysData] = useState<SundayData[]>([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded || !user) return;

      setIsLoading(true);
      try {
        // Fetch settings, users, games in parallel
        const [settingsRes, usersRes, gamesRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/users'),
          fetch('/api/games')
        ]);

        const settings = settingsRes.ok ? await settingsRes.json() : { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        const allUsers = await usersRes.json();
        const allGames = await gamesRes.json();

        setActiveMonth(settings.month);
        setActiveYear(settings.year);

        setUsers(allUsers);

        const gamesWithDates = allGames.map((game: Game) => ({
          ...game,
          date: new Date(game.date),
          createdAt: new Date(game.createdAt),
          updatedAt: new Date(game.updatedAt)
        }));
        setGames(gamesWithDates);

        const userData = allUsers.find((u: User) => u.id === user.id);
        setCurrentUser(userData || null);

        // Check admin status
        const userIsAdmin = userData?.isAdmin || false;
        setIsAdmin(userIsAdmin);

        // Check if user needs nickname setup
        if (!userData?.nickname) {
          router.push('/setup-nickname');
          return;
        }

        // If admin, check for any Sundays with 10+ votes that need games created
        if (userIsAdmin) {
          try {
            console.log('🔄 Admin detected - checking for games that need to be created...');
            const checkRes = await fetch('/api/admin/check-and-create-games', {
              method: 'POST'
            });
            if (checkRes.ok) {
              const result = await checkRes.json();
              if (result.gamesCreated > 0 || result.gamesUpdated > 0) {
                console.log(`✅ Created ${result.gamesCreated} games, updated ${result.gamesUpdated} games`);
                // Reload games if any were created/updated
                const newGamesRes = await fetch('/api/games');
                const newGames = await newGamesRes.json();
                const newGamesWithDates = newGames.map((game: Game) => ({
                  ...game,
                  date: new Date(game.date),
                  createdAt: new Date(game.createdAt),
                  updatedAt: new Date(game.updatedAt)
                }));
                setGames(newGamesWithDates);
              }
            }
          } catch (err) {
            console.error('Error checking for games to create:', err);
            // Don't fail the page load if this fails
          }
        }

      } catch (err) {
        console.error('Error loading data:', err);
        error('Error', 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isLoaded, user, router, error]);

  // Load both current and next month data
  useEffect(() => {
    const loadMonthsData = async () => {
      if (!currentUser) return;

      try {
        // Calculate next month
        let nextMonth = activeMonth + 1;
        let nextYear = activeYear;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }

        // Fetch day votes for both months
        const [currentMonthVotesRes, nextMonthVotesRes] = await Promise.all([
          fetch(`/api/day-votes?year=${activeYear}&month=${activeMonth}`),
          fetch(`/api/day-votes?year=${nextYear}&month=${nextMonth}`)
        ]);

        const currentVotes = await currentMonthVotesRes.json();
        const nextVotes = await nextMonthVotesRes.json();

        setCurrentMonthDayVotes(currentVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
        setNextMonthDayVotes(nextVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));

      } catch (err) {
        console.error('Error loading months data:', err);
      }
    };

    loadMonthsData();
  }, [currentUser, activeMonth, activeYear]);

  // Build Sunday data for both months
  useEffect(() => {
    if (!currentUser) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate next month
    let nextMonth = activeMonth + 1;
    let nextYear = activeYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    // Build data for current month
    const buildMonthData = (year: number, month: number, monthDayVotes: DayVote[]) => {
      const sundays = getSundaysInMonth(year, month);

      // Filter out past Sundays (but keep today)
      const futureSundays = sundays.filter(dayNumber => {
        const date = new Date(year, month - 1, dayNumber);
        date.setHours(0, 0, 0, 0);
        return date >= today; // Include today
      });

      return futureSundays.map(dayNumber => {
        const date = new Date(year, month - 1, dayNumber);
        date.setHours(0, 0, 0, 0);
        const isPast = false; // Already filtered out past days

        // Find game for this day
        const game = games.find(g => {
          const gameDate = new Date(g.date);
          return gameDate.getFullYear() === year &&
                 gameDate.getMonth() === month - 1 &&
                 gameDate.getDate() === dayNumber;
        });

        // Get all votes for this day
        const dayVotes = monthDayVotes.filter(v => v.day === dayNumber);

        // Separate yes votes and no votes
        const yesVotes = dayVotes.filter(v => v.voteType === 'yes');
        const noVotes = dayVotes.filter(v => v.voteType === 'no');

        const yesVotersWithInfo = yesVotes.map((vote, index) => {
          const voterUser = users.find(u => u.id === vote.userId);
          return {
            userId: vote.userId,
            name: voterUser?.name || 'Unknown',
            nickname: voterUser?.nickname,
            imageUrl: voterUser?.imageUrl,
            votedAt: vote.votedAt,
            position: index + 1
          };
        }).sort((a, b) => a.votedAt.getTime() - b.votedAt.getTime());

        const noVotersWithInfo = noVotes.map(vote => {
          const voterUser = users.find(u => u.id === vote.userId);
          return {
            userId: vote.userId,
            name: voterUser?.name || 'Unknown',
            nickname: voterUser?.nickname,
            imageUrl: voterUser?.imageUrl
          };
        });

        // Calculate non-voters (users who haven't voted yes or no)
        const votedUserIds = new Set(dayVotes.map(v => v.userId));
        const nonVoters = users
          .filter(u => !votedUserIds.has(u.id) && u.isWhitelisted)
          .map(u => ({
            userId: u.id,
            name: u.name,
            nickname: u.nickname,
            imageUrl: u.imageUrl
          }));

        const userVote = dayVotes.find(v => v.userId === currentUser.id);
        const userVoted = userVote?.voteType === 'yes';
        const userVotedNo = userVote?.voteType === 'no';
        const userPositionInQueue = userVoted ? yesVotersWithInfo.findIndex(v => v.userId === currentUser.id) + 1 : null;

        const userInGame = game?.participants.includes(currentUser.id) || false;
        const userInWaitlist = game?.waitlist?.includes(currentUser.id) || false;

        // Determine if user can vote/unvote
        // Users can vote/unvote on scheduled games, but not on confirmed games
        const isConfirmedGame = game?.status === 'confirmed';
        const isScheduledGame = game?.status === 'scheduled';

        let canVote = !isPast && !userVoted && !userVotedNo;
        let canUnvote = (userVoted || userVotedNo) && !isConfirmedGame;
        let blockReason = '';

        if (isPast) {
          canVote = false;
          canUnvote = false;
          blockReason = 'Fecha pasada';
        } else if (isConfirmedGame && userInGame) {
          canVote = false;
          canUnvote = false;
          blockReason = 'Estás confirmado en este partido';
        } else if (isConfirmedGame && !userInGame) {
          canVote = false;
          canUnvote = false;
          blockReason = 'Partido confirmado';
        }
        // Allow voting on scheduled games - no blocking needed

        return {
          date,
          dayNumber,
          isPast,
          userVoted,
          userVotedNo,
          userVoteTimestamp: userVote?.votedAt || null,
          totalVotes: yesVotes.length,
          userPositionInQueue,
          voters: yesVotersWithInfo,
          noVoters: noVotersWithInfo,
          nonVoters,
          game: game || null,
          userInGame,
          userInWaitlist,
          canVote,
          canUnvote,
          blockReason
        };
      });
    };

    const currentData = buildMonthData(activeYear, activeMonth, currentMonthDayVotes);
    const nextData = buildMonthData(nextYear, nextMonth, nextMonthDayVotes);

    setCurrentMonthSundaysData(currentData);
    setNextMonthSundaysData(nextData);
  }, [currentUser, users, games, currentMonthDayVotes, nextMonthDayVotes, activeMonth, activeYear]);

  const handleVote = useCallback(async (dayNumber: number, year: number, month: number) => {
    if (!currentUser) return;

    // Optimistic update - immediately add the vote to local state
    const newVote: DayVote = {
      userId: currentUser.id,
      day: dayNumber,
      votedAt: new Date(),
      voteType: 'yes'
    };

    const isCurrentMonth = year === activeYear && month === activeMonth;

    if (isCurrentMonth) {
      setCurrentMonthDayVotes(prev => [...prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)), newVote]);
    } else {
      setNextMonthDayVotes(prev => [...prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)), newVote]);
    }

    success('Voto registrado', `Votaste SÍ por el domingo ${dayNumber}`);

    try {
      const response = await fetch('/api/day-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          year,
          month,
          day: dayNumber,
          voteType: 'yes'
        })
      });

      if (!response.ok) throw new Error('Failed to vote');

      // Silently sync with server data in background
      let nextMonth = activeMonth + 1;
      let nextYear = activeYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      const [currentVotesRes, nextVotesRes] = await Promise.all([
        fetch(`/api/day-votes?year=${activeYear}&month=${activeMonth}`),
        fetch(`/api/day-votes?year=${nextYear}&month=${nextMonth}`)
      ]);

      const currentVotes = await currentVotesRes.json();
      const nextVotes = await nextVotesRes.json();

      setCurrentMonthDayVotes(currentVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
      setNextMonthDayVotes(nextVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
    } catch (err) {
      console.error('Error voting:', err);
      // Revert optimistic update on error
      if (isCurrentMonth) {
        setCurrentMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
      } else {
        setNextMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
      }
      error('Error', 'No se pudo registrar el voto');
    }
  }, [currentUser, activeMonth, activeYear, success, error]);

  const handleVoteNo = useCallback(async (dayNumber: number, year: number, month: number) => {
    if (!currentUser) return;

    // Optimistic update - immediately add the vote to local state
    const newVote: DayVote = {
      userId: currentUser.id,
      day: dayNumber,
      votedAt: new Date(),
      voteType: 'no'
    };

    const isCurrentMonth = year === activeYear && month === activeMonth;

    if (isCurrentMonth) {
      setCurrentMonthDayVotes(prev => [...prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)), newVote]);
    } else {
      setNextMonthDayVotes(prev => [...prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)), newVote]);
    }

    success('Voto registrado', `Votaste NO por el domingo ${dayNumber}`);

    try {
      const response = await fetch('/api/day-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          year,
          month,
          day: dayNumber,
          voteType: 'no'
        })
      });

      if (!response.ok) throw new Error('Failed to vote');

      // Silently sync with server data in background
      let nextMonth = activeMonth + 1;
      let nextYear = activeYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      const [currentVotesRes, nextVotesRes] = await Promise.all([
        fetch(`/api/day-votes?year=${activeYear}&month=${activeMonth}`),
        fetch(`/api/day-votes?year=${nextYear}&month=${nextMonth}`)
      ]);

      const currentVotes = await currentVotesRes.json();
      const nextVotes = await nextVotesRes.json();

      setCurrentMonthDayVotes(currentVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
      setNextMonthDayVotes(nextVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
    } catch (err) {
      console.error('Error voting:', err);
      // Revert optimistic update on error
      if (isCurrentMonth) {
        setCurrentMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
      } else {
        setNextMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
      }
      error('Error', 'No se pudo registrar el voto');
    }
  }, [currentUser, activeMonth, activeYear, success, error]);

  const handleUnvote = useCallback(async (dayNumber: number, year: number, month: number) => {
    if (!currentUser) return;

    const isCurrentMonth = year === activeYear && month === activeMonth;

    // Store previous vote for rollback if needed
    const previousVote = isCurrentMonth
      ? currentMonthDayVotes.find(v => v.userId === currentUser.id && v.day === dayNumber)
      : nextMonthDayVotes.find(v => v.userId === currentUser.id && v.day === dayNumber);

    // Optimistic update - immediately remove the vote from local state
    if (isCurrentMonth) {
      setCurrentMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
    } else {
      setNextMonthDayVotes(prev => prev.filter(v => !(v.userId === currentUser.id && v.day === dayNumber)));
    }

    success('Voto eliminado', `Removiste tu voto del domingo ${dayNumber}`);

    try {
      const response = await fetch(`/api/day-vote?userId=${currentUser.id}&year=${year}&month=${month}&day=${dayNumber}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to unvote');

      // Silently sync with server data in background
      let nextMonth = activeMonth + 1;
      let nextYear = activeYear;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }

      const [currentVotesRes, nextVotesRes] = await Promise.all([
        fetch(`/api/day-votes?year=${activeYear}&month=${activeMonth}`),
        fetch(`/api/day-votes?year=${nextYear}&month=${nextMonth}`)
      ]);

      const currentVotes = await currentVotesRes.json();
      const nextVotes = await nextVotesRes.json();

      setCurrentMonthDayVotes(currentVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
      setNextMonthDayVotes(nextVotes.map((v: { userId: string; year: number; month: number; day: number; voteType: string; votedAt: string }) => ({ ...v, votedAt: new Date(v.votedAt) })));
    } catch (err) {
      console.error('Error unvoting:', err);
      // Revert optimistic update on error
      if (previousVote) {
        if (isCurrentMonth) {
          setCurrentMonthDayVotes(prev => [...prev, previousVote]);
        } else {
          setNextMonthDayVotes(prev => [...prev, previousVote]);
        }
      }
      error('Error', 'No se pudo eliminar el voto');
    }
  }, [currentUser, activeMonth, activeYear, currentMonthDayVotes, nextMonthDayVotes, success, error]);

  // Game management handlers
  const handleManageGame = useCallback((game: Game, noVoters: string[]) => {
    setEditingGame({ game, noVoters });
  }, []);

  const handleSaveGame = useCallback(async (updatedGame: Game) => {
    try {
      // Save the game
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([updatedGame])
      });

      if (!res.ok) throw new Error('Failed to save game');

      // Update local state
      setGames(prev => prev.map(g => g.id === updatedGame.id ? updatedGame : g));

      // Close modal
      setEditingGame(null);

      success('Partido guardado', 'Los cambios fueron guardados exitosamente');

      // Reload data to refresh everything
      window.location.reload();
    } catch (err) {
      console.error('Error saving game:', err);
      error('Error', 'No se pudo guardar el partido');
    }
  }, [success, error]);


  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">No se pudo cargar el usuario</p>
      </div>
    );
  }

  // Calculate next month for display
  let nextMonth = activeMonth + 1;
  let nextYear = activeYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Partidos y Disponibilidad
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Marca los domingos que puedes jugar y ve los partidos programados
          </p>
        </div>

        {/* Non-whitelisted warning */}
        {!currentUser.isWhitelisted && (
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark'
              ? 'bg-red-950/40 border border-red-600/30'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className={`h-5 w-5 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`} />
              <p className={`font-semibold text-sm ${
                theme === 'dark' ? 'text-red-300' : 'text-red-800'
              }`}>
                Usuario no habilitado
              </p>
            </div>
            <p className={`text-sm ml-8 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-700'
            }`}>
              Tu voto no está siendo contado. Necesitas ser habilitado por un administrador.
            </p>
          </div>
        )}

        {/* Current Month */}
        {currentMonthSundaysData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold text-foreground">
                {getCapitalizedMonthYear(activeYear, activeMonth)}
              </h2>
            </div>
            <div className="space-y-4">
              {currentMonthSundaysData.map(sunday => (
                <SundayCard
                  key={`current-${sunday.dayNumber}`}
                  {...sunday}
                  onVote={() => handleVote(sunday.dayNumber, activeYear, activeMonth)}
                  onVoteNo={() => handleVoteNo(sunday.dayNumber, activeYear, activeMonth)}
                  onUnvote={() => handleUnvote(sunday.dayNumber, activeYear, activeMonth)}
                  isAdmin={isAdmin}
                  onManageGame={sunday.game ? () => handleManageGame(sunday.game!, sunday.noVoters.map(v => v.userId)) : undefined}
                  currentUserId={currentUser.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Next Month */}
        {nextMonthSundaysData.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
              <h2 className="text-2xl font-bold text-foreground">
                {getCapitalizedMonthYear(nextYear, nextMonth)}
              </h2>
            </div>
            <div className="space-y-4">
              {nextMonthSundaysData.map(sunday => (
                <SundayCard
                  key={`next-${sunday.dayNumber}`}
                  {...sunday}
                  onVote={() => handleVote(sunday.dayNumber, nextYear, nextMonth)}
                  onVoteNo={() => handleVoteNo(sunday.dayNumber, nextYear, nextMonth)}
                  onUnvote={() => handleUnvote(sunday.dayNumber, nextYear, nextMonth)}
                  isAdmin={isAdmin}
                  onManageGame={sunday.game ? () => handleManageGame(sunday.game!, sunday.noVoters.map(v => v.userId)) : undefined}
                  currentUserId={currentUser.id}
                />
              ))}
            </div>
          </div>
        )}

        {currentMonthSundaysData.length === 0 && nextMonthSundaysData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No hay domingos disponibles para votar en este momento</p>
          </div>
        )}
      </div>

      {/* Edit Game Modal */}
      {editingGame && (
        <EditGameModal
          game={editingGame.game}
          users={users}
          onSave={handleSaveGame}
          onClose={() => setEditingGame(null)}
          currentUserId={currentUser.id}
          noVoters={editingGame.noVoters}
        />
      )}
    </div>
  );
}
