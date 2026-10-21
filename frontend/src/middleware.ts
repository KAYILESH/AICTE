import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware: refreshes Supabase auth session on every request.
 * Supports both live Supabase auth and local demo sessions.
 * Redirects unauthenticated users from protected /student/* routes to /login.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const isDemo = request.cookies.get('aicte_demo_session')?.value === 'true'
  let user: { email?: string; id?: string } | null = isDemo
    ? { email: 'student.demo@aicte.gov.in', id: 'demo-student-id' }
    : null

  if (!user && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        user = data.user
      }
    } catch {
      // Supabase unavailable
    }
  }

  const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
  const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(
    request.nextUrl.pathname
  )

  if (isStudentRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/student/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
