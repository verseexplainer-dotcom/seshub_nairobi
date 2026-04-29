const SUPABASE_AUTH_COOKIE_PATTERN = /(?:^|;\s*)sb-[^=]+=/

type PublicCacheOptions = {
  sMaxAge?: number;
  staleWhileRevalidate?: number;
};

function appendVaryCookie(headers: Headers) {
  const current = headers.get('Vary');
  if (!current) {
    headers.set('Vary', 'Cookie');
    return;
  }

  const values = current
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.includes('Cookie')) {
    values.push('Cookie');
    headers.set('Vary', values.join(', '));
  }
}

export function hasSupabaseAuthCookie(request: Request) {
  return SUPABASE_AUTH_COOKIE_PATTERN.test(request.headers.get('cookie') || '');
}

export function setPublicCacheHeaders(
  headers: Headers,
  request: Request,
  options: PublicCacheOptions = {}
) {
  appendVaryCookie(headers);

  if (hasSupabaseAuthCookie(request)) {
    headers.set('Cache-Control', 'private, no-store');
    return;
  }

  const sMaxAge = options.sMaxAge ?? 300;
  const staleWhileRevalidate = options.staleWhileRevalidate ?? 3600;
  headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
}
