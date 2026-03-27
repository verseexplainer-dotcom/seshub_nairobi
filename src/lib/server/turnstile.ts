const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerifyPayload = {
  success?: boolean;
  action?: string;
  'error-codes'?: string[];
};

type TurnstileSuccess = {
  ok: true;
};

type TurnstileFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type TurnstileVerificationResult = TurnstileSuccess | TurnstileFailure;

export async function verifyTurnstileToken(options: {
  token: string | null;
  secretKey: string | undefined;
  remoteIp?: string | null;
  expectedAction?: string;
}): Promise<TurnstileVerificationResult> {
  const { token, secretKey, remoteIp, expectedAction } = options;

  if (!secretKey?.trim()) {
    return {
      ok: false,
      status: 500,
      code: 'TURNSTILE_CONFIG_MISSING',
      message: 'Server configuration missing Turnstile credentials.'
    };
  }

  if (!token) {
    return {
      ok: false,
      status: 400,
      code: 'TURNSTILE_REQUIRED',
      message: 'Complete the security check and try again.'
    };
  }

  const body = new URLSearchParams({
    secret: secretKey.trim(),
    response: token
  });

  if (remoteIp?.trim()) {
    body.set('remoteip', remoteIp.trim());
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  }).catch((error: unknown) => {
    console.error('turnstile siteverify network error', error);
    return null;
  });

  if (!response) {
    return {
      ok: false,
      status: 502,
      code: 'TURNSTILE_VERIFY_FAILED',
      message: 'Unable to verify the security check right now.'
    };
  }

  if (!response.ok) {
    const upstreamError = await response.text().catch(() => '');
    console.error('turnstile siteverify error', response.status, upstreamError);
    return {
      ok: false,
      status: 502,
      code: 'TURNSTILE_VERIFY_FAILED',
      message: 'Unable to verify the security check right now.'
    };
  }

  const payload = (await response.json().catch(() => null)) as TurnstileVerifyPayload | null;
  if (!payload?.success) {
    console.error('turnstile verification rejected', payload?.['error-codes'] ?? []);
    return {
      ok: false,
      status: 400,
      code: 'TURNSTILE_INVALID',
      message: 'Security check failed. Please try again.'
    };
  }

  if (expectedAction && payload.action !== expectedAction) {
    console.error('turnstile action mismatch', {
      expectedAction,
      receivedAction: payload.action ?? null
    });
    return {
      ok: false,
      status: 400,
      code: 'TURNSTILE_INVALID',
      message: 'Security check failed. Please try again.'
    };
  }

  return { ok: true };
}
