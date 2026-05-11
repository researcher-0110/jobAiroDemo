import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Retrieve access token for the authenticated backend call
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delegate actual deletion to the backend (which uses the service role key)
  const res = await fetch(`${process.env.BACKEND_URL}/api/v1/users/me`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Backend delete failed:', res.status, body)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
