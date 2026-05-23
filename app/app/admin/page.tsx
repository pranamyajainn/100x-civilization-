'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { getAuthorizedHeaders } from '@/lib/client-session';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

/* ─── Types ─────────────────────────────────────── */

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

interface ApprovedUser {
  cohort: string;
  currentRole: string;
  skillTags: string[];
  certificateUrl: string;
  approvedAt?: { toDate?: () => Date } | null;
}

/* ─── Helpers ───────────────────────────────────── */

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

function toExternalUrl(value: string): string {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/* ─── Chart colors ──────────────────────────────── */
const COLORS = {
  primary: '#FF4F00',
  secondary: '#FF8C42',
  tertiary: '#FFB347',
  accent1: '#6EE7B7',
  accent2: '#93C5FD',
  accent3: '#C4B5FD',
  accent4: '#FCA5A5',
  grid: '#1a1a1a',
  tooltip_bg: '#050505',
  tooltip_border: '#2a2a2a',
};

const COHORT_COLORS = [
  '#FF4F00', '#FF8C42', '#FFB347',
  '#6EE7B7', '#93C5FD', '#C4B5FD',
  '#FCA5A5',
];

/* ─── Animated counter ──────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span>{display}</span>;
}

/* ─── Main page ─────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionUid, setActionUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  /* counts */
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  /* pending table */
  const [pendingUsers, setPendingUsers] = useState<PendingUserRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  /* chart data */
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [pageLoadTime] = useState(() => Date.now());

  /* ─── Auth ───────────────────────────────────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push('/'); return; }
      setUser(currentUser);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const isAdmin = Boolean(userDoc.data()?.isAdmin);
      setAuthorized(isAdmin);
      setPageLoading(false);
    });
    return unsubscribe;
  }, [router]);

  /* ─── Real-time listeners ────────────────────── */
  useEffect(() => {
    if (!authorized) return;

    /* exact counts via getCountFromServer —
       zero document reads, no data exposure */
    const fetchCounts = async () => {
      try {
        const [nc, cc] = await Promise.all([
          getCountFromServer(collection(db, 'notifications')),
          getCountFromServer(collection(db, 'connections')),
        ]);
        setNotificationsCount(nc.data().count);
        setConnectionsCount(cc.data().count);
      } catch (e) {
        console.error('[admin] count error', e);
      }
    };
    fetchCounts();

    /* pending_users — real-time */
    const pendingUnsub = onSnapshot(
      query(collection(db, 'pending_users')),
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              uid: d.id,
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
          .filter((r) => r.status === 'pending')
          .sort((a, b) => {
            const ad = typeof a.submittedAt === 'string'
              ? new Date(a.submittedAt).getTime()
              : a.submittedAt?.toDate?.().getTime() ?? 0;
            const bd = typeof b.submittedAt === 'string'
              ? new Date(b.submittedAt).getTime()
              : b.submittedAt?.toDate?.().getTime() ?? 0;
            return bd - ad;
          });
        setPendingUsers(rows);
        setPendingCount(rows.length);
        setPendingLoading(false);
        /* refresh exact user count after approvals */
        fetchCounts();
      },
      (e) => { console.error('[admin] pending snap error', e); setPendingLoading(false); }
    );

    /* users — read for charts only */
    const usersUnsub = onSnapshot(
      query(collection(db, 'users'), orderBy('approvedAt', 'desc'), limit(500)),
      (snap) => {
        const rows: ApprovedUser[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            cohort: data.cohort ?? '',
            currentRole: data.currentRole ?? '',
            skillTags: Array.isArray(data.skillTags) ? data.skillTags : [],
            certificateUrl: data.certificateUrl ?? '',
            approvedAt: data.approvedAt ?? null,
          };
        });
        setApprovedUsers(rows);
        setChartsLoading(false);
      },
      (e) => { console.error('[admin] users snap error', e); setChartsLoading(false); }
    );

    return () => {
      pendingUnsub();
      usersUnsub();
    };
  }, [authorized]);

  const usersCount = approvedUsers.length;

  /* ─── Chart data derivations ─────────────────── */
  const cohortData = useMemo(() => {
    const map: Record<string, number> = {};
    approvedUsers.forEach((u) => {
      const key = u.cohort ? `C${u.cohort}` : 'Unknown';
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cohort, count]) => ({ cohort, count }));
  }, [approvedUsers]);

  const skillData = useMemo(() => {
    const map: Record<string, number> = {};
    approvedUsers.forEach((u) =>
      u.skillTags.forEach((tag) => {
        const label = tag.replace(/-/g, ' ');
        map[label] = (map[label] ?? 0) + 1;
      })
    );
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
  }, [approvedUsers]);

  const roleData = useMemo(() => {
    const map: Record<string, number> = {};
    approvedUsers.forEach((u) => {
      if (u.currentRole) {
        const normalized = u.currentRole
          .trim()
          .replace(/\bai\b/gi, 'AI')
          .replace(/\bml\b/gi, 'ML')
          .replace(/\bllm\b/gi, 'LLM');
        map[normalized] = (map[normalized] ?? 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, count]) => ({ role, count }));
  }, [approvedUsers]);

  const growthData = useMemo(() => {
    const map: Record<string, number> = {};
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    approvedUsers.forEach((u) => {
      const date = u.approvedAt?.toDate?.();
      if (!date) return;
      if (pageLoadTime - date.getTime() > thirtyDays) return;
      const key = date.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short',
      });
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, count }));
  }, [approvedUsers, pageLoadTime]);

  const pendingCountLabel = useMemo(() =>
    pendingUsers.length === 1
      ? '1 pending approval'
      : `${pendingUsers.length} pending approvals`,
    [pendingUsers.length]
  );

  /* ─── Action handler — UNCHANGED ────────────── */
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
      if (!response.ok) throw new Error(payload?.error ?? `Failed to ${action}`);
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

  /* ─── Loading / access states ────────────────── */
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
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
          <button onClick={() => router.push('/app/feed')}
            className="mt-6 text-brand-neon font-mono text-sm hover:underline">
            ← Back to feed
          </button>
        </div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────── */
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      {/* header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-brand-neon animate-ping opacity-40" />
              <div className="w-1.5 h-1.5 bg-brand-neon rounded-full" />
            </div>
            <span className="text-[11px] font-mono tracking-[0.2em] text-brand-neon uppercase">
              Mission Control
            </span>
            <span className="text-[10px] font-mono text-brand-muted ml-2 hidden sm:block">
              LIVE
            </span>
          </div>
          <button onClick={() => router.push('/app/feed')}
            className="text-[11px] font-mono text-brand-muted hover:text-brand-white transition-colors">
            ← Feed
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* ── Section 1: Live counters ── */}
        <section>
          <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-4">
            Live Network Stats
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Alumni', value: usersCount, accent: true },
              { label: 'Pending', value: pendingCount, accent: false },
              { label: 'Connections', value: connectionsCount, accent: false },
              { label: 'Notifications', value: notificationsCount, accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label}
                className={`relative overflow-hidden border ${accent ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent' : 'border-white/5 bg-white/[0.02]'} p-5 flex flex-col gap-2`}>
                <span className={`text-4xl font-mono font-bold tracking-tight ${accent ? 'text-orange-400' : 'text-white'}`}>
                  <AnimatedNumber value={value} />
                </span>
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                  {label}
                </span>
                {accent && (
                  <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 2: Growth + Cohort ── */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="border border-brand-border bg-black/40 p-6">
            <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-6">
              Approvals — Last 30 Days
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-brand-neon" />
              </div>
            ) : growthData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-brand-muted text-sm font-mono">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: COLORS.tooltip_bg, border: `1px solid ${COLORS.tooltip_border}`, borderRadius: 0 }}
                    labelStyle={{ color: '#aaa', fontSize: 11 }}
                    itemStyle={{ color: COLORS.primary }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, r: 3 }}
                    activeDot={{ r: 5, fill: COLORS.secondary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="border border-brand-border bg-black/40 p-6">
            <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-6">
              Alumni by Cohort
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-brand-neon" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cohortData} barSize={28}>
                  <XAxis dataKey="cohort" tick={{ fill: '#555', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: COLORS.tooltip_bg, border: `1px solid ${COLORS.tooltip_border}`, borderRadius: 0 }}
                    labelStyle={{ color: '#aaa', fontSize: 11 }}
                    itemStyle={{ color: COLORS.primary }}
                    cursor={{ fill: 'rgba(255,79,0,0.05)' }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {cohortData.map((_, i) => (
                      <Cell key={i} fill={COHORT_COLORS[i % COHORT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Section 3: Skills + Certificate ── */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-brand-border bg-black/40 p-6">
            <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-6">
              Top Skills in the Network
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-brand-neon" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={skillData} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={130}
                    tick={{ fill: '#888', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ background: COLORS.tooltip_bg, border: `1px solid ${COLORS.tooltip_border}`, borderRadius: 0 }}
                    itemStyle={{ color: COLORS.primary }}
                    cursor={{ fill: 'rgba(255,79,0,0.05)' }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="border border-brand-border bg-black/40 p-6 flex flex-col">
            <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-6">
              Cohort Breakdown
            </p>
            {chartsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-brand-neon" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div>
                  <div className="text-5xl font-mono font-bold text-white tracking-tight">
                    {usersCount}
                  </div>
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1">
                    Total Alumni
                  </div>
                </div>
                <div className="space-y-3">
                  {[...cohortData]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(({ cohort, count }, i) => (
                      <div key={cohort} className="flex items-center justify-between">
                        <span className="text-sm font-mono text-white/60">{cohort}</span>
                        <span
                          className="text-sm font-mono font-bold"
                          style={{ color: COHORT_COLORS[i % COHORT_COLORS.length] }}
                        >
                          {count} members
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 4: Roles ── */}
        <section className="border border-brand-border bg-black/40 p-6">
          <p className="text-[10px] font-mono tracking-[0.2em] text-brand-muted uppercase mb-6">
            Top Roles in the Network
          </p>
          {chartsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-brand-neon" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleData} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="role"
                  width={160}
                  tick={{ fill: '#888', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: COLORS.tooltip_bg, border: `1px solid ${COLORS.tooltip_border}`, borderRadius: 0 }}
                  itemStyle={{ color: COLORS.secondary }}
                  cursor={{ fill: 'rgba(255,79,0,0.05)' }}
                />
                <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ── Section 5: Pending approvals ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-medium text-brand-white">
                Pending Approvals
              </h2>
              <p className="text-brand-muted text-sm mt-1 font-mono">{pendingCountLabel}</p>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-neon rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-brand-neon uppercase tracking-wider">
                  Live
                </span>
              </div>
            )}
          </div>

          {actionError && (
            <div className="mb-5 border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              {actionError}
            </div>
          )}
          {actionNotice && (
            <div className="mb-5 border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              {actionNotice}
            </div>
          )}

          {pendingLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center text-brand-muted">
              <Loader2 className="w-5 h-5 animate-spin text-brand-neon" />
              <span className="text-sm font-mono">Loading approvals…</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="border border-brand-border p-8 text-center">
              <p className="text-brand-muted text-sm font-mono">
                No pending approvals — queue is clear.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto border border-brand-border">
                <table className="min-w-full divide-y divide-brand-border">
                  <thead className="bg-black/60">
                    <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-brand-muted">
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Contact</th>
                      <th className="px-5 py-4">LinkedIn</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {pendingUsers.map((pendingUser) => (
                      <tr key={pendingUser.uid}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium text-brand-white">
                            {pendingUser.fullName}
                          </div>
                          <div className="mt-1 text-[11px] font-mono text-brand-muted">
                            Cohort {pendingUser.cohort}
                          </div>
                          <div className="mt-1 text-[11px] font-mono text-brand-muted">
                            {formatRelativeTime(pendingUser.submittedAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-sm text-brand-white/80">
                          <div>{pendingUser.email}</div>
                          <div className="mt-1 text-brand-muted">{pendingUser.phone}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <a
                            href={toExternalUrl(pendingUser.linkedinUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-neon hover:underline text-sm"
                          >
                            LinkedIn ↗
                          </a>
                          <div className="mt-2 text-[11px] font-mono text-brand-muted">
                            {pendingUser.certificateUrl
                              ? '✓ Certificate uploaded'
                              : 'No certificate'}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'approve')}
                              disabled={actionUid === pendingUser.uid}
                              className="bg-green-500 text-black font-bold text-sm px-4 py-2 hover:bg-green-400 transition-colors disabled:opacity-50"
                            >
                              {actionUid === pendingUser.uid ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'reject')}
                              disabled={actionUid === pendingUser.uid}
                              className="bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-sm px-4 py-2 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              {actionUid === pendingUser.uid ? '…' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.uid}
                    className="border border-brand-border bg-black/40 p-5">
                    <div className="mb-3">
                      <h3 className="text-base font-medium text-brand-white">
                        {pendingUser.fullName}
                      </h3>
                      <p className="text-[11px] font-mono text-brand-muted mt-0.5">
                        Cohort {pendingUser.cohort} · {formatRelativeTime(pendingUser.submittedAt)}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm text-brand-white/80 mb-4">
                      <p>{pendingUser.email}</p>
                      <p className="text-brand-muted">{pendingUser.phone}</p>
                      <a
                        href={toExternalUrl(pendingUser.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-brand-neon hover:underline"
                      >
                        LinkedIn ↗
                      </a>
                      <p className="text-[11px] font-mono text-brand-muted">
                        {pendingUser.certificateUrl ? '✓ Certificate uploaded' : 'No certificate'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'approve')}
                        disabled={actionUid === pendingUser.uid}
                        className="flex-1 bg-green-500 text-black font-bold py-2.5 hover:bg-green-400 transition-colors disabled:opacity-50"
                      >
                        {actionUid === pendingUser.uid ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'reject')}
                        disabled={actionUid === pendingUser.uid}
                        className="flex-1 bg-red-500/20 text-red-400 border border-red-500/40 font-bold py-2.5 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {actionUid === pendingUser.uid ? '…' : 'Reject'}
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
