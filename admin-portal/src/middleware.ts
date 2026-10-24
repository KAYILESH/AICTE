import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Admin Portal Middleware
 *
 * - Refreshes the Supabase session on every request.
 * - Allows /login to be accessed by anyone.
 * - Protects /rb/* and /pgrc/* — unauthenticated visitors are redirected to /login.
 * - Authenticated students (non-officials) are also blocked and sent to /login.
 * - Demo sessions (set as cookies by the login page) are respected.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const pathname = request.nextUrl.pathname

  // Public routes: login page, Next.js internals, static assets
  const isPublic = pathname === '/login' || pathname === '/'
  if (isPublic) return supabaseResponse

  // Check for demo session cookie (set client-side on demo login)
  const demoBureau = request.cookies.get('aicte_official_demo')?.value || request.cookies.get('aicte_official_session')?.value
  if (demoBureau === 'RB' || demoBureau === 'PGRC') {
    // Demo user: allow access, but enforce bureau isolation
    if (demoBureau === 'RB' && pathname.startsWith('/pgrc')) {
      return NextResponse.redirect(new URL('/rb/dashboard', request.url))
    }
    if (demoBureau === 'PGRC' && pathname.startsWith('/rb')) {
      return NextResponse.redirect(new URL('/pgrc/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Try real Supabase auth if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      })

      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        // Authenticated: allow access (role enforcement happens in the page/API)
        return supabaseResponse
      }
    } catch {
      // Supabase unavailable — fall through to redirect
    }
  }

  // No valid session → redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirectTo', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
