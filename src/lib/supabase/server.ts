import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (url && url.startsWith('http')) return url
  return 'https://placeholder.supabase.co'
}

function getSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (key && key.length > 20) return key
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from Server Component
        }
      },
    },
  })
}
