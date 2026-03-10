export function getSafeRedirectPath(
  input: FormDataEntryValue | string | null | undefined,
  fallback = '/'
) {
  const raw = typeof input === 'string' ? input : '';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(raw, 'https://ses.local');
    if (url.origin !== 'https://ses.local') {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildPathWithMessage(
  path: string,
  params: Record<string, string | null | undefined>
) {
  const url = new URL(path, 'https://ses.local');

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function absoluteUrl(request: Request, path: string) {
  return new URL(path, request.url).toString();
}

export function normalizePhoneForWhatsApp(phone: string | null | undefined) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits;
}
