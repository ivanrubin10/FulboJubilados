'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LocalStorage } from '@/lib/store';
import { User } from '@/types';

export default function SetupNickname() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoaded && user) {
      const existingUser = LocalStorage.getUserById(user.id);
      if (existingUser?.nickname) {
        router.push('/dashboard');
      }
    }
  }, [isLoaded, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('Por favor ingresa un apodo');
      return;
    }

    if (nickname.length < 2) {
      setError('El apodo debe tener al menos 2 caracteres');
      return;
    }

    if (nickname.length > 20) {
      setError('El apodo no puede tener más de 20 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (user) {
        const existingUser = LocalStorage.getUserById(user.id);
        
        if (existingUser) {
          const updatedUser: User = {
            ...existingUser,
            nickname: nickname.trim(),
          };
          LocalStorage.updateUser(updatedUser);
        } else {
          const newUser: User = {
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.fullName || user.firstName || 'Usuario',
            nickname: nickname.trim(),
            imageUrl: user.imageUrl,
            isAdmin: false,
            createdAt: new Date(),
          };
          LocalStorage.addUser(newUser);
        }

        router.push('/dashboard');
      }
    } catch {
      setError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-sky-50 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            ¡Bienvenido!
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Para empezar, elige un apodo que te identifique en los partidos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-semibold text-slate-800 mb-3">
              Tu apodo
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej: Ronaldinho, El Crack, Messi..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              maxLength={20}
              disabled={isSubmitting}
            />
            <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
              <span>📝</span>
              Entre 2 y 20 caracteres
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-red-500">❌</span>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !nickname.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-lg"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>🚀</span>
                Continuar
              </div>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 flex items-center justify-center gap-1">
              <span>💡</span>
              Podrás cambiar tu apodo más tarde en la configuración
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}