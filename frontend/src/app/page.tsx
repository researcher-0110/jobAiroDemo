'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useState } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { JobFilters } from '@/components/jobs/JobFilters'
import { JobList } from '@/components/jobs/JobList'
import { useJobs } from '@/hooks/useJobs'
import { JobFilters as JobFiltersType } from '@/types'

export default function HomePage() {
  const { jobs, total, page, loading, error, filters, search, setPage } = useJobs()
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(
    (keyword: string, location: string) => {
      setHasSearched(true)
      search({ ...filters, keyword, location }, 1)
    },
    [filters, search]
  )

  const handleFilterChange = useCallback(
    (newFilters: Partial<JobFiltersType>) => {
      const merged = { ...filters, ...newFilters }
      if (hasSearched) {
        search(merged, 1)
      }
    },
    [filters, hasSearched, search]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage)
      search(filters, newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [filters, search, setPage]
  )

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-zinc-50 mb-4 tracking-tight">
            Find Your Next{' '}
            <span className="text-indigo-600 dark:text-indigo-400">Dream Job</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
            Thousands of jobs aggregated from top companies, updated in real time. No duplicates, no spam.
          </p>
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>
      </section>

      {/* Results section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="sticky top-4">
              <JobFilters onChange={handleFilterChange} currentFilters={filters} />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {hasSearched && !loading && !error && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-zinc-400">
                  {total > 0 ? (
                    <>
                      Showing <span className="font-semibold text-slate-900 dark:text-zinc-100">{jobs.length}</span> of{' '}
                      <span className="font-semibold text-slate-900 dark:text-zinc-100">{total.toLocaleString()}</span> jobs
                    </>
                  ) : (
                    'No jobs found'
                  )}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-4">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <JobList
              jobs={jobs}
              loading={loading}
              total={total}
              page={page}
              perPage={20}
              onPageChange={handlePageChange}
              emptyMessage={
                hasSearched
                  ? 'No jobs match your search. Try different keywords or filters.'
                  : 'Start searching to discover thousands of jobs.'
              }
            />
          </div>
        </div>
      </section>
    </div>
  )
}
