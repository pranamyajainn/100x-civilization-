'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

interface ActivityItem {
  type: 'post' | 'join';
  text: string;
  timestamp: number;
}

export function ActivityTicker({ db }: { db: Firestore }) {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const results = await Promise.allSettled([
          getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10))),
          getDocs(
            query(
              collection(db, 'users'),
              where('status', '==', 'approved'),
              orderBy('approvedAt', 'desc'),
              limit(5),
            ),
          ),
        ]);

        if (cancelled) return;

        const activity: ActivityItem[] = [];

        if (results[0].status === 'fulfilled') {
          results[0].value.docs.forEach((doc) => {
            const data = doc.data();
            const rawName = typeof data.posterName === 'string' ? data.posterName : '';
            const firstName = rawName.split(' ')[0] || 'Someone';
            const ts: number = data.createdAt?.toMillis?.() ?? 0;
            activity.push({
              type: 'post',
              text: `${firstName} just posted a ${data.type ?? 'new'} opportunity`,
              timestamp: ts,
            });
          });
        }

        if (results[1].status === 'fulfilled') {
          results[1].value.docs.forEach((doc) => {
            const data = doc.data();
            const rawName = typeof data.fullName === 'string' ? data.fullName : '';
            const firstName = rawName.split(' ')[0] || 'Someone';
            const ts: number = data.approvedAt?.toMillis?.() ?? 0;
            activity.push({
              type: 'join',
              text: `${firstName} just joined the network`,
              timestamp: ts,
            });
          });
        }

        activity.sort((a, b) => b.timestamp - a.timestamp);
        if (!cancelled) setItems(activity.slice(0, 8));
      } catch {
        // ticker is non-critical — fail silently
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <>
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .activity-ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 30s linear infinite;
        }
        .activity-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className="overflow-hidden border-t border-b border-white/10 flex items-center h-9"
        aria-hidden="true"
      >
        <div className="activity-ticker-track">
          {doubled.map((item, i) => (
            <span
              key={i}
              className="flex items-center whitespace-nowrap font-mono text-xs tracking-widest text-brand-muted px-4"
            >
              {item.text}
              <span className="mx-3 text-brand-neon">·</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
