'use client';

/**
 * SkillTagInput — Autocomplete input for the skill taxonomy.
 * Taxonomy suggestions shown as hints; freeform terms also accepted (Title-Case).
 * Minimum 3 tags enforced by parent form validation.
 */

import { useState, useRef, KeyboardEvent } from 'react';
import { SKILL_TAXONOMY, skillLabel } from '@/lib/taxonomy';
import { X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  error?: string;
}

const DEFAULT_SUGGESTIONS = ['AI-Agents', 'Python', 'Marketing', 'D2C', 'Product-Management', 'LLMs'];

export function SkillTagInput({ value, onChange, maxTags = 20, error }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = SKILL_TAXONOMY.filter(
    (t) =>
      t.includes(query.toLowerCase().replace(/\s+/g, '-')) &&
      !value.includes(t)
  ).slice(0, 8);

  const exactTaxonomyMatch = query.trim().length > 0 && SKILL_TAXONOMY.some(
    (t) => t.toLowerCase() === query.trim().toLowerCase().replace(/\s+/g, '-')
  );
  const showEnterHint = query.length > 1 && !exactTaxonomyMatch;

  const addTag = (tag: string) => {
    if (value.includes(tag)) return;
    if (value.length >= maxTags) return;
    onChange([...value, tag]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const addFreeform = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase().includes('linkedin.com') || trimmed.toLowerCase().startsWith('http')) {
      setQuery('');
      return;
    }
    const titleCased = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (value.includes(titleCased)) return;
    if (value.length >= maxTags) return;
    onChange([...value, titleCased]);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (query.trim().length > 0) {
        addFreeform(query);
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-neon/10 border border-brand-neon/30 text-brand-neon text-xs font-mono"
            >
              {skillLabel(tag)}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="inline-flex items-center justify-center min-h-[32px] min-w-[24px] hover:text-white transition-colors"
                aria-label={`Remove ${skillLabel(tag)}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything and press Enter to add"
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm text-brand-white outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50 md:text-sm text-base"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          autoComplete="off"
          inputMode="search"
        />

        {open && query.length === 0 && (
          <ul
            className="absolute z-50 w-full bg-black border border-brand-border mt-1 max-h-48 overflow-y-auto"
            role="listbox"
          >
            {DEFAULT_SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
              <li
                key={s}
                className="px-4 py-3 text-sm font-mono text-brand-white/80 hover:bg-brand-neon/10 hover:text-brand-neon cursor-pointer transition-colors min-h-[44px] flex items-center"
                role="option"
                aria-selected={false}
                onMouseDown={() => addTag(s)}
                onTouchEnd={(e) => { e.preventDefault(); addTag(s); }}
              >
                {skillLabel(s)}
              </li>
            ))}
          </ul>
        )}

        {open && query.length > 0 && suggestions.length > 0 && (
          <ul
            className="absolute z-50 w-full bg-black border border-brand-border mt-1 max-h-48 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((s) => (
              <li
                key={s}
                className="px-4 py-3 text-sm font-mono text-brand-white/80 hover:bg-brand-neon/10 hover:text-brand-neon cursor-pointer transition-colors min-h-[44px] flex items-center"
                role="option"
                aria-selected={false}
                onMouseDown={() => addTag(s)}
                onTouchEnd={(e) => { e.preventDefault(); addTag(s); }}
              >
                {skillLabel(s)}
              </li>
            ))}
          </ul>
        )}

        {open && query.length > 0 && suggestions.length === 0 && (
          <div className="absolute z-50 w-full bg-black border border-brand-border mt-1 px-4 py-3 text-xs text-brand-muted font-mono">
            Press Enter to add &ldquo;{query}&rdquo; as a custom tag
          </div>
        )}
      </div>

      <p className="mt-1 font-mono text-[10px] tracking-wider text-brand-muted">
        Type any skill and press Enter — or pick from the suggestions below
      </p>

      {showEnterHint && (
        <p className="mt-1 font-mono text-[10px] tracking-wider text-brand-neon">
          Press Enter to add &ldquo;{query}&rdquo; as a custom tag
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      <p className="text-[10px] text-brand-muted font-mono">
        {value.length}/min 3 tags · Press Enter to add
      </p>
    </div>
  );
}
