import type { ProfileRecord, UserRole } from './app-types';

const BOOTSTRAP_ADMIN_EMAILS = new Set(['sesicthub224@gmail.com']);

export function normalizeEmail(email: string | null | undefined) {
  return String(email || '').trim().toLowerCase();
}

export function isBootstrapAdminEmail(email: string | null | undefined) {
  return BOOTSTRAP_ADMIN_EMAILS.has(normalizeEmail(email));
}

export function getEffectiveUserRole(
  email: string | null | undefined,
  storedRole: UserRole | null | undefined
): UserRole {
  if (isBootstrapAdminEmail(email)) {
    return 'admin';
  }

  return storedRole ?? 'customer';
}

export function applyBootstrapAdminAccess<T extends ProfileRecord | null>(
  email: string | null | undefined,
  profile: T
): T {
  if (!profile || !isBootstrapAdminEmail(email)) {
    return profile;
  }

  return {
    ...profile,
    role: 'admin',
    is_active: true
  };
}
