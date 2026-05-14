'use client';

/**
 * useAuth — Firebase Auth state hook.
 * Returns the current user (or null) and a loading boolean.
 * Sets/clears the "fb_session" cookie used by middleware.
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        document.cookie = 'fb_session=1; path=/; max-age=86400; SameSite=Lax';
      } else {
        document.cookie = 'fb_session=; path=/; max-age=0';
        document.cookie = 'ob_complete=; path=/; max-age=0';
      }
    });
    return unsub;
  }, []);

  return { user, loading };
}
