'use client'
import { useEffect, useRef, useCallback } from 'react'
import { Job } from '@/types'
import { analytics } from '@/lib/analytics'
import { formatDistanceToNow } from '@/lib/utils/date'
import { formatSalary } from '@/lib/utils/format'

interface JobModalProps {
  job: Job
  onClose: () => void
  onApply: () => void
}

export function JobModal({ job, onClose, onApply }: JobModalProps) {
  const openedAtRef = useRef<number>(Date.now())
  const backdropRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    const durationMs = Date.now() - openedAtRef.current
    analytics.viewDuration(job.id, durationMs)
    onClose()
  }, [job.id, onClose])

  // ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Prevent scroll on body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) handleClose()
  }

  const typeColors: Record<Job['type'], string> = {
    'full-time': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'part-time': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    contract: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    remote: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-700 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[job.type]}`}
              >
                {job.type}
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500">via {job.ats_source}</span>
            </div>
            <h2
              id="modal-title"
              className="text-xl font-bold text-slate-900 dark:text-zinc-50 leading-tight"
            >
              {job.title}
            </h2>
            <p className="mt-1 text-base text-slate-600 dark:text-zinc-400 font-medium">
              {job.company}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 px-6 py-3 bg-slate-50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
          <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
            <span aria-hidden="true">📍</span>
            {job.location}
          </span>
          {(job.salary_min || job.salary_max) && (
            <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
              <span aria-hidden="true">💰</span>
              {formatSalary(job.salary_min, job.salary_max)}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-400">
            <span aria-hidden="true">🕒</span>
            Posted {formatDistanceToNow(job.posted_at)}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wide mb-3">
            Job Description
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {job.description.split('\n').map((paragraph, i) =>
              paragraph.trim() ? (
                <p key={i} className="text-slate-700 dark:text-zinc-300 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ) : null
            )}
          </div>
        </div>

        {/* Footer / actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <a
              href={job.board_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs"
              onClick={() => analytics.jobClick(job.id)}
            >
              View on {job.ats_source} ↗
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="btn-secondary text-sm">
              Close
            </button>
            <button
              onClick={() => {
                onApply()
                handleClose()
              }}
              className="btn-primary text-sm"
            >
              Apply Now ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
