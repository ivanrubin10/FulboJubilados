'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SundayCard } from '@/components/games/SundayCard';
import { EditGameModal } from '@/components/games/EditGameModal';
import { Game, User } from '@/types';

export default function ComponentTestPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [editingGame, setEditingGame] = useState<{ game: Game; key: string } | null>(null);

  const currentUserId = user?.id || 'user_current';
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));

  // Initialize editable games state
  const [editableGames, setEditableGames] = useState<Record<string, Game>>({
    scheduledGame: {
      id: 'threshold-game-id',
      date: new Date(nextSunday),
      status: 'scheduled',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', currentUserId, 'user9', 'user10'],
      waitlist: [],
      reservationInfo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    scheduledWithoutUser: {
      id: 'scheduled-without-user-id',
      date: new Date(nextSunday),
      status: 'scheduled',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    confirmedGame: {
      id: 'confirmed-game-id',
      date: new Date(nextSunday),
      status: 'confirmed',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', currentUserId],
      waitlist: ['user11', 'user12'],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    confirmedGameWaitlist: {
      id: 'confirmed-waitlist-id',
      date: new Date(nextSunday),
      status: 'confirmed',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [currentUserId, 'user12'],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    confirmedGameNotIn: {
      id: 'confirmed-not-in-id',
      date: new Date(nextSunday),
      status: 'confirmed',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    adminGame: {
      id: 'admin-game-id',
      date: new Date(nextSunday),
      status: 'confirmed',
      participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', currentUserId],
      waitlist: ['user11', 'user12'],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    teamsGame: {
      id: 'teams-game-id',
      date: new Date(nextSunday),
      status: 'confirmed',
      participants: ['user1', 'user2', 'user3', currentUserId, 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      teams: {
        team1: ['user1', 'user2', 'user3', currentUserId, 'user5'],
        team2: ['user6', 'user7', 'user8', 'user9', 'user10']
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    completedTeam1Win: {
      id: 'completed-team1-win-id',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
      status: 'completed',
      participants: ['user1', 'user2', 'user3', currentUserId, 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      teams: {
        team1: ['user1', 'user2', 'user3', currentUserId, 'user5'],
        team2: ['user6', 'user7', 'user8', 'user9', 'user10']
      },
      result: {
        team1Score: 5,
        team2Score: 3,
        mvp: 'user1'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    completedTeam2Win: {
      id: 'completed-team2-win-id',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Two weeks ago
      status: 'completed',
      participants: ['user1', 'user2', 'user3', 'user4', currentUserId, 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      teams: {
        team1: ['user1', 'user2', 'user3', 'user4', 'user5'],
        team2: ['user6', 'user7', 'user8', currentUserId, 'user10']
      },
      result: {
        team1Score: 2,
        team2Score: 4,
        mvp: currentUserId
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    completedTie: {
      id: 'completed-tie-id',
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // Three weeks ago
      status: 'completed',
      participants: ['user1', 'user2', 'user3', currentUserId, 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      teams: {
        team1: ['user1', 'user2', 'user3', currentUserId, 'user5'],
        team2: ['user6', 'user7', 'user8', 'user9', 'user10']
      },
      result: {
        team1Score: 3,
        team2Score: 3,
        mvp: 'user6'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    mvpVotingGame: {
      id: 'mvp-voting-game-id',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
      status: 'completed',
      participants: ['user1', 'user2', 'user3', currentUserId, 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      waitlist: [],
      reservationInfo: {
        location: 'Cancha Test',
        time: '10:00',
        cost: 200,
        reservedBy: 'admin',
      },
      teams: {
        team1: ['user1', 'user2', 'user3', currentUserId, 'user5'],
        team2: ['user6', 'user7', 'user8', 'user9', 'user10']
      },
      result: {
        team1Score: 4,
        team2Score: 3,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // MVP voting state
  const [showMVPVoting, setShowMVPVoting] = useState<{[gameId: string]: boolean}>({});
  const [hasUserVotedMVP, setHasUserVotedMVP] = useState<{[gameId: string]: boolean}>({});

  const handleToggleMVPVoting = (gameId: string) => {
    setShowMVPVoting(prev => ({
      ...prev,
      [gameId]: !prev[gameId]
    }));
  };

  const handleVoteMVP = (gameId: string, playerId: string) => {
    console.log(`Voting for player ${playerId} in game ${gameId}`);
    setHasUserVotedMVP(prev => ({
      ...prev,
      [gameId]: true
    }));
    setShowMVPVoting(prev => ({
      ...prev,
      [gameId]: false
    }));
    alert(`✅ Votaste por ${mockUsers.find(u => u.id === playerId)?.nickname || playerId} como MVP!`);
  };

  const handleViewMVPResults = (gameId: string) => {
    console.log(`Viewing MVP results for game ${gameId}`);
    setShowMVPVoting(prev => ({
      ...prev,
      [gameId]: true
    }));
    alert('📊 Aquí verías los resultados de la votación MVP (funcionalidad de admin)');
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isLoaded || !user) return;

      setIsCheckingAdmin(true);
      try {
        const response = await fetch('/api/check-admin');
        if (response.ok) {
          const result = await response.json();
          setIsAdmin(result.isAdmin || false);
          if (!result.isAdmin) {
            router.push('/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/dashboard');
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isLoaded, user, router]);

  const handleSaveGame = (updatedGame: Game) => {
    if (!editingGame) return;

    // Update the game in local state
    setEditableGames(prev => ({
      ...prev,
      [editingGame.key]: updatedGame
    }));

    setEditingGame(null);
    alert('✅ Cambios aplicados a la tarjeta de ejemplo!');
  };

  if (!isLoaded || isCheckingAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Mock users for the modal
  const mockUsers: User[] = [
    { id: 'user1', name: 'Jugador 1', nickname: 'Nick1', imageUrl: undefined, email: 'user1@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user2', name: 'Jugador 2', nickname: 'Nick2', imageUrl: undefined, email: 'user2@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user3', name: 'Jugador 3', nickname: 'Nick3', imageUrl: undefined, email: 'user3@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user4', name: 'Jugador 4', nickname: 'Nick4', imageUrl: undefined, email: 'user4@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user5', name: 'Jugador 5', nickname: 'Nick5', imageUrl: undefined, email: 'user5@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user6', name: 'Jugador 6', nickname: 'Nick6', imageUrl: undefined, email: 'user6@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user7', name: 'Jugador 7', nickname: 'Nick7', imageUrl: undefined, email: 'user7@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user8', name: 'Jugador 8', nickname: 'Nick8', imageUrl: undefined, email: 'user8@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user9', name: 'Jugador 9', nickname: 'Nick9', imageUrl: undefined, email: 'user9@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user10', name: 'Jugador 10', nickname: 'Nick10', imageUrl: undefined, email: 'user10@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user11', name: 'Jugador 11', nickname: 'Nick11', imageUrl: undefined, email: 'user11@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user12', name: 'Jugador 12', nickname: 'Nick12', imageUrl: undefined, email: 'user12@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user13', name: 'Jugador 13', nickname: 'Nick13', imageUrl: undefined, email: 'user13@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: 'user14', name: 'Jugador 14', nickname: 'Nick14', imageUrl: undefined, email: 'user14@test.com', isWhitelisted: true, isAdmin: false, createdAt: new Date(), updatedAt: new Date() },
    { id: currentUserId, name: 'Usuario Actual', nickname: 'Tú', imageUrl: undefined, email: 'current@test.com', isWhitelisted: true, isAdmin: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  const mockVoters = (count: number, includeCurrentUser: boolean = false) => {
    const voters = [];
    for (let i = 1; i <= count; i++) {
      voters.push({
        userId: `user${i}`,
        name: `Jugador ${i}`,
        nickname: `Nick${i}`,
        imageUrl: undefined,
        votedAt: new Date(Date.now() - i * 60000),
        position: i,
      });
    }
    if (includeCurrentUser && !voters.find(v => v.userId === currentUserId)) {
      voters.push({
        userId: currentUserId,
        name: 'Usuario Actual',
        nickname: 'Tú',
        imageUrl: undefined,
        votedAt: new Date(),
        position: voters.length + 1,
      });
    }
    return voters;
  };

  const mockNoVoters = (count: number) => {
    const noVoters = [];
    for (let i = 1; i <= count; i++) {
      noVoters.push({
        userId: `no_user${i}`,
        name: `No Jugador ${i}`,
        nickname: `NoNick${i}`,
        imageUrl: undefined,
      });
    }
    return noVoters;
  };

  const mockNonVoters = (count: number) => {
    const nonVoters = [];
    for (let i = 1; i <= count; i++) {
      nonVoters.push({
        userId: `pending_user${i}`,
        name: `Pendiente ${i}`,
        nickname: undefined,
        imageUrl: undefined,
      });
    }
    return nonVoters;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">SundayCard Component Test</h1>
          <p className="text-muted-foreground">Vista de prueba para todos los estados del componente (Solo Admin)</p>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Haz clic en &quot;Gestionar Partido&quot; en cualquier ejemplo para editar y ver los cambios dinámicamente.
          </p>
        </div>

        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-foreground mb-4 mt-6">📊 FASE DE VOTACIÓN (sin partido creado)</h2>

          {/* State 1: No votes yet */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">1. Sin votos aún (0/10)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={false}
              userVotedNo={false}
              userVoteTimestamp={null}
              totalVotes={0}
              userPositionInQueue={null}
              voters={[]}
              noVoters={[]}
              nonVoters={mockNonVoters(15)}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={true}
              canUnvote={false}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 2: Not voted, can vote, few players */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">2. No votado - Puede votar - Pocos jugadores (3/10)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={false}
              userVotedNo={false}
              userVoteTimestamp={null}
              totalVotes={3}
              userPositionInQueue={null}
              voters={mockVoters(3)}
              noVoters={[]}
              nonVoters={mockNonVoters(5)}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={true}
              canUnvote={false}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 3: Voted YES - Green card */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">3. Votado SÍ - Tarjeta verde (7/10)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={7}
              userPositionInQueue={4}
              voters={mockVoters(7, true)}
              noVoters={mockNoVoters(2)}
              nonVoters={mockNonVoters(3)}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={true}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 4: Voted NO - Red card */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">4. Votado NO - Tarjeta roja</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={false}
              userVotedNo={true}
              userVoteTimestamp={new Date()}
              totalVotes={5}
              userPositionInQueue={null}
              voters={mockVoters(5)}
              noVoters={[...mockNoVoters(3), { userId: currentUserId, name: 'Tú', nickname: 'Usuario Actual', imageUrl: undefined }]}
              nonVoters={mockNonVoters(4)}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={true}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 5: Many NO voters */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">5. Muchos votos NO - Usuario votó SÍ</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={4}
              userPositionInQueue={2}
              voters={mockVoters(4, true)}
              noVoters={mockNoVoters(6)}
              nonVoters={mockNonVoters(3)}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={true}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">⏳ PARTIDO PROGRAMADO (esperando confirmación)</h2>

          {/* State 6: Exactly 10 players - game threshold */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">6. PROGRAMADO - 10 jugadores exactos sin reserva (Amarillo)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={7}
              voters={mockVoters(10, true)}
              noVoters={mockNoVoters(1)}
              nonVoters={mockNonVoters(2)}
              game={editableGames.scheduledGame}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={true}
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.scheduledGame, key: 'scheduledGame' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 7: User didn't vote but match is scheduled */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">7. PROGRAMADO - Usuario NO votó, NO está en el partido (Amarillo)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={false}
              userVotedNo={false}
              userVoteTimestamp={null}
              totalVotes={10}
              userPositionInQueue={null}
              voters={mockVoters(10)}
              noVoters={[]}
              nonVoters={[{ userId: currentUserId, name: 'Usuario Actual', nickname: 'Tú', imageUrl: undefined }]}
              game={editableGames.scheduledWithoutUser}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido programado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.scheduledWithoutUser, key: 'scheduledWithoutUser' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">✅ PARTIDO CONFIRMADO (con info de reserva)</h2>

          {/* State 8: Game confirmed - User in game */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">8. Partido confirmado - Usuario EN el partido (Azul)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={12}
              userPositionInQueue={3}
              voters={mockVoters(12, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.confirmedGame}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Estás confirmado en este partido"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 9: Game confirmed - User in waitlist */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">9. Partido confirmado - Usuario en LISTA DE ESPERA (Naranja)</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={12}
              userPositionInQueue={11}
              voters={mockVoters(12, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.confirmedGameWaitlist}
              userInGame={false}
              userInWaitlist={true}
              canVote={false}
              canUnvote={false}
              blockReason="Partido confirmado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 10: Game confirmed - User NOT in game */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">10. Partido confirmado - Usuario NO en el partido</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={false}
              userVotedNo={false}
              userVoteTimestamp={null}
              totalVotes={10}
              userPositionInQueue={null}
              voters={mockVoters(10)}
              noVoters={[]}
              nonVoters={mockNonVoters(2)}
              game={editableGames.confirmedGameNotIn}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido confirmado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 11: Admin View - Game with Manage Button */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">11. Admin - Partido confirmado con botón &quot;Gestionar Partido&quot;</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={12}
              userPositionInQueue={3}
              voters={mockVoters(12, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.adminGame}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Estás confirmado en este partido"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.adminGame, key: 'adminGame' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 12: Game with Teams Arranged */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">12. Partido con EQUIPOS ARMADOS - Usuario en equipo 1</h2>
            <SundayCard
              date={nextSunday}
              dayNumber={nextSunday.getDate()}
              isPast={false}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={3}
              voters={mockVoters(10, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.teamsGame}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Estás confirmado en este partido"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.teamsGame, key: 'teamsGame' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">🏆 PARTIDOS COMPLETADOS (con resultados)</h2>

          {/* State 13: Completed game - Team 1 won */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">13. Partido COMPLETADO - Equipo 1 ganó 5-3</h2>
            <SundayCard
              date={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
              dayNumber={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getDate()}
              isPast={true}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={3}
              voters={mockVoters(10, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.completedTeam1Win}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido finalizado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.completedTeam1Win, key: 'completedTeam1Win' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 14: Completed game - Team 2 won - User was MVP */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">14. Partido COMPLETADO - Equipo 2 ganó 4-2 - Usuario fue MVP</h2>
            <SundayCard
              date={new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)}
              dayNumber={new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).getDate()}
              isPast={true}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={5}
              voters={mockVoters(10, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.completedTeam2Win}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido finalizado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.completedTeam2Win, key: 'completedTeam2Win' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          {/* State 15: Completed game - Tie */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">15. Partido COMPLETADO - Empate 3-3</h2>
            <SundayCard
              date={new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)}
              dayNumber={new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).getDate()}
              isPast={true}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={4}
              voters={mockVoters(10, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.completedTie}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido finalizado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.completedTie, key: 'completedTie' })}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">🕒 PARTIDO PASADO (sin resultado)</h2>

          {/* State 16: Past game without results */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">16. Partido pasado sin resultado (Gris)</h2>
            <SundayCard
              date={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
              dayNumber={1}
              isPast={true}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={8}
              userPositionInQueue={3}
              voters={mockVoters(8, true)}
              noVoters={[]}
              nonVoters={[]}
              game={null}
              userInGame={false}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Fecha pasada"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">⭐ MVP VOTING</h2>

          {/* MVP Voting Example */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">17. Partido completado - Votación MVP activa</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Este ejemplo muestra la votación de MVP para un partido completado. El usuario puede votar por el mejor jugador.
            </p>
            <SundayCard
              date={editableGames.mvpVotingGame.date}
              dayNumber={1}
              isPast={true}
              userVoted={true}
              userVotedNo={false}
              userVoteTimestamp={new Date()}
              totalVotes={10}
              userPositionInQueue={4}
              voters={mockVoters(10, true)}
              noVoters={[]}
              nonVoters={[]}
              game={editableGames.mvpVotingGame}
              userInGame={true}
              userInWaitlist={false}
              canVote={false}
              canUnvote={false}
              blockReason="Partido finalizado"
              onVote={() => console.log('Vote YES')}
              onVoteNo={() => console.log('Vote NO')}
              onUnvote={() => console.log('Unvote')}
              isAdmin={true}
              onManageGame={() => setEditingGame({ game: editableGames.mvpVotingGame, key: 'mvpVotingGame' })}
              hasUserVotedMVP={hasUserVotedMVP[editableGames.mvpVotingGame.id]}
              showMVPVoting={showMVPVoting[editableGames.mvpVotingGame.id]}
              onToggleMVPVoting={() => handleToggleMVPVoting(editableGames.mvpVotingGame.id)}
              onVoteMVP={(playerId) => handleVoteMVP(editableGames.mvpVotingGame.id, playerId)}
              onViewMVPResults={() => handleViewMVPResults(editableGames.mvpVotingGame.id)}
              currentUserId={currentUserId}
              disableEmailNotifications={true}
            />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">📜 HISTORY CARDS (Estilo Página de Historial)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Estos ejemplos muestran cómo se ven las tarjetas en la página de historial con el nuevo estilo.
          </p>

          {/* History Card Example 1 - With MVP */}
          <div>
            <h2 className="text-xl font-semibold mb-3 text-foreground">18. Partido completado con MVP - Estilo Historial</h2>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Domingo 1 de diciembre de 2024</h3>
                <p className="text-sm text-foreground">Cancha Test - 10:00</p>
              </div>

              {/* Teams Display */}
              <div className="mb-4 rounded-lg p-3 bg-background/70 dark:bg-background/70">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="font-bold text-sm text-foreground">EQUIPOS</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold mb-2 text-blue-400 dark:text-blue-400">EQUIPO 1</div>
                    <div className="space-y-1">
                      {['Nick1', 'Nick2', 'Tú', 'Nick4', 'Nick5'].map((nick, idx) => (
                        <div key={idx} className={`text-xs px-2 py-1 rounded ${nick === 'Tú' ? 'bg-blue-900/60 text-blue-200 font-semibold dark:bg-blue-900/60 dark:text-blue-200' : 'bg-slate-800/50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-300'}`}>
                          {nick}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-2 text-red-400 dark:text-red-400">EQUIPO 2</div>
                    <div className="space-y-1">
                      {['Nick6', 'Nick7', 'Nick8', 'Nick9', 'Nick10'].map((nick, idx) => (
                        <div key={idx} className="text-xs px-2 py-1 rounded bg-slate-800/50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-300">
                          {nick}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Display */}
              <div className="mb-4 rounded-lg p-3 bg-background/70 dark:bg-background/70">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  <span className="font-bold text-sm text-foreground">RESULTADO</span>
                </div>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center px-4 py-2 rounded bg-green-900/40 text-green-300 dark:bg-green-900/40 dark:text-green-300">
                    <div className="text-xs font-semibold">EQUIPO 1</div>
                    <div className="text-2xl font-bold">5</div>
                  </div>
                  <div className="text-xl font-bold text-muted-foreground">-</div>
                  <div className="text-center px-4 py-2 rounded bg-slate-800/50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-400">
                    <div className="text-xs font-semibold">EQUIPO 2</div>
                    <div className="text-2xl font-bold">3</div>
                  </div>
                </div>
                <div className="text-center text-sm font-semibold mb-2 text-green-300 dark:text-green-300">
                  🏆 Ganó Equipo 1
                </div>
              </div>

              {/* MVP Display */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  <h5 className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">MVP del Partido</h5>
                  <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Jugador 1</span>
                    <svg className="h-6 w-6 text-yellow-500 fill-current" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Card Example 2 - Draw */}
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3 text-foreground">19. Partido empatado - Estilo Historial</h2>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground">Domingo 24 de noviembre de 2024</h3>
                <p className="text-sm text-foreground">Cancha Test - 10:00</p>
              </div>

              {/* Teams Display */}
              <div className="mb-4 rounded-lg p-3 bg-background/70 dark:bg-background/70">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span className="font-bold text-sm text-foreground">EQUIPOS</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-bold mb-2 text-blue-400 dark:text-blue-400">EQUIPO 1</div>
                    <div className="space-y-1">
                      {['Nick1', 'Nick2', 'Nick3', 'Nick4', 'Nick5'].map((nick, idx) => (
                        <div key={idx} className="text-xs px-2 py-1 rounded bg-slate-800/50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-300">
                          {nick}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-2 text-red-400 dark:text-red-400">EQUIPO 2</div>
                    <div className="space-y-1">
                      {['Nick6', 'Tú', 'Nick8', 'Nick9', 'Nick10'].map((nick, idx) => (
                        <div key={idx} className={`text-xs px-2 py-1 rounded ${nick === 'Tú' ? 'bg-red-900/60 text-red-200 font-semibold dark:bg-red-900/60 dark:text-red-200' : 'bg-slate-800/50 text-slate-300 dark:bg-slate-800/50 dark:text-slate-300'}`}>
                          {nick}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Display */}
              <div className="rounded-lg p-3 bg-background/70 dark:bg-background/70">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  <span className="font-bold text-sm text-foreground">RESULTADO</span>
                </div>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center px-4 py-2 rounded bg-yellow-900/40 text-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300">
                    <div className="text-xs font-semibold">EQUIPO 1</div>
                    <div className="text-2xl font-bold">3</div>
                  </div>
                  <div className="text-xl font-bold text-muted-foreground">-</div>
                  <div className="text-center px-4 py-2 rounded bg-yellow-900/40 text-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300">
                    <div className="text-xs font-semibold">EQUIPO 2</div>
                    <div className="text-2xl font-bold">3</div>
                  </div>
                </div>
                <div className="text-center text-sm font-semibold mb-2 text-yellow-300 dark:text-yellow-300">
                  🤝 Empate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Game Modal */}
      {editingGame && (
        <EditGameModal
          game={editingGame.game}
          users={mockUsers}
          onSave={handleSaveGame}
          onClose={() => setEditingGame(null)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
