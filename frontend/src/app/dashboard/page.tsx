'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Recommendations } from '@/components/dashboard/Recommendations'
import { JobCard } from '@/components/jobs/JobCard'
import { Job } from '@/types'
import { createClient } from '@/lib/supabase/client'

type Tab = 'recommendations' | 'saved' | 'applied' | 'hidden'

interface SavedJobRecord {
  job_id: string
  action: string
  created_at: string
  jobs: Job
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('recommendations')
  const [savedJobs, setSavedJobs] = useState<Job[]>([])
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([])
  const [hiddenJobs, setHiddenJobs] = useState<Job[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const supabase = createClient()

  const loadUserJobs = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    try {
      const { data } = await supabase
        .from('user_job_actions')
        .select('job_id, action, created_at, jobs(*)')
        .eq('user_id', user.id)
        .in('action', ['save', 'apply', 'hide'])
        .order('created_at', { ascending: false })

      if (data) {
        const records = data as unknown as SavedJobRecord[]
        setSavedJobs(records.filter((r) => r.action === 'save').map((r) => r.jobs))
        setAppliedJobs(records.filter((r) => r.action === 'apply').map((r) => r.jobs))
        setHiddenJobs(records.filter((r) => r.action === 'hide').map((r) => r.jobs))
      }
    } finally {
      setDataLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadUserJobs()
    }
  }, [user, loadUserJobs])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'saved', label: 'Saved', count: savedJobs.length },
    { id: 'applied', label: 'Applied', count: appliedJobs.length },
    { id: 'hidden', label: 'Hidden', count: hiddenJobs.length },
  ]

  const tabJobMap: Record<Exclude<Tab, 'recommendations'>, Job[]> = {
    saved: savedJobs,
    applied: appliedJobs,
    hidden: hiddenJobs,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Welcome back, {user.email}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-zinc-800 mb-8">
        <nav className="-mb-px flex gap-6" aria-label="Dashboard tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-zinc-600',
              ].join(' ')}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'recommendations' && (
        <Recommendations userId={user.id} />
      )}

      {activeTab !== 'recommendations' && (
        <div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-8 w-full" />
                </div>
              ))}
            </div>
          ) : tabJobMap[activeTab as Exclude<Tab, 'recommendations'>].length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 dark:text-zinc-400 text-sm">
                {activeTab === 'saved' && 'No saved jobs yet. Bookmark jobs to see them here.'}
                {activeTab === 'applied' && 'No applied jobs yet.'}
                {activeTab === 'hidden' && 'No hidden jobs.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabJobMap[activeTab as Exclude<Tab, 'recommendations'>].map((job) => (
                <JobCard key={job.id} job={job} onAction={loadUserJobs} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
