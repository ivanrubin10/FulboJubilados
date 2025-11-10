import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard/games(.*)',
  '/dashboard/profile(.*)',
  '/dashboard/component-test(.*)',
  '/dashboard$',
  '/setup-nickname',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect dashboard and setup-nickname routes
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    
    // If user is not authenticated, redirect to home page
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};