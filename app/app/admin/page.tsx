'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';

interface PendingUserRow {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  cohort: string;
  linkedinUrl: string;
  certificateUrl?: string;
  submittedAt?: { toDate?: () => Date } | string | null;
  status: string;
}

function formatRelativeTime(value?: PendingUserRow['submittedAt']) {
  if (!value) return 'Unknown';

  const date =
    typeof value === 'string'
      ? new Date(value)
      : typeof value?.toDate === 'function'
      ? value.toDate()
      : null;

  if (!date || Number.isNaN(date.getTime())) return 'Unknown';

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionUid, setActionUid] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUserRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [usersCount, setUsersCount] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/');
        return;
      }

      setUser(currentUser);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const isAdmin = Boolean(userDoc.data()?.isAdmin);
      setAuthorized(isAdmin);
      setPageLoading(false);

      if (!isAdmin) {
        return;
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;

    const loadPendingUsers = async () => {
      setPendingLoading(true);
      try {
        // v2: add cursor pagination
        const pendingSnapshot = await getDocs(query(collection(db, 'pending_users'), limit(50)));
        if (cancelled) return;

        const rows = pendingSnapshot.docs
          .map((pendingDoc) => {
            const data = pendingDoc.data();
            return {
              uid: pendingDoc.id,
              fullName: data.fullName ?? '',
              email: data.email ?? '',
              phone: data.phone ?? '',
              cohort: data.cohort ?? '',
              linkedinUrl: data.linkedinUrl ?? '',
              certificateUrl: data.certificateUrl ?? '',
              submittedAt: data.submittedAt ?? null,
              status: data.status ?? 'pending',
            } as PendingUserRow;
          })
          .filter((row) => row.status === 'pending')
          .sort((left, right) => {
            const leftDate = typeof left.submittedAt === 'string' ? new Date(left.submittedAt).getTime() : left.submittedAt?.toDate?.().getTime() ?? 0;
            const rightDate = typeof right.submittedAt === 'string' ? new Date(right.submittedAt).getTime() : right.submittedAt?.toDate?.().getTime() ?? 0;
            return rightDate - leftDate;
          });

        setPendingUsers(rows);
      } catch (error) {
        console.error('[admin] pending load failed:', error);
      } finally {
        if (!cancelled) {
          setPendingLoading(false);
        }
      }
    };

    loadPendingUsers();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;

    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        // v2: add cursor pagination
        const snapshot = await getDocs(query(collection(db, 'users'), limit(50)));
        if (!cancelled) {
          setUsersCount(snapshot.size);
        }
      } catch (error) {
        console.error('[admin] users load failed:', error);
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;

    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        // v2: add cursor pagination
        const snapshot = await getDocs(query(collection(db, 'notifications'), limit(500)));
        if (!cancelled) {
          setNotificationsCount(snapshot.size);
        }
      } catch (error) {
        console.error('[admin] notifications load failed:', error);
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;

    let cancelled = false;

    const loadConnections = async () => {
      setConnectionsLoading(true);
      try {
        // v2: add cursor pagination
        const snapshot = await getDocs(query(collection(db, 'connections'), limit(1000)));
        if (!cancelled) {
          setConnectionsCount(snapshot.size);
        }
      } catch (error) {
        console.error('[admin] connections load failed:', error);
      } finally {
        if (!cancelled) {
          setConnectionsLoading(false);
        }
      }
    };

    loadConnections();

    return () => {
      cancelled = true;
    };
  }, [authorized]);

  const pendingCountLabel = useMemo(() => {
    if (pendingUsers.length === 1) return '1 pending approval';
    return `${pendingUsers.length} pending approvals`;
  }, [pendingUsers.length]);

  const handleDecision = async (targetUid: string, action: 'approve' | 'reject') => {
    if (!user) return;

    setActionUid(targetUid);
    setActionError('');
    setActionNotice('');

    try {
      const headers = await getAuthorizedHeaders({ 'Content-Type': 'application/json' });
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid: targetUid, action }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to ${action}`);
      }

      setPendingUsers((current) => current.filter((row) => row.uid !== targetUid));
      if (Array.isArray(payload?.warnings) && payload.warnings.length > 0) {
        setActionNotice(payload.warnings.join(' '));
      }
    } catch (error) {
      console.error(`[admin] ${action} failed:`, error);
      setActionError(error instanceof Error ? error.message : `Failed to ${action}.`);
    } finally {
      setActionUid(null);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-6">
        <Loader2 className="w-5 h-5 animate-spin text-brand-neon" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-display text-brand-white mb-3">Access Denied</h1>
          <p className="text-brand-muted text-sm">Your account is not marked as an admin.</p>
          <button onClick={() => router.push('/app/feed')} className="mt-6 text-brand-neon font-mono text-sm hover:underline">
            ← Back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon" />
              <div className="w-1 h-1 bg-brand-neon rounded-full" />
            </div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">Admin Panel</span>
          </div>
          <button onClick={() => router.push('/app/feed')} className="text-[11px] font-mono text-brand-muted hover:text-brand-white transition-colors">
            ← Feed
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricBadge label={usersLoading ? 'Loading users...' : `${usersCount} users`} />
          <MetricBadge label={notificationsLoading ? 'Loading notifications...' : `${notificationsCount} notifications`} />
          <MetricBadge label={connectionsLoading ? 'Loading connections...' : `${connectionsCount} connections`} />
          <MetricBadge label={pendingLoading ? 'Loading approvals...' : `${pendingUsers.length} pending`} />
        </section>

        <section>
          <h1 className="text-3xl font-display font-medium text-brand-white mb-2">Pending Approvals</h1>
          <p className="text-brand-muted text-sm mb-8">{pendingCountLabel}</p>

          {actionError ? (
            <div className="mb-5 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {actionError}
            </div>
          ) : null}

          {actionNotice ? (
            <div className="mb-5 border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              {actionNotice}
            </div>
          ) : null}

          {pendingLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center text-brand-muted">
              <Loader2 className="w-5 h-5 animate-spin text-brand-neon" />
              <span className="text-sm font-mono">Loading approvals…</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="border border-brand-border p-6 text-brand-muted text-sm">
              No pending approvals.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border border-brand-border bg-black/30">
                <table className="min-w-full divide-y divide-brand-border">
                  <thead>
                    <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Contact</th>
                      <th className="px-5 py-4">LinkedIn</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {pendingUsers.map((pendingUser) => (
                      <tr key={pendingUser.uid}>
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium text-brand-white">{pendingUser.fullName}</div>
                          <div className="mt-1 text-[11px] font-mono text-brand-muted">{pendingUser.cohort}</div>
                          <div className="mt-1 text-[11px] font-mono text-brand-muted">{formatRelativeTime(pendingUser.submittedAt)}</div>
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-brand-white/80">
                          <div>{pendingUser.email}</div>
                          <div>{pendingUser.phone}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <a
                            href={toExternalUrl(pendingUser.linkedinUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-neon hover:underline"
                          >
                            LinkedIn ↗
                          </a>
                          <div className="mt-2 text-[11px] font-mono text-brand-muted">
                            {pendingUser.certificateUrl ? 'Certificate uploaded' : 'No certificate uploaded'}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'approve')}
                              disabled={actionUid === pendingUser.uid}
                              className="bg-green-500 text-black font-semibold px-4 py-2 hover:bg-green-400 transition-colors disabled:opacity-60"
                            >
                              {actionUid === pendingUser.uid ? 'Working…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'reject')}
                              disabled={actionUid === pendingUser.uid}
                              className="bg-red-500 text-white font-semibold px-4 py-2 hover:bg-red-400 transition-colors disabled:opacity-60"
                            >
                              {actionUid === pendingUser.uid ? 'Working…' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.uid} className="border border-brand-border bg-black/30 p-5">
                    <div className="mb-4">
                      <h2 className="text-lg font-medium text-brand-white">{pendingUser.fullName}</h2>
                      <p className="text-[11px] font-mono text-brand-muted">
                        {pendingUser.cohort} · {formatRelativeTime(pendingUser.submittedAt)}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-brand-white/80">
                      <p>{pendingUser.email}</p>
                      <p>{pendingUser.phone}</p>
                      <a
                        href={toExternalUrl(pendingUser.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-brand-neon hover:underline"
                      >
                        LinkedIn ↗
                      </a>
                      <p className="text-[11px] font-mono text-brand-muted">
                        {pendingUser.certificateUrl ? 'Certificate uploaded' : 'No certificate uploaded'}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'approve')}
                        disabled={actionUid === pendingUser.uid}
                        className="w-full bg-green-500 text-black font-semibold px-4 py-3 hover:bg-green-400 transition-colors disabled:opacity-60"
                      >
                        {actionUid === pendingUser.uid ? 'Working…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'reject')}
                        disabled={actionUid === pendingUser.uid}
                        className="w-full bg-red-500 text-white font-semibold px-4 py-3 hover:bg-red-400 transition-colors disabled:opacity-60"
                      >
                        {actionUid === pendingUser.uid ? 'Working…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricBadge({ label }: { label: string }) {
  return (
    <div className="border border-brand-border bg-black/30 px-4 py-3 text-sm text-brand-muted">
      {label}
    </div>
  );
}

function toExternalUrl(value: string): string {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
