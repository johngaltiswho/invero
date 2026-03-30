export function normalizeAuthRedirect(input?: string | null, fallback = '/'): string {
  const raw = (input || '').trim();
  if (!raw) return fallback;

  if (raw.startsWith('/')) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const path = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
    return path.startsWith('/') ? path : fallback;
  } catch {
    return fallback;
  }
}
