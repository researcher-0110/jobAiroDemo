'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Job } from '@/types'
import { analytics } from '@/lib/analytics'
import { performJobAction } from '@/lib/api/jobs'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from '@/lib/utils/date'
import { formatSalary } from '@/lib/utils/format'

interface JobDetailClientProps {
  job: Job
}

export function JobDetailClient({ job }: JobDetailClientProps) {
  const { user } = useAuth()
  const openedAtRef = useRef<number>(Date.now())
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Track view duration on unmount
  useEffect(() => {
    return () => {
      const durationMs = Date.now() - openedAtRef.current
      analytics.viewDuration(job.id, durationMs)
    }
  }, [job.id])

  async function handleApply() {
    analytics.applyClick(job.id)
    if (user) {
      const { data: { session } } = await createClient().auth.getSession()
      if (session?.access_token) {
        performJobAction(job.id, 'apply', session.access_token).catch(() => {})
      }
    }
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }

  async function handleSave() {
    if (!user) { window.location.href = '/login'; return }
    const { data: { session } } = await createClient().auth.getSession()
    if (!session?.access_token) return
    await performJobAction(job.id, 'save', session.access_token)
    setSaved(true)
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const typeColors: Record<Job['type'], string> = {
    'full-time': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'part-time': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    remote: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
          <li><Link href="/" className="hover:text-slate-900 dark:hover:text-zinc-100">Jobs</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-900 dark:text-zinc-100 truncate max-w-xs">{job.title}</li>
        </ol>
      </nav>

      <div className="card p-8">
        {/* Title block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[job.type]}`}>
                {job.type}
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500">via {job.ats_source}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 leading-tight">
              {job.title}
            </h1>
            <p className="mt-1 text-lg text-slate-600 dark:text-zinc-400 font-medium">{job.company}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleSave}
              className={`btn-secondary text-sm ${saved ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
            >
              {saved ? '🔖 Saved' : '🔖 Save'}
            </button>
            <button onClick={handleShare} className="btn-secondary text-sm">
              {copied ? '✓ Copied' : '🔗 Share'}
            </button>
            <button onClick={handleApply} className="btn-primary text-sm">
              Apply Now ↗
            </button>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-zinc-950/50 mb-8">
          <div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Location</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">{job.location}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Salary</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">
              {job.salary_min || job.salary_max ? formatSalary(job.salary_min, job.salary_max) : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Posted</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-zinc-100">
              {formatDistanceToNow(job.posted_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Source</p>
            <a
              href={job.board_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline block"
            >
              {job.ats_source} ↗
            </a>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50 mb-4">Job Description</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {job.description.split('\n').map((paragraph, i) =>
              paragraph.trim() ? (
                <p key={i} className="text-slate-700 dark:text-zinc-300 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ) : null
            )}
          </div>
        </div>

        {/* Apply CTA */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Application managed by{' '}
            <a href={job.board_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {job.ats_source}
            </a>
          </p>
          <button onClick={handleApply} className="btn-primary">
            Apply for this role ↗
          </button>
        </div>
      </div>
    </div>
  )
}
