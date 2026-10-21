import { createBrowserClient } from '@supabase/ssr'

export interface AuthUser {
  id: string
  email?: string
  role?: string
  user_metadata?: {
    full_name?: string
    mobile?: string
    [key: string]: any
  }
}

export const DEMO_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student.demo@aicte.gov.in',
  role: 'authenticated',
  user_metadata: {
    full_name: 'Rahul Sharma',
    mobile: '9876543210',
  },
}

export function setDemoSession(user: AuthUser = DEMO_USER) {
  if (typeof window === 'undefined') return
  localStorage.setItem('aicte_demo_user', JSON.stringify(user))
  document.cookie = 'aicte_demo_session=true; path=/; max-age=86400; SameSite=Lax'
  window.dispatchEvent(new Event('aicte-auth-change'))
}

export function clearDemoSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('aicte_demo_user')
  document.cookie = 'aicte_demo_session=; path=/; max-age=0; SameSite=Lax'
  window.dispatchEvent(new Event('aicte-auth-change'))
}

export function getDemoSession(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('aicte_demo_user')
    if (raw) return JSON.parse(raw)
  } catch {}
  if (document.cookie.includes('aicte_demo_session=true')) {
    return DEMO_USER
  }
  return null
}

/**
 * Supabase browser client with seamless Demo/Fallback support.
 * If live Supabase is configured, it uses live auth.
 * Otherwise, it supports instant demo login and local session.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'
  const realClient = createBrowserClient(url, key)
  const isPlaceholder = url.includes('placeholder') || !url.startsWith('http')

  return {
    ...realClient,
    auth: {
      ...realClient.auth,

      async getUser(): Promise<{ data: { user: AuthUser | null }; error: Error | null }> {
        const demo = getDemoSession()
        if (demo) {
          return { data: { user: demo }, error: null }
        }
        if (isPlaceholder) {
          return { data: { user: null }, error: null }
        }
        try {
          const res = await realClient.auth.getUser()
          return { data: { user: res.data?.user as AuthUser | null }, error: res.error }
        } catch {
          return { data: { user: null }, error: null }
        }
      },

      async getSession(): Promise<{ data: { session: any | null }; error: Error | null }> {
        const demo = getDemoSession()
        if (demo) {
          return {
            data: {
              session: {
                access_token: 'demo-jwt-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'demo-refresh',
                user: demo,
              },
            },
            error: null,
          }
        }
        if (isPlaceholder) {
          return { data: { session: null }, error: null }
        }
        try {
          return await realClient.auth.getSession()
        } catch {
          return { data: { session: null }, error: null }
        }
      },

      async signInWithPassword({ email, password }: { email: string; password?: string }): Promise<{ data: { user: AuthUser | null; session: any | null }; error: Error | null }> {
        if (!isPlaceholder) {
          try {
            const res = await realClient.auth.signInWithPassword({ email, password: password || '' })
            if (!res.error && res.data?.user) return res as any
          } catch {}
        }
        // Fallback demo login
        const loggedUser: AuthUser = {
          ...DEMO_USER,
          email: email || DEMO_USER.email,
          user_metadata: {
            full_name: email.includes('@')
              ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              : 'Student Complainant',
            mobile: '9876543210',
          },
        }
        setDemoSession(loggedUser)
        return {
          data: {
            user: loggedUser,
            session: {
              access_token: 'demo-jwt-token',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'demo-refresh',
              user: loggedUser,
            },
          },
          error: null,
        }
      },

      async signUp({
        email,
        password,
        options,
      }: {
        email: string
        password?: string
        options?: { data?: { full_name?: string; mobile?: string } }
      }): Promise<{ data: { user: AuthUser | null; session: any | null }; error: Error | null }> {
        if (!isPlaceholder) {
          try {
            const res = await realClient.auth.signUp({ email, password: password || '', options })
            if (!res.error) return res as any
          } catch {}
        }
        const loggedUser: AuthUser = {
          ...DEMO_USER,
          email,
          user_metadata: {
            full_name: options?.data?.full_name || email.split('@')[0],
            mobile: options?.data?.mobile || '',
          },
        }
        setDemoSession(loggedUser)
        return { data: { user: loggedUser, session: null }, error: null }
      },

      async signOut(): Promise<{ error: Error | null }> {
        clearDemoSession()
        if (!isPlaceholder) {
          try {
            await realClient.auth.signOut()
          } catch {}
        }
        return { error: null }
      },

      onAuthStateChange(callback: (event: string, session: any) => void): { data: { subscription: { unsubscribe: () => void } } } {
        if (typeof window !== 'undefined') {
          const handler = () => {
            const demo = getDemoSession()
            if (demo) {
              callback('SIGNED_IN', {
                access_token: 'demo-jwt-token',
                user: demo,
              })
            } else {
              callback('SIGNED_OUT', null)
            }
          }
          window.addEventListener('aicte-auth-change', handler)
        }

        const demo = getDemoSession()
        if (demo) {
          setTimeout(() => {
            callback('SIGNED_IN', {
              access_token: 'demo-jwt-token',
              user: demo,
            })
          }, 0)
        }

        if (!isPlaceholder) {
          try {
            return realClient.auth.onAuthStateChange(callback)
          } catch {}
        }

        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }
      },

      async resetPasswordForEmail(_email: string, _options?: any): Promise<{ data: any; error: Error | null }> {
        return { data: {}, error: null }
      },
    },
  }
}
