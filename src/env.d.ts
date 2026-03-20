/// <reference path="../.astro/types.d.ts" />

import type { User } from '@supabase/supabase-js';
import type { ProfileRecord, RuntimeEnv } from './lib/app-types';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      profile: ProfileRecord | null;
      isStaff: boolean;
      isAdmin: boolean;
      runtime?: {
        env?: RuntimeEnv;
      } & Record<string, unknown>;
    }
  }

  interface Window {
    __sesCartHandlerBound?: boolean;
  }
}

export {};
