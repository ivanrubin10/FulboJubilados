"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Calendar, Users, BarChart3, Trophy } from "lucide-react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bouncing-ball">
              <span className="text-xl">⚽</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Fulbo Jubilados</h1>
          </div>
          <div className="flex items-center gap-4">
            {isLoaded && isSignedIn && (
              <Link href="/dashboard">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-all duration-200">
                  Dashboard
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
          
          <h2 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
            Bienvenidos
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Marcá tu disponibilidad, 
            armá equipos equilibrados y llevá el registro completo de todos tus partidos.
          </p>
          
          <div className="inline-flex items-center gap-3 bg-amber-50 border border-amber-200 px-6 py-3 rounded-full mb-12 shadow-sm">
            <span className="text-xl">🕙</span>
            <p className="text-amber-700 font-semibold">
              Domingos a las 10:00 AM
            </p>
          </div>
          
          {isLoaded && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isSignedIn ? (
                <>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
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
                  <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
                    Ir al Dashboard
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="group bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Gestioná tu disponibilidad</h3>
            <p className="text-gray-600 leading-relaxed">
              Marcá fácilmente los domingos que podés jugar y mantené actualizada tu disponibilidad mensual.
            </p>
          </div>
          
          <div className="group bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-1 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Equipos equilibrados</h3>
            <p className="text-gray-600 leading-relaxed">
              Con 10 jugadores confirmados, armamos automáticamente equipos balanceados para partidos parejos.
            </p>
          </div>
          
          <div className="group bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-1 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Estadísticas completas</h3>
            <p className="text-gray-600 leading-relaxed">
              Registrá resultados y analizá tu rendimiento con estadísticas detalladas de todos los partidos.
            </p>
          </div>
          
          <div className="group bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 transform hover:-translate-y-1 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto">
              <Trophy className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rankings y logros</h3>
            <p className="text-gray-600 leading-relaxed">
              Competí sanamente con rankings de victorias, efectividad y el famoso &quot;Hall of Shame&quot;.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
