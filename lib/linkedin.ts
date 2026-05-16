function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function extractLinkedInHandle(linkedinUrl: string): string {
  const trimmed = normalizeWhitespace(linkedinUrl);
  if (!trimmed) return '';

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const inIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === 'in');
    const handleSegment = inIndex >= 0 ? pathSegments[inIndex + 1] ?? '' : pathSegments[0] ?? '';
    return decodeURIComponent(handleSegment).replace(/\/+$/, '');
  } catch {
    const withoutProtocol = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const pathMatch = withoutProtocol.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]).replace(/\/+$/, '') : '';
  }
}

export function extractLinkedInContext(linkedinUrl: string): string {
  const handle = extractLinkedInHandle(linkedinUrl);
  if (!handle) {
    return 'handle: unknown | signals: none';
  }

  const tokens = handle
    .toLowerCase()
    .split(/[-_.]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const nameSignals = tokens.filter((token) => /^[a-z]+$/.test(token) && token.length > 1);
  const backgroundSignals = tokens.filter((token) => !nameSignals.includes(token));

  return [
    `handle: ${handle}`,
    `name signals: ${nameSignals.length > 0 ? nameSignals.join(' ') : 'none'}`,
    `background signals: ${backgroundSignals.length > 0 ? backgroundSignals.join(' ') : 'none'}`,
  ].join(' | ');
}
