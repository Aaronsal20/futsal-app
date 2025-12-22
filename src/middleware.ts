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

  if (isProtected && !session) {
    // Redirect to login if not logged in
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/players/:path*', '/teams/:path*', '/admin/:path*', '/profile/:path*'],
}
