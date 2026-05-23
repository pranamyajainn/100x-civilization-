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
  AreaChart,
  Area,
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

/* ─── Design system ─────────────────���────────────── */

const COLORS = {
  bg: '#08090A',
  surface: '#0E1011',
  surfaceHover: '#141719',
  border: '#1C2024',
  borderBright: '#2A3036',
  text: '#E6E8EA',
  textDim: '#8B9398',
  textFaint: '#4A5258',
  accent: '#FF6B35',
  accentBright: '#FF8C42',
  cyan: '#22D3EE',
  violet: '#A78BFA',
  emerald: '#34D399',
  amber: '#FBBF24',
  grid: '#15181B',
  tooltipBg: '#0A0B0C',
  tooltipBorder: '#2A3036',
};

const COHORT_COLORS = [
  '#FF6B35', '#22D3EE', '#A78BFA',
  '#34D399', '#FBBF24', '#F472B6', '#60A5FA',
];

const TOOLTIP_PROPS = {
  contentStyle: {
    background: COLORS.tooltipBg,
    border: `1px solid ${COLORS.tooltipBorder}`,
    borderRadius: 0,
    fontFamily: 'monospace',
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  labelStyle: { color: COLORS.textDim },
  itemStyle: { color: COLORS.text },
  cursor: { fill: 'rgba(255,107,53,0.06)' },
};

const CARD_STYLE: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
};

