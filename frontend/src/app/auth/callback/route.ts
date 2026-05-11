import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure next is a relative path to prevent open redirects
      const safeNext = next.startsWith('/') ? next : '/'
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  // Auth error — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
