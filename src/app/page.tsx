import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-sky-50">
      <nav className="glass-morphism border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center bouncing-ball">
              <span className="text-2xl">⚽</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 text-shadow-soft tracking-tight">Fulbo Jubilados</h1>
          </div>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </nav>
      
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-20">
          <div className="inline-block mb-8">
            <div className="w-24 h-24 flex items-center justify-center mb-6 mx-auto bouncing-ball">
              <span className="text-6xl drop-shadow-lg">⚽</span>
            </div>
          </div>
          <h2 className="text-6xl font-black text-slate-900 mb-8 leading-tight text-shadow-soft tracking-tight">
            Organiza tus partidos de<br />
            <span className="text-gradient bg-gradient-to-r from-emerald-600 via-sky-600 to-violet-600 bg-clip-text text-transparent">
              fútbol 5v5
            </span>
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed font-medium">
            Marca tu disponibilidad para los domingos, organiza equipos de manera equilibrada 
            y lleva un historial completo de todos tus partidos
          </p>
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-sky-100 px-6 py-3 rounded-2xl border border-emerald-200 mb-12">
            <span className="text-2xl">🕙</span>
            <p className="text-emerald-800 font-bold text-lg">
              Domingos a las 10:00 AM
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <SignInButton mode="modal">
              <button className="button-glow bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-10 py-5 rounded-2xl font-bold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-2xl hover:shadow-emerald-500/25 transform hover:-translate-y-1 hover:scale-105 text-lg tracking-wide">
                ✨ Iniciar Sesión
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="button-glow bg-gradient-to-r from-sky-600 to-sky-700 text-white px-10 py-5 rounded-2xl font-bold hover:from-sky-700 hover:to-sky-800 transition-all duration-300 shadow-2xl hover:shadow-sky-500/25 transform hover:-translate-y-1 hover:scale-105 text-lg tracking-wide">
                🚀 Registrarse
              </button>
            </SignUpButton>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="glass-morphism card-hover p-10 rounded-3xl border border-white/30 group">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 text-shadow-soft">Marca tu disponibilidad</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg">
              Selecciona fácilmente los domingos del mes en los que puedes jugar y mantén actualizada tu disponibilidad
            </p>
          </div>
          
          <div className="glass-morphism card-hover p-10 rounded-3xl border border-white/30 group">
            <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 text-shadow-soft">Organiza equipos</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg">
              Una vez confirmados 10 jugadores, el sistema organiza automáticamente los equipos de manera equilibrada
            </p>
          </div>
          
          <div className="glass-morphism card-hover p-10 rounded-3xl border border-white/30 group">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-400 to-violet-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 text-shadow-soft">Historial de partidos</h3>
            <p className="text-slate-600 leading-relaxed font-medium text-lg">
              Registra resultados y analiza estadísticas para ver qué tan equilibrados estuvieron los equipos
            </p>
          </div>
        </div>

        <div className="mt-24 text-center">
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-12 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-sky-500/10"></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-white mb-6 text-shadow-strong">¿Listo para empezar?</h3>
              <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-xl font-medium leading-relaxed">
                Únete a la comunidad y disfruta de partidos organizados cada domingo
              </p>
              <SignUpButton mode="modal">
                <button className="button-glow nested-border bg-white text-slate-900 px-12 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all duration-300 shadow-2xl hover:shadow-white/25 transform hover:-translate-y-1 hover:scale-105 text-lg tracking-wide">
                  ⚽ Crear Cuenta Gratis
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
