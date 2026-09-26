import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPublicSupabaseConfig } from '../src/lib/runtime';

test('local preview detects missing Supabase credentials without throwing', () => {
  assert.equal(hasPublicSupabaseConfig({ runtime: { env: {} } } as never), false);
});

test('runtime Supabase credentials enable authenticated middleware', () => {
  assert.equal(
    hasPublicSupabaseConfig({
      runtime: {
        env: {
          PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
          SUPABASE_SERVICE_ROLE_KEY: undefined
        }
      }
    } as never),
    true
  );
});
