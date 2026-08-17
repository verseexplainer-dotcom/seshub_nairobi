import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as authCallback } from '../src/pages/api/auth/callback';
import { POST as resetPassword } from '../src/pages/api/auth/reset-password';
import { POST as signUp } from '../src/pages/api/auth/sign-up';

const originalFetch = globalThis.fetch;

function createAuthContext(request: Request) {
  const values = new Map<string, string>();

  return {
    request,
    url: new URL(request.url),
    cookies: {
      get(name: string) {
        const value = values.get(name);
        return value === undefined ? undefined : { value };
      },
      set(name: string, value: string) {
        values.set(name, value);
      },
      delete(name: string) {
        values.delete(name);
      }
    },
    locals: {
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
          PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role'
        }
      }
    }
  };
}

function createFormRequest(path: string, fields: Record<string, string>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }

  return new Request(`https://shop.example.com${path}`, {
    method: 'POST',
    body: formData
  });
}

test('signup rejects mismatched passwords before calling Supabase', async (t) => {
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('Unexpected fetch');
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = createFormRequest('/api/auth/sign-up', {
    full_name: 'Test Customer',
    email: 'customer@example.com',
    password: 'password-one',
    confirm_password: 'password-two',
    next: '/account'
  });
  const response = await signUp(createAuthContext(request) as any);

  assert.equal(response.status, 303);
  assert.equal(fetchCalled, false);
  assert.match(response.headers.get('location') || '', /matching\+passwords/);
});

test('signup does not use the service role to bypass a confirmation email failure', async (t) => {
  const requests: string[] = [];
  globalThis.fetch = (async (input) => {
    requests.push(String(input));
    return new Response(
      JSON.stringify({
        code: 'unexpected_failure',
        msg: 'Error sending confirmation email'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = createFormRequest('/api/auth/sign-up', {
    full_name: 'Test Customer',
    email: 'customer@example.com',
    password: 'password-one',
    confirm_password: 'password-one',
    next: '/account'
  });
  const response = await signUp(createAuthContext(request) as any);

  assert.equal(response.status, 303);
  assert.equal(requests.length, 1);
  assert.match(requests[0] || '', /\/auth\/v1\/signup/);
  assert.match(response.headers.get('location') || '', /sending\+confirmation\+email/i);
});

test('signup directs an existing confirmed account to sign in or reset', async (t) => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        user: {
          id: 'existing-user',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'customer@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: '2026-06-22T00:00:00.000Z'
        },
        session: null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = createFormRequest('/api/auth/sign-up', {
    full_name: 'Existing Customer',
    email: 'customer@example.com',
    password: 'password-one',
    confirm_password: 'password-one',
    next: '/account'
  });
  const response = await signUp(createAuthContext(request) as any);

  assert.equal(response.status, 303);
  assert.match(response.headers.get('location') || '', /^https:\/\/shop\.example\.com\/auth\/login\?/);
  assert.match(response.headers.get('location') || '', /already\+exists/);
});

test('password reset uses the recovery callback and a non-enumerating success message', async (t) => {
  let requestUrl = '';
  globalThis.fetch = (async (input) => {
    requestUrl = String(input);
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = createFormRequest('/api/auth/reset-password', {
    email: 'customer@example.com'
  });
  const response = await resetPassword(createAuthContext(request) as any);

  assert.equal(response.status, 303);
  assert.equal(
    new URL(requestUrl).searchParams.get('redirect_to'),
    'https://shop.example.com/api/auth/callback?type=recovery&next=/auth/reset-password'
  );
  assert.match(response.headers.get('location') || '', /If\+an\+account\+exists/);
});

test('invalid recovery callbacks return to the password reset screen', async () => {
  const request = new Request(
    'https://shop.example.com/api/auth/callback?type=recovery&error_description=Link%20expired'
  );
  const response = await authCallback(createAuthContext(request) as any);

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get('location'),
    'https://shop.example.com/auth/reset-password?error=Link+expired'
  );
});
