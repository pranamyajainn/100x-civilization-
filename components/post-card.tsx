'use client';

import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { skillLabel } from '@/lib/taxonomy';

export type PostType = 'hiring' | 'co-founder' | 'paid-project' | 'pressure-test' | 'warm-intro';

export interface PostData {
  id: string;
  type: PostType;
  title: string;
  description: string;
  skillTags: string[];
  embedding?: number[] | null;
  posterName: string;
  posterCohort: string;
  posterUid: string;
  contactVisible: boolean;
  contactEmail?: string;
  createdAt: string; // ISO string
  relevanceScore?: number;
}

const TYPE_LABELS: Record<PostType, string> = {
  'hiring': 'Hiring',
  'co-founder': 'Co-Founder Search',
  'paid-project': 'Paid Project',
  'pressure-test': 'Pressure Test',
  'warm-intro': 'Warm Intro',
};

const TYPE_COLORS: Record<PostType, string> = {
  'hiring': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'co-founder': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'paid-project': 'bg-brand-neon/10 text-brand-neon border-brand-neon/20',
  'pressure-test': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'warm-intro': 'bg-green-500/10 text-green-400 border-green-500/20',
};

interface PostCardProps {
  post: PostData;
  onClick: (id: string) => void;
  index?: number;
}

export function PostCard({ post, onClick, index = 0 }: PostCardProps) {
  const relativeTime = formatRelative(post.createdAt);
  const typeColor = TYPE_COLORS[post.type] ?? 'bg-white/10 text-white border-white/10';
  const typeLabel = TYPE_LABELS[post.type] ?? post.type;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={() => onClick(post.id)}
      className="group relative bg-black border border-brand-border hover:border-white/20 transition-colors duration-300 cursor-pointer p-6"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(post.id)}
      aria-label={`${typeLabel}: ${post.title}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className={`inline-block text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 border ${typeColor}`}>
            {typeLabel}
          </span>
          {post.relevanceScore !== undefined && post.relevanceScore > 0.3 && (
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 bg-brand-neon/5 border border-brand-neon/20 text-brand-neon/60">
              Strong Match
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-brand-muted whitespace-nowrap">{relativeTime}</span>
      </div>

      {/* Title */}
      <h3 className="text-[18px] font-display font-medium text-brand-white group-hover:text-brand-neon transition-colors leading-snug mb-2">
        {post.title}
      </h3>

      {/* Description preview */}
      <p className="text-sm text-brand-muted leading-relaxed line-clamp-2 mb-4">
        {post.description}
      </p>

      {/* Skill tags */}
      {post.skillTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {post.skillTags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-[10px] font-mono text-brand-white/40 bg-white/5 px-2 py-0.5">
              {skillLabel(tag)}
            </span>
          ))}
          {post.skillTags.length > 5 && (
            <span className="text-[10px] font-mono text-brand-muted px-2 py-0.5">
              +{post.skillTags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-neon/40" />
          <span className="text-[11px] font-mono text-brand-muted">
            {post.posterName} · {post.posterCohort}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-neon opacity-0 group-hover:opacity-100 transition-opacity">
          View <ArrowRight size={12} />
        </span>
      </div>

      {/* Hover line */}
      <div className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full bg-brand-neon transition-all duration-300" />
    </motion.article>
  );
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}
