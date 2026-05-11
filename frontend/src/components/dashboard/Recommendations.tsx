'use client'
import { useEffect, useState } from 'react'
import { Job } from '@/types'
import { JobCard } from '@/components/jobs/JobCard'
import { createClient } from '@/lib/supabase/client'

interface RecommendationsProps {
  userId: string
}

export function Recommendations({ userId }: RecommendationsProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function loadRecommendations() {
      setLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/recommendations`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            credentials: 'include',
          }
        )

        if (!res.ok) {
          throw new Error(`Failed to load recommendations (${res.status})`)
        }

        const data = await res.json()
        setJobs(data.jobs ?? data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [userId])

  if (loading) {
    return (
      <div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
          Finding jobs matched to your profile…
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl mb-4 block" aria-hidden="true">✨</span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-50 mb-2">
          No recommendations yet
        </h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
          Complete your profile and search for some jobs to get personalised recommendations.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4">
        <span className="font-semibold text-slate-900 dark:text-zinc-100">{jobs.length}</span> jobs matched to your profile
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}