/* ─── Animated counter ─────────────────���────────── */
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
        /* refresh exact counts after approvals */
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

  const totalSkillsCount = useMemo(() => {
    const set = new Set<string>();
    approvedUsers.forEach((u) => u.skillTags.forEach((t) => set.add(t)));
    return set.size;
  }, [approvedUsers]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.accent }} />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: COLORS.bg }}>
        <div className="text-center">
          <h1 className="text-2xl font-display mb-3" style={{ color: COLORS.text }}>Access Denied</h1>
          <p className="text-sm" style={{ color: COLORS.textDim }}>Your account is not marked as an admin.</p>
          <button onClick={() => router.push('/app/feed')}
            className="mt-6 font-mono text-sm hover:underline"
            style={{ color: COLORS.accent }}>
            ← Back to feed
          </button>
        </div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{ background: 'rgba(8,9,10,0.96)', borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-3 h-3 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border animate-ping opacity-40"
                style={{ borderColor: COLORS.accent }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.accent }} />
            </div>
            <span
              className="text-[11px] font-mono tracking-[0.3em] uppercase"
              style={{ color: COLORS.accent }}>
              Mission Control
            </span>
            <span className="text-[10px] font-mono ml-2 hidden sm:block" style={{ color: COLORS.textFaint }}>
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono hidden sm:block" style={{ color: COLORS.textDim }}>
              {usersCount} ALUMNI · {pendingCount} PENDING
            </span>
            <button
              onClick={() => router.push('/app/feed')}
              className="text-[11px] font-mono transition-colors"
              style={{ color: COLORS.textDim }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = COLORS.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = COLORS.textDim; }}>
              ← Feed
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-8">

        {/* ── Section 1: Live counters ── */}
        <section>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-4" style={{ color: COLORS.textFaint }}>
            Live Network Stats
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Alumni', value: usersCount, accent: true },
              { label: 'Pending', value: pendingCount, accent: false },
              { label: 'Connections', value: connectionsCount, accent: false },
              { label: 'Notifications', value: notificationsCount, accent: false },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="relative overflow-hidden flex flex-col gap-2 p-6 transition-colors"
                style={CARD_STYLE}>
                {accent && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: COLORS.accent }} />
                )}
                <span
                  className="text-5xl font-mono font-bold tracking-tight"
                  style={{ color: accent ? COLORS.accent : COLORS.text }}>
                  <AnimatedNumber value={value} />
                </span>
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.25em]"
                  style={{ color: COLORS.textFaint }}>
                  {label}
                </span>
                {accent && (
                  <div
                    className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: COLORS.accent }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Stat strip ── */}
        <section className="flex items-stretch" style={CARD_STYLE}>
          {[
            { label: 'Network Density', value: connectionsCount },
            { label: 'Cohorts Represented', value: cohortData.length },
            { label: 'Distinct Skills', value: totalSkillsCount },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className="flex-1 px-6 py-5 flex flex-col gap-1"
              style={i > 0 ? { borderLeft: `1px solid ${COLORS.border}` } : {}}>
              <span className="text-3xl font-mono font-bold" style={{ color: COLORS.text }}>
                {chartsLoading ? <span style={{ color: COLORS.textFaint }}>—</span> : value}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: COLORS.textFaint }}>
                {label}
              </span>
            </div>
          ))}
        </section>

        {/* ── Section 2: Growth + Cohort ── */}
        <section className="grid lg:grid-cols-2 gap-4">

          {/* Growth — AreaChart */}
          <div className="p-6" style={CARD_STYLE}>
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-6" style={{ color: COLORS.textFaint }}>
              Approvals — Last 30 Days
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />
              </div>
            ) : growthData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm font-mono" style={{ color: COLORS.textFaint }}>
                No approvals in the last 30 days
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="accentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={COLORS.grid}
                    vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: COLORS.textFaint, fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: COLORS.border }}
                    tickLine={{ stroke: COLORS.border }} />
                  <YAxis
                    tick={{ fill: COLORS.textFaint, fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: COLORS.border }}
                    tickLine={{ stroke: COLORS.border }}
                    allowDecimals={false} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.accent}
                    strokeWidth={2.5}
                    fill="url(#accentFill)"
                    dot={false}
                    activeDot={{ r: 5, fill: COLORS.accentBright, stroke: 'none' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cohort BarChart */}
          <div className="p-6" style={CARD_STYLE}>
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-6" style={{ color: COLORS.textFaint }}>
              Alumni by Cohort
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cohortData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="cohort"
                    tick={{ fill: COLORS.textFaint, fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false} />
                  <YAxis
                    tick={{ fill: COLORS.textFaint, fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {cohortData.map((_, i) => (
                      <Cell key={i} fill={COHORT_COLORS[i % COHORT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Section 3: Skills + Cohort Breakdown ── */}
        <section className="grid lg:grid-cols-3 gap-4">

          {/* Skills horizontal BarChart */}
          <div className="lg:col-span-2 p-6" style={CARD_STYLE}>
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-6" style={{ color: COLORS.textFaint }}>
              Top Skills in the Network
            </p>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={skillData} layout="vertical" barSize={16}>
                  <defs>
                    <linearGradient id="barAccent" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS.accent} stopOpacity={1} />
                      <stop offset="100%" stopColor={COLORS.accentBright} stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: COLORS.textFaint, fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    width={130}
                    tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="count" fill="url(#barAccent)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cohort Breakdown */}
          <div className="p-6 flex flex-col" style={CARD_STYLE}>
            <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-6" style={{ color: COLORS.textFaint }}>
              Cohort Breakdown
            </p>
            {chartsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div>
                  <div className="text-5xl font-mono font-bold tracking-tight" style={{ color: COLORS.text }}>
                    {usersCount}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.25em] mt-1" style={{ color: COLORS.textFaint }}>
                    Total Alumni
                  </div>
                </div>
                <div className="space-y-3">
                  {[...cohortData]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(({ cohort, count }, i) => (
                      <div key={cohort} className="flex items-center justify-between">
                        <span className="text-sm font-mono" style={{ color: COLORS.textDim }}>{cohort}</span>
                        <span
                          className="text-sm font-mono font-bold"
                          style={{ color: COHORT_COLORS[i % COHORT_COLORS.length] }}>
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
        <section className="p-6" style={CARD_STYLE}>
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-6" style={{ color: COLORS.textFaint }}>
            Top Roles in the Network
          </p>
          {chartsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.accent }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={roleData} layout="vertical" barSize={16}>
                <defs>
                  <linearGradient id="barCyan" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={1} />
                    <stop offset="100%" stopColor="#0E7490" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: COLORS.textFaint, fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="role"
                  width={160}
                  tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count" fill="url(#barCyan)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ── Section 5: Pending approvals ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-medium" style={{ color: COLORS.text }}>
                Pending Approvals
              </h2>
              <p className="text-sm mt-1 font-mono" style={{ color: COLORS.textDim }}>
                {pendingCountLabel}
              </p>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: COLORS.accent }} />
                <span
                  className="text-[10px] font-mono uppercase tracking-wider"
                  style={{ color: COLORS.accent }}>
                  Live
                </span>
              </div>
            )}
          </div>

          {actionError && (
            <div className="mb-5 p-3 text-sm text-red-400" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
              {actionError}
            </div>
          )}
          {actionNotice && (
            <div className="mb-5 p-3 text-sm text-amber-300" style={{ border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)' }}>
              {actionNotice}
            </div>
          )}

          {pendingLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.accent }} />
              <span className="text-sm font-mono" style={{ color: COLORS.textDim }}>Loading approvals…</span>
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-8 text-center" style={CARD_STYLE}>
              <p className="text-sm font-mono" style={{ color: COLORS.textDim }}>
                No pending approvals — queue is clear.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto" style={CARD_STYLE}>
                <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <tr>
                      {['Name', 'Contact', 'LinkedIn', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-4 text-left text-[10px] font-mono uppercase tracking-wider"
                          style={{ color: COLORS.textFaint, borderBottom: `1px solid ${COLORS.border}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((pendingUser) => (
                      <tr
                        key={pendingUser.uid}
                        style={{ borderBottom: `1px solid ${COLORS.border}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = COLORS.surfaceHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium" style={{ color: COLORS.text }}>
                            {pendingUser.fullName}
                          </div>
                          <div className="mt-1 text-[11px] font-mono" style={{ color: COLORS.textFaint }}>
                            Cohort {pendingUser.cohort}
                          </div>
                          <div className="mt-1 text-[11px] font-mono" style={{ color: COLORS.textFaint }}>
                            {formatRelativeTime(pendingUser.submittedAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-sm" style={{ color: COLORS.textDim }}>
                          <div style={{ color: COLORS.text }}>{pendingUser.email}</div>
                          <div className="mt-1">{pendingUser.phone}</div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <a
                            href={toExternalUrl(pendingUser.linkedinUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{ color: COLORS.accent }}>
                            LinkedIn ↗
                          </a>
                          <div className="mt-2 text-[11px] font-mono" style={{ color: COLORS.textFaint }}>
                            {pendingUser.certificateUrl ? '✓ Certificate uploaded' : 'No certificate'}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'approve')}
                              disabled={actionUid === pendingUser.uid}
                              className="bg-green-500 text-black font-bold text-sm px-4 py-2 hover:bg-green-400 transition-colors disabled:opacity-50">
                              {actionUid === pendingUser.uid ? '…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleDecision(pendingUser.uid, 'reject')}
                              disabled={actionUid === pendingUser.uid}
                              className="font-bold text-sm px-4 py-2 transition-colors disabled:opacity-50 hover:bg-red-500/20"
                              style={{ color: '#F87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)' }}>
                              {actionUid === pendingUser.uid ? '…' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.uid} className="p-5" style={CARD_STYLE}>
                    <div className="mb-3">
                      <h3 className="text-base font-medium" style={{ color: COLORS.text }}>
                        {pendingUser.fullName}
                      </h3>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: COLORS.textFaint }}>
                        Cohort {pendingUser.cohort} · {formatRelativeTime(pendingUser.submittedAt)}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm mb-4">
                      <p style={{ color: COLORS.text }}>{pendingUser.email}</p>
                      <p style={{ color: COLORS.textDim }}>{pendingUser.phone}</p>
                      <a
                        href={toExternalUrl(pendingUser.linkedinUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:underline"
                        style={{ color: COLORS.accent }}>
                        LinkedIn ↗
                      </a>
                      <p className="text-[11px] font-mono" style={{ color: COLORS.textFaint }}>
                        {pendingUser.certificateUrl ? '✓ Certificate uploaded' : 'No certificate'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'approve')}
                        disabled={actionUid === pendingUser.uid}
                        className="flex-1 bg-green-500 text-black font-bold py-2.5 hover:bg-green-400 transition-colors disabled:opacity-50">
                        {actionUid === pendingUser.uid ? '…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleDecision(pendingUser.uid, 'reject')}
                        disabled={actionUid === pendingUser.uid}
                        className="flex-1 font-bold py-2.5 transition-colors disabled:opacity-50 hover:bg-red-500/20"
                        style={{ color: '#F87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)' }}>
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
