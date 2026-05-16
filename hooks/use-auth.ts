'use client';

/**
 * useAuth — Firebase Auth state hook.
 * Returns the current user (or null) and a loading boolean.
 * Sets/clears the "fb_session" cookie used by middleware.
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearSessionCookies, setSessionCookies } from '@/lib/client-session';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setSessionCookies(u.uid);
      } else {
        clearSessionCookies();
      }
    });
    return unsub;
  }, []);

  return { user, loading };
}
