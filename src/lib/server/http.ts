const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export type ApiErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers
    }
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extras: Record<string, unknown> = {}
) {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message
      },
      ...extras
    } satisfies ApiErrorPayload & Record<string, unknown>,
    status
  );
}

export function getRuntimeEnv(locals: unknown) {
  return ((locals as { runtime?: { env?: Record<string, string | undefined> } })?.runtime?.env ?? {}) as Record<
    string,
    string | undefined
  >;
}

export function getPublicEnvValue(locals: unknown, key: string) {
  const runtimeValue = getRuntimeEnv(locals)[key]?.trim();
  if (runtimeValue) {
    return runtimeValue;
  }

  const buildValue = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[key] ?? '').trim();
  return buildValue || undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}
