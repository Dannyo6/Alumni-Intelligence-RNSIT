import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const isValidUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string' || !url.trim()) return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const isValidKey = (key?: string): boolean => {
  return typeof key === 'string' && key.trim().length > 0
}

export const hasValidSupabaseConfig = Boolean(isValidUrl(rawUrl) && isValidKey(rawKey))

const supabaseUrl = rawUrl ? rawUrl.trim() : ''
const supabasePublishableKey = rawKey ? rawKey.trim() : ''

// Create client if valid, otherwise create a defensive mock that prevents silent failure
export const supabase = hasValidSupabaseConfig
  ? createClient<Database>(supabaseUrl, supabasePublishableKey)
  : (new Proxy({}, {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            signOut: () => Promise.resolve({ error: null }),
          }
        }
        return () => {
          throw new Error(`Cannot execute Supabase operation '${String(prop)}': Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY environment configuration.`)
        }
      }
    }) as any)
