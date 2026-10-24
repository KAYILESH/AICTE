import { createBrowserClient } from '@supabase/ssr'
import { getOfficialDemoSession, clearOfficialDemoSession } from '@/lib/officialApi'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'
  const isPlaceholder = url.includes('placeholder') || !url.startsWith('http')
  const realClient = createBrowserClient(url, key)

  return {
    ...realClient,
    auth: {
      ...realClient.auth,

      async getUser() {
        const demo = getOfficialDemoSession()
        if (demo) {
          return {
            data: {
              user: {
                id: demo.user_id,
                email: `${demo.bureau.toLowerCase()}.officer@aicte-demo.gov.in`,
                role: demo.role,
                user_metadata: {
                  full_name: demo.display_name,
                  is_official: true,
                  bureau: demo.bureau,
                },
              },
            },
            error: null,
          }
        }
        if (isPlaceholder) {
          return { data: { user: null }, error: null }
        }
        try {
          return await realClient.auth.getUser()
        } catch {
          return { data: { user: null }, error: null }
        }
      },

      async getSession() {
        const demo = getOfficialDemoSession()
        if (demo) {
          return {
            data: {
              session: {
                access_token: 'demo-official-jwt',
                token_type: 'bearer',
                expires_in: 3600,
                user: {
                  id: demo.user_id,
                  email: `${demo.bureau.toLowerCase()}.officer@aicte-demo.gov.in`,
                  role: demo.role,
                },
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

      async signOut() {
        clearOfficialDemoSession()
        if (!isPlaceholder) {
          try {
            await realClient.auth.signOut()
          } catch {}
        }
        return { error: null }
      },
    },
  }
}
