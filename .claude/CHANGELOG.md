# Changelog

## [2026-06-17 00:00] — Deprecación: migración a Cancha
- **What:** La app queda deprecada. Middleware redirige TODAS las rutas a una nueva pantalla `/deprecated` que avisa la migración y enlaza a `https://play.cancha.app`. Se eliminó la dependencia de Clerk en el middleware (ya no se necesita auth).
- **Why:** Fulbo Jubilados se reemplaza por Cancha; pedido del usuario de bloquear el uso de la app vieja.
- **Files:** `src/app/deprecated/page.tsx` (nuevo), `src/middleware.ts`, `middleware.ts` (raíz, sincronizado)
- **Tests:** N/A — verificado manualmente vía preview (`/dashboard/games` → 307 → `/deprecated` 200; link → play.cancha.app)
