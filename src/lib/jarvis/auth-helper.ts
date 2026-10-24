import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Authenticates the incoming request via Supabase SSR cookies or Master authorization header.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Supabase Session check
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      return { id: user.id, email: user.email.toLowerCase() };
    }
  } catch {
    // Supabase client session read failed or unconfigured
  }

  // 2. Master Secret / Header fallback (for local worker CLI & testing)
  const masterSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MASTER_PASSWORD;
  const authHeader = req.headers.get('authorization');
  if (masterSecret && authHeader && authHeader === `Bearer ${masterSecret}`) {
    return { id: 'master_operator', email: (process.env.MASTER_EMAIL || 'master@danvers.jarvis').toLowerCase() };
  }

  // 3. In dev mode if no auth configured, return operator for local dashboard
  if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { id: 'dev_operator', email: 'operator@danvers.local' };
  }

  return null;
}
