import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// DEPRECATED: Fulbo Jubilados se mudó a Cancha (https://play.cancha.app).
// Esta app ya no se usa: todas las rutas redirigen al aviso de deprecación.
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname !== '/deprecated') {
    return NextResponse.redirect(new URL('/deprecated', req.url));
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};