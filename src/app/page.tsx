"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Calendar, Users, BarChart3, Trophy, Settings, History, TrendingUp, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (isSignedIn && user) {
        try {
          const response = await fetch('/api/users/current');
          if (response.ok) {
            const userData = await response.json();
            setIsAdmin(userData.isAdmin || false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };
    checkAdmin();
  }, [isSignedIn, user]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bouncing-ball">
              <span className="text-xl">⚽</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">Fulbo Jubilados</h1>
          </div>
          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn && (
              <Link href="/dashboard">
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 shadow-sm transition-all duration-200">
                  Marcá tu disponibilidad
                </button>
              </Link>
            )}
            <UserButton />
          </div>
        </div>
      </nav>
      
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="w-24 h-24 flex items-center justify-center mb-8 mx-auto bouncing-ball">
            <span className="text-5xl drop-shadow-lg">⚽</span>
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-6 leading-tight">
            Bienvenidos
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Marcá tu disponibilidad, 
            armá equipos equilibrados y llevá el registro completo de todos tus partidos.
          </p>
          
          <div className="inline-flex items-center gap-3 bg-accent border border-border px-6 py-3 rounded-full mb-12 shadow-sm">
            <span className="text-xl">🕙</span>
            <p className="text-accent-foreground font-semibold">
              Domingos a la mañana
            </p>
          </div>
          
          {isLoaded && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                      Iniciar Sesión
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                      Registrarse
                    </button>
                  </SignUpButton>
                </>
              ) : (
                <Link href="/dashboard">
                  <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                    Marcá tu disponibilidad
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Features Section or Navigation Cards */}
        {isSignedIn ? (
          <div className="max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-8 text-center">Navegación Rápida</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Partidos */}
              <Link href="/dashboard/games" className="group">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                    <Trophy className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Partidos</h4>
                  <p className="text-sm text-muted-foreground">Equipos y partidos confirmados</p>
                </div>
              </Link>

              {/* Historial */}
              <Link href="/dashboard/history" className="group">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                    <BarChart3 className="h-7 w-7 text-purple-600 dark:text-purple-300" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Historial</h4>
                  <p className="text-sm text-muted-foreground">Ver todos los partidos jugados</p>
                </div>
              </Link>

              {/* Rankings */}
              <Link href="/dashboard/rankings" className="group">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                    <TrendingUp className="h-7 w-7 text-orange-600 dark:text-orange-300" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Rankings</h4>
                  <p className="text-sm text-muted-foreground">Estadísticas y clasificaciones</p>
                </div>
              </Link>

              {/* Perfil */}
              <Link href="/dashboard/profile" className="group">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                    <User className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Perfil</h4>
                  <p className="text-sm text-muted-foreground">Estadísticas personales</p>
                </div>
              </Link>

              {/* Admin - Only show if user is admin */}
              {isAdmin && (
                <Link href="/dashboard/admin" className="group">
                  <div className="bg-card border border-red-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-red-500/70 transition-all duration-300 transform hover:-translate-y-1 text-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 mx-auto">
                      <Settings className="h-7 w-7 text-red-600 dark:text-red-300" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2">Admin</h4>
                    <p className="text-sm text-muted-foreground">Panel de administración</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="group bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Gestioná tu disponibilidad</h3>
              <p className="text-muted-foreground leading-relaxed">
                Marcá fácilmente los domingos que podés jugar y mantené actualizada tu disponibilidad mensual.
              </p>
            </div>

            <div className="group bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Equipos equilibrados</h3>
              <p className="text-muted-foreground leading-relaxed">
                Con 10 jugadores confirmados, armamos automáticamente equipos balanceados para partidos parejos.
              </p>
            </div>

            <div className="group bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-purple-500/30 transition-all duration-300 transform hover:-translate-y-1 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Estadísticas completas</h3>
              <p className="text-muted-foreground leading-relaxed">
                Registrá resultados y analizá tu rendimiento con estadísticas detalladas de todos los partidos.
              </p>
            </div>

            <div className="group bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-orange-500/30 transition-all duration-300 transform hover:-translate-y-1 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
                <Trophy className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Rankings y logros</h3>
              <p className="text-muted-foreground leading-relaxed">
                Competí sanamente con rankings de victorias, efectividad y el famoso &quot;Hall of Shame&quot;.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
