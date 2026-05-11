'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface AdminStats {
  total_jobs: number
  total_users: number
  jobs_today: number
  active_scrapers: number
  avg_jobs_per_day: number
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const isAdmin =
    user?.user_metadata?.role === 'admin' ||
    user?.app_metadata?.role === 'admin'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/admin')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user || !isAdmin) return

    async function loadStats() {
      setStatsLoading(true)
      setStatsError(null)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/stats`,
          { credentials: 'include' }
        )
        if (!res.ok) throw new Error('Failed to load stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setStatsError(err instanceof Error ? err.message : 'Error loading stats')
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [user, isAdmin])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 text-sm mb-6">
            You don&apos;t have permission to view this page. Admin role required.
          </p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            Go home
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Jobs', value: stats?.total_jobs, icon: '💼' },
    { label: 'Total Users', value: stats?.total_users, icon: '👥' },
    { label: 'Jobs Today', value: stats?.jobs_today, icon: '📅' },
    { label: 'Active Scrapers', value: stats?.active_scrapers, icon: '🤖' },
    { label: 'Avg Jobs / Day', value: stats?.avg_jobs_per_day, icon: '📈' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Admin Panel</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
            Logged in as {user.email}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
          Admin
        </span>
      </div>

      {statsError && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{statsError}</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{card.icon}</span>
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                {card.label}
              </p>
            </div>
            {statsLoading ? (
              <div className="skeleton h-7 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-zinc-50">
                {card.value !== undefined ? card.value.toLocaleString() : '—'}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50 mb-4">
            Scraper Control
          </h2>
          <div className="space-y-3">
            <button
              className="btn-primary w-full"
              onClick={() =>
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/scrapers/trigger`, {
                  method: 'POST',
                  credentials: 'include',
                })
              }
            >
              Trigger Manual Scrape
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() =>
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/jobs/deduplicate`, {
                  method: 'POST',
                  credentials: 'include',
                })
              }
            >
              Run Deduplication
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50 mb-4">
            Maintenance
          </h2>
          <div className="space-y-3">
            <button
              className="btn-secondary w-full"
              onClick={() =>
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/jobs/cleanup`, {
                  method: 'POST',
                  credentials: 'include',
                })
              }
            >
              Clean Up Expired Jobs
            </button>
            <button
              className="btn-danger w-full"
              onClick={() => {
                if (window.confirm('Clear all caches? This may temporarily slow the site.')) {
                  fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/admin/cache/clear`, {
                    method: 'POST',
                    credentials: 'include',
                  })
                }
              }}
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
