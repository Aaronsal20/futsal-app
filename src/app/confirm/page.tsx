'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        .then(({ error }) => {
          if (!error) {
            // ✅ Session is now stored in cookies/localStorage
            router.replace('/')
          } else {
            console.error('Session error:', error.message)
          }
        })
    }
  }, [router, searchParams])

  return <p>Confirming email... Please wait.</p>
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ConfirmContent />
    </Suspense>
  )
}
