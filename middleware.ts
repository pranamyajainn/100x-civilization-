/**
 * Next.js Middleware — Auth + Onboarding + Consent Guard
 *
 * RULES:
 * 1. Public routes (/, /invite/*, /api/*, /_next/*, /fonts/*, /invite) always pass.
 * 2. All /app/* routes require fb_session=1 cookie (set after Google sign-in).
 * 3. All /app/* routes except /app/onboarding require ob_complete=1 cookie
 *    (set after onboarding form submitted with consent checkbox ticked).
 * 4. Attempting to re-enter onboarding when already complete → redirect to feed.
 *
 * DECISION: Cookie-based signals only. True security is Firestore rules.
 * Middleware is a UX guard, not a cryptographic auth layer.
 * consent_given is baked into ob_complete — if onboarding completed, consent was given
 * (the submit button is disabled without the checkbox ticked).
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/_next/",
  "/fonts/",
  "/api/",
  "/invite",   // covers /invite/[token] AND /invite page
  "/favicon",
  "/og-image",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes unconditionally
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Gate all /app/* routes
  if (pathname.startsWith("/app")) {
    const hasSession = req.cookies.get("fb_session")?.value === "1";

    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const onboardingComplete = req.cookies.get("ob_complete")?.value === "1";

    // Incomplete onboarding → force to onboarding page
    if (!onboardingComplete && pathname !== "/app/onboarding") {
      const url = req.nextUrl.clone();
      url.pathname = "/app/onboarding";
      return NextResponse.redirect(url);
    }

    // Already onboarded trying to revisit onboarding → redirect to feed
    if (onboardingComplete && pathname === "/app/onboarding") {
      const url = req.nextUrl.clone();
      url.pathname = "/app/feed";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
