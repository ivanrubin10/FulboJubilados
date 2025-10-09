'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Settings, BarChart3, Trophy, Menu, X, Lock, User, TrendingUp } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isLoaded || !user) return;
      
      setIsCheckingAdmin(true);
      try {
        const response = await fetch('/api/check-admin');
        if (response.ok) {
          const result = await response.json();
          setIsAdmin(result.isAdmin || false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isLoaded, user]);

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center">
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-200 to-sky-200 dark:from-emerald-800 dark:to-sky-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl animate-spin">⚽</span>
          </div>
          <p className="text-muted-foreground font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect to home page if not authenticated
  if (!isSignedIn) {
    router.push('/');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center">
        <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-200 to-orange-200 dark:from-red-800 dark:to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Acceso Requerido</h2>
          <p className="text-muted-foreground font-medium mb-4">Redirigiendo a la página principal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <nav className="glass-morphism border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="w-11 h-11 flex items-center justify-center bouncing-ball group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">⚽</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground text-shadow-soft tracking-tight">Fulbo Jubilados</h1>
              </Link>
              <div className="hidden md:flex space-x-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  <Calendar className="h-4 w-4" />
                  Calendario
                </Link>
                <Link 
                  href="/dashboard/games" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  <Trophy className="h-4 w-4" />
                  Partidos
                </Link>
                <Link
                  href="/dashboard/history"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  <BarChart3 className="h-4 w-4" />
                  Historial
                </Link>
                <Link
                  href="/dashboard/rankings"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  <TrendingUp className="h-4 w-4" />
                  Rankings
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                >
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
                {isAdmin && (
                  <Link 
                    href="/dashboard/admin" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-4 py-2 rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm text-sm"
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <UserButton />
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border/20">
              <div className="flex flex-col space-y-2 pt-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar className="h-4 w-4" />
                  Calendario
                </Link>
                <Link 
                  href="/dashboard/games" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Trophy className="h-4 w-4" />
                  Partidos
                </Link>
                <Link
                  href="/dashboard/history"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Historial
                </Link>
                <Link
                  href="/dashboard/rankings"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <TrendingUp className="h-4 w-4" />
                  Rankings
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
                {isAdmin && (
                  <Link 
                    href="/dashboard/admin" 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-card/60 px-3 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}