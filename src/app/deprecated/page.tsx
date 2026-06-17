import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fulbo Jubilados se mudó a Cancha",
  description: "Esta aplicación está deprecada. Ahora usamos Cancha.",
};

const CANCHA_URL = "https://play.cancha.app";

export default function DeprecatedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <main className="max-w-xl w-full text-center">
        <div className="w-24 h-24 flex items-center justify-center mb-8 mx-auto">
          <span className="text-5xl drop-shadow-lg">🏟️</span>
        </div>

        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 px-4 py-1.5 rounded-full mb-6 text-sm font-semibold">
          <span>⚠️</span>
          <span>Aplicación deprecada</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
          Fulbo Jubilados se mudó a Cancha
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Esta versión ya no está disponible. Ahora organizamos los partidos en{" "}
          <strong className="text-foreground">Cancha</strong>, con todo lo de
          siempre y más: múltiples grupos, deportes y una mejor experiencia móvil.
        </p>

        <a
          href={CANCHA_URL}
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          Ir a Cancha ⚽
        </a>

        <p className="text-sm text-muted-foreground mt-6">
          {CANCHA_URL.replace("https://", "")}
        </p>
      </main>
    </div>
  );
}
