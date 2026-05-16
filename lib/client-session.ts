'use client';

import { auth } from "@/lib/firebase";

export async function getIdTokenOrThrow(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("Not authenticated.");
  }

  return token;
}

export async function getAuthorizedHeaders(
  headers: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getIdTokenOrThrow();
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export function setSessionCookies(uid: string) {
  document.cookie = "fb_session=1; path=/; max-age=86400; SameSite=Lax";
  document.cookie = `fb_uid=${uid}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearSessionCookies() {
  document.cookie = "fb_session=; path=/; max-age=0";
  document.cookie = "fb_uid=; path=/; max-age=0";
  document.cookie = "ob_complete=; path=/; max-age=0";
}
