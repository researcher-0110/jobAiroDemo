'use client'
import { Job } from '@/types'
import { JobCard } from './JobCard'

interface JobListProps {
  jobs: Job[]
  loading: boolean
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
  emptyMessage?: string
  onAction?: () => void
}

function JobCardSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
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
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
      </div>
      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-7 w-16 rounded ml-auto" />
        <div className="skeleton h-7 w-20 rounded" />
      </div>
    </div>
  )
}

export function JobList({
  jobs,
  loading,
  total,
  page,
  perPage,
  onPageChange,
  emptyMessage = 'No jobs found.',
  onAction,
}: JobListProps) {
  const totalPages = Math.ceil(total / perPage)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading jobs">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4" aria-hidden="true">🔍</span>
        <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        role="list"
        aria-label="Job listings"
      >
        {jobs.map((job) => (
          <div key={job.id} role="listitem">
            <JobCard job={job} onAction={onAction} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-2 mt-8"
          aria-label="Pagination"
        >
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevPage}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={[
                    'min-w-[2rem] h-8 rounded text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800',
                  ].join(' ')}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
            aria-label="Next page"
          >
            Next →
          </button>
        </nav>
      )}

      {/* Page info */}
      {total > 0 && (
        <p className="text-center text-xs text-slate-400 dark:text-zinc-500 mt-3">
          Page {page} of {totalPages} ({total.toLocaleString()} jobs)
        </p>
      )}
    </div>
  )
}
