'use client'
import { useState } from 'react'
import { Job } from '@/types'
import { analytics } from '@/lib/analytics'
import { performJobAction } from '@/lib/api/jobs'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { JobModal } from './JobModal'
import { formatDistanceToNow } from '@/lib/utils/date'
import { formatSalary } from '@/lib/utils/format'

interface JobCardProps {
  job: Job
  onAction?: () => void
}

type ActionState = 'idle' | 'loading' | 'done' | 'error'

export function JobCard({ job, onAction }: JobCardProps) {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})
  const [copied, setCopied] = useState(false)

  function setAction(action: string, state: ActionState) {
    setActionStates((prev) => ({ ...prev, [action]: state }))
  }

  async function handleAction(action: 'save' | 'hide' | 'apply' | 'report') {
    if (!user) {
      window.location.href = '/login'
      return
    }

    setAction(action, 'loading')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''
      await performJobAction(job.id, action, token)
      setAction(action, 'done')
      onAction?.()
    } catch {
      setAction(action, 'error')
      setTimeout(() => setAction(action, 'idle'), 2000)
    }
  }

  async function handleApplyClick() {
    analytics.applyClick(job.id)
    await handleAction('apply')
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }

  function handleCardClick() {
    analytics.jobClick(job.id)
    setModalOpen(true)
  }

  async function handleShare() {
    const url = `${window.location.origin}/jobs/${job.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  const typeColors: Record<Job['type'], string> = {
    'full-time': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'part-time': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    remote: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }

  return (
    <>
      <article
        className="card p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200 flex flex-col gap-3 cursor-pointer group"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        aria-label={`${job.title} at ${job.company}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50 text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {job.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-0.5 font-medium">
              {job.company}
            </p>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[job.type]}`}
          >
            {job.type}
          </span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <span aria-hidden="true">📍</span>
            {job.location}
          </span>
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">💰</span>
              {formatSalary(job.salary_min, job.salary_max)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <span aria-hidden="true">🕒</span>
            {formatDistanceToNow(job.posted_at)}
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true">🔗</span>
            {job.ats_source}
          </span>
        </div>

        {/* Description excerpt */}
        <p className="text-sm text-slate-600 dark:text-zinc-400 line-clamp-2">
          {job.description}
        </p>

        {/* Action buttons */}
        <div
          className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {/* Save */}
            <button
              onClick={() => handleAction('save')}
              disabled={actionStates['save'] === 'loading'}
              title={actionStates['save'] === 'done' ? 'Saved!' : 'Save job'}
              className={`btn-ghost px-2 py-1.5 text-xs gap-1 ${actionStates['save'] === 'done' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
              aria-label="Save job"
            >
              <span aria-hidden="true">{actionStates['save'] === 'done' ? '🔖' : '🔖'}</span>
              {actionStates['save'] === 'loading' ? '…' : actionStates['save'] === 'done' ? 'Saved' : 'Save'}
            </button>

            {/* Hide */}
            <button
              onClick={() => handleAction('hide')}
              disabled={actionStates['hide'] === 'loading'}
              title="Hide this job"
              className="btn-ghost px-2 py-1.5 text-xs gap-1"
              aria-label="Hide job"
            >
              <span aria-hidden="true">🙈</span>
              {actionStates['hide'] === 'loading' ? '…' : 'Hide'}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              title={copied ? 'Link copied!' : 'Copy link'}
              className={`btn-ghost px-2 py-1.5 text-xs gap-1 ${copied ? 'text-green-600 dark:text-green-400' : ''}`}
              aria-label="Copy job link"
            >
              <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
              {copied ? 'Copied' : 'Share'}
            </button>

            {/* Report */}
            <button
              onClick={() => handleAction('report')}
              disabled={actionStates['report'] === 'loading'}
              title="Report this job"
              className="btn-ghost px-2 py-1.5 text-xs gap-1"
              aria-label="Report job"
            >
              <span aria-hidden="true">🚩</span>
              {actionStates['report'] === 'loading' ? '…' : 'Report'}
            </button>
          </div>

          {/* Apply */}
          <button
            onClick={handleApplyClick}
            disabled={actionStates['apply'] === 'loading'}
            className="btn-primary px-3 py-1.5 text-xs flex-shrink-0"
            aria-label={`Apply to ${job.title}`}
          >
            {actionStates['apply'] === 'loading' ? '…' : 'Apply ↗'}
          </button>
        </div>
      </article>

      {modalOpen && (
        <JobModal
          job={job}
          onClose={() => setModalOpen(false)}
          onApply={handleApplyClick}
        />
      )}
    </>
  )
}
