import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyBootstrapAdminAccess,
  getEffectiveUserRole,
  isBootstrapAdminEmail,
  normalizeEmail
} from '../src/lib/admin-access';
import type { ProfileRecord } from '../src/lib/app-types';

function createProfile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    user_id: 'user-123',
    full_name: 'SES Owner',
    phone: null,
    default_location: null,
    role: 'customer',
    is_active: false,
    created_at: '2026-06-12T00:00:00.000Z',
    updated_at: '2026-06-12T00:00:00.000Z',
    ...overrides
  };
}

test('normalizes account email values', () => {
  assert.equal(normalizeEmail(' SESICTHUB224@gmail.com '), 'sesicthub224@gmail.com');
  assert.equal(normalizeEmail(null), '');
});

test('recognizes the bootstrap admin email only', () => {
  assert.equal(isBootstrapAdminEmail('sesicthub224@gmail.com'), true);
  assert.equal(isBootstrapAdminEmail('customer@example.com'), false);
});

test('bootstrap admin email gets effective admin role', () => {
  assert.equal(getEffectiveUserRole('sesicthub224@gmail.com', 'customer'), 'admin');
  assert.equal(getEffectiveUserRole('customer@example.com', 'staff'), 'staff');
  assert.equal(getEffectiveUserRole('customer@example.com', null), 'customer');
});

test('bootstrap admin profile is treated as active admin in server auth', () => {
  const profile = applyBootstrapAdminAccess('sesicthub224@gmail.com', createProfile());

  assert.equal(profile?.role, 'admin');
  assert.equal(profile?.is_active, true);
});

test('non-bootstrap profiles are left unchanged', () => {
  const profile = createProfile({ role: 'staff', is_active: false });

  assert.equal(applyBootstrapAdminAccess('staff@example.com', profile), profile);
});
