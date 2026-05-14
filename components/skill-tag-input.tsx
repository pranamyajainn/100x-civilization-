'use client';

/**
 * SkillTagInput — Autocomplete input for the controlled skill taxonomy.
 * Freeform terms that don't exist in SKILL_TAXONOMY are rejected.
 * Minimum 5 tags enforced by parent form validation.
 */

import { useState, useRef, KeyboardEvent } from 'react';
import { SKILL_TAXONOMY, isValidSkill, skillLabel } from '@/lib/taxonomy';
import { X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  error?: string;
}

export function SkillTagInput({ value, onChange, maxTags = 20, error }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = SKILL_TAXONOMY.filter(
    (t) =>
      t.includes(query.toLowerCase().replace(/\s+/g, '-')) &&
      !value.includes(t)
  ).slice(0, 8);

  const addTag = (tag: string) => {
    if (!isValidSkill(tag)) return;
    if (value.includes(tag)) return;
    if (value.length >= maxTags) return;
    onChange([...value, tag]);
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
      if (suggestions.length > 0) addTag(suggestions[0]);
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
          placeholder={value.length === 0 ? 'Type to search skills…' : 'Add more skills…'}
          className="w-full bg-brand-black/40 border border-brand-border px-4 py-3 text-sm text-brand-white outline-none focus:border-brand-neon transition-colors placeholder:text-brand-muted/50 md:text-sm text-base"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          autoComplete="off"
          inputMode="search"
        />

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
            No matching skills. Use the taxonomy terms only.
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      <p className="text-[10px] text-brand-muted font-mono">
        {value.length}/min 5 tags · Press Enter to add top suggestion
      </p>
    </div>
  );
}
