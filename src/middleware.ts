import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Get current user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const protectedPaths = ['/players', '/players/rate', '/admin', '/profile', '/teams']
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  )

  if (isProtected) {
    if (!session) {
      // Redirect to login if not logged in
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Check if user is approved
    const isApproved = session.user.user_metadata.is_approved
    // If is_approved is explicitly false (it might be undefined for old users, assume true or handle migration)
    // For this feature, we assume new users have it. Old users might need migration.
    // Let's assume undefined means approved (backward compatibility) or false (strict).
    // Given the requirement "when someone registers... has to confirm", it implies new users.
    // So undefined (old users) should probably be allowed.
    if (isApproved === false) {
       // Sign out or redirect to a pending page.
       // Since we can't easily sign out in middleware without redirecting to a route that signs out,
       // we'll redirect to login with a message.
       const url = new URL('/login', req.url)
       url.searchParams.set('error', 'pending_approval')
       return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: ['/', '/players/:path*', '/teams/:path*', '/admin/:path*', '/profile/:path*'],
}
