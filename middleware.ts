import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// DEPRECATED: Fulbo Jubilados se mudó a Cancha (https://play.cancha.app).
// Nota: con el directorio `src/`, Next.js usa `src/middleware.ts`; este archivo
// se mantiene en sincronía solo por consistencia.
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname !== '/deprecated') {
    return NextResponse.redirect(new URL('/deprecated', req.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
