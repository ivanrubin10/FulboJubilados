'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { useToast } from '@/components/ui/toast';

// API helper functions
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
  
  async addUser(user: User) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error('Failed to add user');
    return res.json();
  }
};

export default function SetupNickname() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { error } = useToast();
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!isLoaded || !user) return;
      
      setIsInitialLoading(true);
      try {
        const existingUser = await apiClient.getUserById(user.id);
        
        if (existingUser?.nickname) {
          // User already has a nickname, redirect to dashboard
          router.push('/dashboard');
          return;
        }
        
        // Pre-fill with user's first name if available
        if (user.firstName) {
          setNickname(user.firstName);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    checkUser();
  }, [isLoaded, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !nickname.trim()) return;
    
    setIsLoading(true);
    try {
      const existingUser = await apiClient.getUserById(user.id);
      
      if (existingUser) {
        // Update existing user
        const updatedUser = { ...existingUser, nickname: nickname.trim() };
        await apiClient.updateUser(updatedUser);
      } else {
        // Create new user with nickname
        const userEmail = user.emailAddresses[0]?.emailAddress || '';
        const newUser: User = {
          id: user.id,
          email: userEmail,
          name: user.fullName || user.firstName || 'Usuario',
          nickname: nickname.trim(),
          imageUrl: user.imageUrl,
          isAdmin: userEmail === 'ivanrubin10@gmail.com',
          isWhitelisted: true,
          createdAt: new Date(),
        };
        await apiClient.addUser(newUser);
      }
      
      router.push('/dashboard');
    } catch (err) {
      console.error('Error saving nickname:', err);
      
      // Show more detailed error information
      const errorMessage = 'Error al guardar el apodo. Por favor, inténtalo de nuevo.';
      let errorDetails = '';
      if (err instanceof Error) {
        console.error('Error details:', err.message);
        errorDetails = `Detalles técnicos: ${err.message}`;
      }
      
      error(errorMessage, errorDetails);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || isInitialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">No se pudo cargar el usuario</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            ¡Bienvenido! ⚽
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Configurá tu apodo para empezar
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-2">
                  Tu apodo
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:z-10 text-base"
                  placeholder="Tu apodo"
                  disabled={isLoading}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Así te van a ver en los partidos y la lista de jugadores
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!nickname.trim() || isLoading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Continuar al Dashboard'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}