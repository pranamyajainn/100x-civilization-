import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const PUBLIC_PREFIXES = [
  "/_next/",
  "/fonts/",
  "/api/",
  "/invite",
  "/favicon",
  "/og-image",
];

async function getAccessState(uid: string) {
  const [userDoc, pendingDoc] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("pending_users").doc(uid).get(),
  ]);

  const userData = userDoc.data();
  const pendingData = pendingDoc.data();

  return {
    hasUser: userDoc.exists,
    hasPending: pendingDoc.exists,
    isAdmin: Boolean(userData?.isAdmin),
    userStatus: typeof userData?.status === "string" ? userData.status : null,
    pendingStatus:
      typeof pendingData?.status === "string" ? pendingData.status : null,
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    // NOTE: Cookie-based routing is for UX only.
    // All sensitive data access is protected by Firebase
    // ID token verification in API routes.
    // A user who spoofs fb_session will see empty pages
    // since all data fetches require valid auth tokens.
    const hasSession = req.cookies.get("fb_session")?.value === "1";
    const sessionUid = req.cookies.get("fb_uid")?.value;

    if (!hasSession || !sessionUid) {
      const url = req.nextUrl.clone();
      url.pathname = "/invite";
      return NextResponse.redirect(url);
    }

    const access = await getAccessState(sessionUid);
    const approved = access.userStatus === "approved";
    const rejected = access.userStatus === "rejected";
    const pending =
      access.userStatus === "pending" ||
      (!access.hasUser && access.hasPending) ||
      access.pendingStatus === "pending" ||
      access.pendingStatus === "rejected";

    if (pathname.startsWith("/app/admin")) {
      if (access.isAdmin) {
        return NextResponse.next();
      }

      const url = req.nextUrl.clone();
      url.pathname = approved ? "/app/feed" : pending ? "/app/pending" : "/app/onboarding";
      return NextResponse.redirect(url);
    }

    if (rejected) {
      if (pathname !== "/app/rejected") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/rejected";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (approved) {
      if (pathname === "/app/onboarding" || pathname === "/app/pending") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/feed";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (!access.hasUser && !access.hasPending) {
      if (pathname !== "/app/onboarding") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/onboarding";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (pending) {
      if (pathname !== "/app/pending") {
        const url = req.nextUrl.clone();
        url.pathname = "/app/pending";
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    }

    if (pathname !== "/app/onboarding") {
      const url = req.nextUrl.clone();
      url.pathname = "/app/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
