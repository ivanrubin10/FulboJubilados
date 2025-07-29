'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-sky-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-100 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl animate-spin">⚽</span>
          </div>
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push('/sign-in');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-sky-50 flex items-center justify-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Requerido</h2>
          <p className="text-slate-600 font-medium mb-4">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-sky-50">
      <nav className="glass-morphism border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-11 h-11 flex items-center justify-center bouncing-ball group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">⚽</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 text-shadow-soft tracking-tight">Fulbo Jubilados</h1>
              </Link>
              <div className="hidden md:flex space-x-2">
                <Link 
                  href="/dashboard" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  📅 Mi Disponibilidad
                </Link>
                <Link 
                  href="/dashboard/games" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  ⚽ Partidos
                </Link>
                <Link 
                  href="/dashboard/history" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  📊 Historial
                </Link>
                <Link 
                  href="/dashboard/admin" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  ⚙️ Admin
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/60 backdrop-blur-sm text-slate-600 hover:text-slate-900 transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <UserButton />
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/20">
              <div className="flex flex-col space-y-2 pt-4">
                <Link 
                  href="/dashboard" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📅 Mi Disponibilidad
                </Link>
                <Link 
                  href="/dashboard/games" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ⚽ Partidos
                </Link>
                <Link 
                  href="/dashboard/history" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📊 Historial
                </Link>
                <Link 
                  href="/dashboard/admin" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-white/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ⚙️ Admin
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}