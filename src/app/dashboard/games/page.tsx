'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/store';
import { getSundaysInMonth, formatDate, generateTeams } from '@/lib/utils';
import { Game, User } from '@/types';

export default function GamesPage() {
  const { user, isLoaded } = useUser();
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const allUsers = LocalStorage.getUsers();
      const allGames = LocalStorage.getGames();
      const userData = allUsers.find(u => u.id === user.id);
      
      setUsers(allUsers);
      setGames(allGames);
      setCurrentUser(userData || null);
    }
  }, [isLoaded, user]);

  const getAvailablePlayersForSunday = (year: number, month: number, sunday: number): User[] => {
    const availability = LocalStorage.getMonthlyAvailability();
    return users.filter(user => {
      const userAvailability = availability.find(
        a => a.userId === user.id && a.month === month && a.year === year
      );
      return userAvailability?.availableSundays.includes(sunday) || false;
    });
  };

  const createGameForSunday = (year: number, month: number, sunday: number) => {
    const gameDate = new Date(year, month - 1, sunday);
    const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
    
    if (availablePlayers.length < 10) {
      alert(`Solo hay ${availablePlayers.length} jugadores disponibles. Se necesitan 10 para crear un partido.`);
      return;
    }

    const newGame: Game = {
      id: `game-${Date.now()}`,
      date: gameDate,
      status: availablePlayers.length >= 10 ? 'confirmed' : 'scheduled',
      participants: availablePlayers.slice(0, 10).map(p => p.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
  };

  const organizeTeams = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.participants.length !== 10) return;

    const teams = generateTeams(game.participants);
    const updatedGame = { ...game, teams, updatedAt: new Date() };
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    
    setGames(updatedGames);
    LocalStorage.saveGames(updatedGames);
  };


  const getCurrentMonthSundays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const sundays = getSundaysInMonth(year, month);
    
    return sundays
      .filter(sunday => {
        const sundayDate = new Date(year, month - 1, sunday);
        return sundayDate >= now;
      })
      .map(sunday => {
        const date = new Date(year, month - 1, sunday);
        const availablePlayers = getAvailablePlayersForSunday(year, month, sunday);
        const existingGame = games.find(g => 
          g.date.getTime() === date.getTime()
        );
        
        return {
          date,
          sunday,
          month,
          year,
          availablePlayers,
          existingGame,
        };
      });
  };

  if (!isLoaded || !currentUser) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  const upcomingSundays = getCurrentMonthSundays();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Partidos Programados</h1>
        <p className="text-gray-600">Gestiona los partidos del mes</p>
      </div>

      <div className="space-y-6">
        {upcomingSundays.map(({ date, sunday, month, year, availablePlayers, existingGame }) => (
          <div key={`${year}-${month}-${sunday}`} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatDate(date)}
                </h3>
                <p className="text-sm text-gray-600">
                  {availablePlayers.length} jugadores disponibles
                </p>
              </div>
              
              {!existingGame && availablePlayers.length >= 10 && (
                <button
                  onClick={() => createGameForSunday(year, month, sunday)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Confirmar Partido
                </button>
              )}
            </div>

            {availablePlayers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Jugadores disponibles:</h4>
                <div className="flex flex-wrap gap-2">
                  {availablePlayers.map(player => (
                    <span
                      key={player.id}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {player.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {existingGame && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    existingGame.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {existingGame.status === 'confirmed' ? 'Confirmado' : 'Programado'}
                  </span>
                  
                  {currentUser.isAdmin && !existingGame.teams && (
                    <button
                      onClick={() => organizeTeams(existingGame.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Organizar Equipos
                    </button>
                  )}
                </div>

                {existingGame.teams && (
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-red-800 mb-2">Equipo 1</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team1.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className="text-red-700">
                              {player?.name || 'Jugador desconocido'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">Equipo 2</h5>
                      <ul className="space-y-1">
                        {existingGame.teams.team2.map(playerId => {
                          const player = users.find(u => u.id === playerId);
                          return (
                            <li key={playerId} className="text-blue-700">
                              {player?.name || 'Jugador desconocido'}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}

                {existingGame.reservationInfo && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-gray-800 mb-2">Información de Reserva</h5>
                    <p><strong>Lugar:</strong> {existingGame.reservationInfo.location}</p>
                    <p><strong>Hora:</strong> {existingGame.reservationInfo.time}</p>
                    {existingGame.reservationInfo.cost && (
                      <p><strong>Costo:</strong> ${existingGame.reservationInfo.cost}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {upcomingSundays.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">No hay domingos próximos este mes</p>
          </div>
        )}
      </div>
    </div>
  );
}