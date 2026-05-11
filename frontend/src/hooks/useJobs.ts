'use client'
import { useState, useCallback } from 'react'
import { Job, JobFilters } from '@/types'
import { fetchJobs, JobsResponse } from '@/lib/api/jobs'
import { analytics } from '@/lib/analytics'

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Partial<JobFilters>>({})

  const search = useCallback(async (newFilters: Partial<JobFilters>, newPage = 1) => {
    setLoading(true)
    setError(null)
    setFilters(newFilters)
    setPage(newPage)
    try {
      const data: JobsResponse = await fetchJobs(newFilters, newPage)
      setJobs(data.jobs)
      setTotal(data.total)
      analytics.searchImpression(data.jobs.map((j) => j.id), newFilters.keyword ?? '')
      if (newFilters.keyword) analytics.searchQuery(newFilters.keyword, data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
      setJobs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  return { jobs, total, page, loading, error, filters, search, setPage }
}
