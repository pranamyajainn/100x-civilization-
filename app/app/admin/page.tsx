'use client';

/**
 * /app/admin — Admin panel.
 *
 * KPI SNAPSHOT (Section E):
 * - Total notifications sent
 * - Total replies (connection events)
 * - Notification-to-reply rate (%)
 * - Breakdown by opportunity type
 *
 * CSV EXPORT includes: uid, cohorts, post type, timestamp, isCrossCohort, isSeedData
 * (so seed data can be filtered out of the capstone report).
 *
 * INVITE MANAGEMENT: Generate / list / revoke invite links.
 *
 * Access: guarded by ADMIN_EMAILS — if current user's email is not in the list,
 * the /api/admin/invite route returns 403, and we show an access denied screen.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { motion } from 'motion/react';
import { Plus, Copy, Check, Loader2, Trash2, Download } from 'lucide-react';

interface Invite {
  token: string;
  targetEmail: string;
  createdBy: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  status: string;
  inviteUrl?: string;
}

interface Connection {
  viewerUid: string;
  viewerCohort: string;
  posterUid: string;
  posterCohort: string;
  postId: string;
  postType: string;
  actionType: string;
  isCrossCohort: boolean;
  timestamp: string;
  isSeedData: boolean;
  emailDomain?: string;
}

interface NotifDoc {
  uid: string;
  postId: string;
  postType: string;
  sentAt: string;
  replied: boolean;
  isSeedData: boolean;
}

interface PendingUser {
  uid: string;
  fullName: string;
  cohort: string;
  email: string;
  certificateUrl: string;
  verificationStatus: string;
}

// KPI derived metrics
interface KpiMetrics {
  totalNotifications: number;
  totalReplies: number;
  replyRate: number; // percentage
  byType: Record<string, { sent: number; replied: number; rate: number }>;
}

function computeKpis(notifications: NotifDoc[], connections: Connection[]): KpiMetrics {
  const total = notifications.length;
  const replied = notifications.filter((n) => n.replied).length;
  const replyRate = total > 0 ? (replied / total) * 100 : 0;

  // Group by postType
  const typeMap: Record<string, { sent: number; replied: number }> = {};
  for (const n of notifications) {
    const t = n.postType || 'unknown';
    if (!typeMap[t]) typeMap[t] = { sent: 0, replied: 0 };
    typeMap[t].sent++;
    if (n.replied) typeMap[t].replied++;
  }
  const byType: KpiMetrics['byType'] = {};
  for (const [type, { sent, replied: rep }] of Object.entries(typeMap)) {
    byType[type] = { sent, replied: rep, rate: sent > 0 ? (rep / sent) * 100 : 0 };
  }

  return { totalNotifications: total, totalReplies: replied, replyRate, byType };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notifications, setNotifications] = useState<NotifDoc[]>([]);
  const [kpi, setKpi] = useState<KpiMetrics | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return; }
      setUser(u);
    });
    return unsub;
  }, [router]);

  const adminHeaders = (u: User) => ({
    'Content-Type': 'application/json',
    'x-admin-email': u.email ?? '',
  });

  const loadInvites = async (u: User) => {
    try {
      const res = await fetch('/api/admin/invite', { headers: adminHeaders(u) });
      if (res.status === 403) { setAuthorized(false); return; }
      setAuthorized(true);
      const data = await res.json();
      setInvites(data.invites ?? []);
    } catch (err) {
      console.error('[admin] load invites error:', err);
    }
  };

  const loadConnectionsAndNotifications = async () => {
    try {
      // Load connections
      const connQ = query(collection(db, 'connections'), orderBy('timestamp', 'desc'));
      const connSnap = await getDocs(connQ);
      const conns = connSnap.docs.map((d) => d.data() as Connection);
      setConnections(conns);

      // Load notifications
      const notifQ = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'));
      const notifSnap = await getDocs(notifQ);
      const notifs = notifSnap.docs.map((d) => d.data() as NotifDoc);
      setNotifications(notifs);

      // Compute KPI
      setKpi(computeKpis(notifs, conns));
    } catch (err) {
      console.error('[admin] load data error:', err);
    }
  };

  const loadPendingUsers = async () => {
    try {
      // Fetch all users and filter client-side (avoids composite index requirement)
      const usersSnap = await getDocs(collection(db, 'users'));
      const pending = usersSnap.docs
        .map((d) => d.data() as PendingUser)
        .filter((u) => u.verificationStatus === 'pending');
      setPendingUsers(pending);
    } catch (err) {
      console.error('[admin] load pending users error:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([loadInvites(user), loadConnectionsAndNotifications(), loadPendingUsers()]).finally(() => setLoading(false));
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setNewInviteUrl('');
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: adminHeaders(user),
        body: JSON.stringify({ targetEmail: targetEmail.trim() }),
      });
      const data = await res.json();
      setNewInviteUrl(data.inviteUrl ?? '');
      setTargetEmail('');
      await loadInvites(user);
    } catch (err) {
      console.error('[admin] generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    if (!user) return;
    if (!confirm('Revoke this invite?')) return;
    try {
      await fetch(`/api/admin/invite?token=${token}`, {
        method: 'DELETE',
        headers: adminHeaders(user),
      });
      await loadInvites(user);
    } catch (err) {
      console.error('[admin] revoke error:', err);
    }
  };

  const handleApprove = async (uid: string) => {
    try {
      const { doc: firestoreDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'users', uid), {
        verificationStatus: 'approved',
        verifiedAt: serverTimestamp(),
      });
      setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('[admin] approve error:', err);
    }
  };

  const handleReject = async (uid: string) => {
    if (!confirm('Reject this user? They will be hidden from the feed.')) return;
    try {
      const { doc: firestoreDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'users', uid), {
        verificationStatus: 'rejected',
        hiddenFromFeed: true,
        rejectedAt: serverTimestamp(),
      });
      setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('[admin] reject error:', err);
    }
  };

  const exportCSV = () => {
    const rows = [
      // Header — includes isSeedData so capstone can filter
      ['viewerUid', 'viewerCohort', 'posterUid', 'posterCohort', 'postId', 'postType', 'actionType', 'isCrossCohort', 'timestamp', 'isSeedData'],
      ...connections.map((c) => [
        c.viewerUid,
        c.viewerCohort,
        c.posterUid,
        c.posterCohort,
        c.postId,
        c.postType,
        c.actionType,
        String(c.isCrossCohort),
        c.timestamp,
        String(c.isSeedData ?? false),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `100x-connections-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!authorized && authorized !== null) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-display text-brand-white mb-3">Access Denied</h1>
          <p className="text-brand-muted text-sm">Your email is not authorized to access the admin panel.</p>
          <button onClick={() => router.push('/app/feed')} className="mt-6 text-brand-neon font-mono text-sm hover:underline">
            ← Back to feed
          </button>
        </div>
      </div>
    );
  }

  const crossCohortCount = connections.filter((c) => c.isCrossCohort).length;
  const liveConnections = connections.filter((c) => !c.isSeedData);
  const liveNotifications = notifications.filter((n) => !n.isSeedData);
  const liveKpi = kpi ? computeKpis(liveNotifications, liveConnections) : null;

  const POST_TYPE_LABELS: Record<string, string> = {
    'hiring': 'Hiring',
    'co-founder': 'Co-Founder',
    'paid-project': 'Paid Project',
    'pressure-test': 'Pressure Test',
    'warm-intro': 'Warm Intro',
  };

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
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
        {loading ? (
          <div className="flex items-center gap-3 py-20 justify-center text-brand-muted">
            <Loader2 className="w-5 h-5 animate-spin text-brand-neon" />
            <span className="text-sm font-mono">Loading admin data…</span>
          </div>
        ) : (
          <div className="space-y-12">

            {/* ─── KPI Snapshot ─── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">KPI Snapshot — Live Data Only</h2>
                <span className="text-[10px] font-mono text-brand-muted/50">Seed data excluded</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Notifications Sent', value: liveKpi?.totalNotifications ?? 0 },
                  { label: 'Replies (Connections)', value: liveKpi?.totalReplies ?? 0 },
                  { label: 'Reply Rate', value: `${(liveKpi?.replyRate ?? 0).toFixed(1)}%` },
                  { label: 'Cross-Cohort Pairs', value: liveConnections.filter((c) => c.isCrossCohort).length },
                ].map((stat) => (
                  <div key={stat.label} className="p-5 border border-brand-border">
                    <p className="text-3xl font-display font-medium text-brand-neon">{stat.value}</p>
                    <p className="text-[10px] font-mono text-brand-muted uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── Reply Rate by Opportunity Type ─── */}
            {liveKpi && Object.keys(liveKpi.byType).length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-4">Reply Rate by Opportunity Type</h2>
                <div className="border border-brand-border divide-y divide-brand-border">
                  {Object.entries(liveKpi.byType).map(([type, { sent, replied: rep, rate }]) => (
                    <div key={type} className="flex items-center justify-between px-4 py-3 gap-4">
                      <span className="font-mono text-sm text-brand-white">{POST_TYPE_LABELS[type] ?? type}</span>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-brand-muted">
                        <span>{sent} sent</span>
                        <span>{rep} replied</span>
                        <span className={`font-bold ${rate >= 10 ? 'text-brand-neon' : 'text-yellow-400'}`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-brand-muted mt-2">
                  Target reply rate: ≥ 10% per PRD. Below target types shown in yellow.
                </p>
              </section>
            )}

            {/* ─── Connection Log + Export ─── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Connection Log</h2>
                  <p className="text-xs text-brand-muted/60 mt-0.5">
                    {crossCohortCount} cross-cohort · {connections.length} total · {connections.filter(c => c.isSeedData).length} seed
                  </p>
                </div>
                <button
                  id="export-connections-btn"
                  onClick={exportCSV}
                  className="flex items-center gap-2 text-[11px] font-mono text-brand-neon border border-brand-neon/30 px-3 py-1.5 hover:bg-brand-neon/10 transition-colors"
                >
                  <Download size={12} />
                  Export CSV
                </button>
              </div>
              <p className="text-xs text-brand-muted font-mono">
                CSV includes isSeedData column — filter it out before capstone submission.
              </p>
            </section>

            {/* ─── Invite Management ─── */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted">Generate Invite Link</h2>
                <div className="flex gap-4 text-[10px] font-mono text-brand-muted">
                  <span>{invites.filter(i => i.status === 'active').length} active</span>
                  <span>{invites.filter(i => i.status === 'used').length} used</span>
                </div>
              </div>
              <div className="flex gap-3 flex-col sm:flex-row mt-4">
                <input
                  type="email"
                  placeholder="Target email (optional — leave blank for open invite)"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  className="flex-1 bg-black/40 border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-neon transition-colors text-brand-white placeholder:text-brand-muted/50"
                />
                <button
                  id="generate-invite-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 bg-brand-neon text-brand-black font-semibold px-5 py-3 hover:bg-[#FF6A26] transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Generate
                </button>
              </div>

              {newInviteUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 border border-brand-neon/30 bg-brand-neon/5 flex items-center justify-between gap-4"
                >
                  <span className="font-mono text-sm text-brand-white break-all">{newInviteUrl}</span>
                  <button onClick={() => copyUrl(newInviteUrl)} className="text-brand-muted hover:text-brand-neon transition-colors flex-shrink-0">
                    {copied ? <Check size={16} className="text-brand-neon" /> : <Copy size={16} />}
                  </button>
                </motion.div>
              )}
              <p className="text-[10px] font-mono text-brand-muted mt-2">Invite links expire after 48 hours or one use.</p>
            </section>

            {/* ─── Invite List ─── */}
            <section>
              <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-4">All Invites</h2>
              {invites.length === 0 ? (
                <p className="text-sm text-brand-muted">No invites generated yet.</p>
              ) : (
                <div className="border border-brand-border divide-y divide-brand-border">
                  {invites.map((inv) => (
                    <div key={inv.token} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                            inv.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                            inv.status === 'used' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                            'border-red-500/30 text-red-400 bg-red-500/10'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-brand-muted truncate">
                            {inv.targetEmail || 'Open invite'}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-brand-muted/60 mt-1">
                          Expires: {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyUrl(`${window.location.origin}/invite/${inv.token}`)}
                          className="p-1.5 text-brand-muted hover:text-brand-neon transition-colors"
                          aria-label="Copy invite URL"
                        >
                          <Copy size={13} />
                        </button>
                        {inv.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(inv.token)}
                            className="p-1.5 text-brand-muted hover:text-red-400 transition-colors"
                            aria-label="Revoke invite"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── Pending Verifications ─── */}
            {pendingUsers.length > 0 && (
              <section>
                <h2 className="text-[10px] font-mono uppercase tracking-wider text-brand-muted mb-1">Pending Verifications</h2>
                <p className="text-xs text-brand-muted/60 mb-4">
                  {pendingUsers.length} alumni awaiting certificate review
                </p>
                <div className="border border-brand-border divide-y divide-brand-border">
                  {pendingUsers.map((pu) => (
                    <div key={pu.uid} className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-4 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-white">{pu.fullName}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-brand-muted mt-0.5 flex-wrap">
                          <span>{pu.cohort}</span>
                          <span>·</span>
                          <span>{pu.email}</span>
                          {pu.certificateUrl && (
                            <>
                              <span>·</span>
                              <a
                                href={pu.certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-neon hover:underline"
                              >
                                View certificate ↗
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(pu.uid)}
                          className="px-3 py-1.5 text-[11px] font-mono border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(pu.uid)}
                          className="px-3 py-1.5 text-[11px] font-mono border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
