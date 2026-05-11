import { Job, JobFilters } from '@/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''

export interface JobsResponse {
  jobs: Job[]
  total: number
  page: number
  per_page: number
}

export async function fetchJobs(filters: Partial<JobFilters>, page = 1): Promise<JobsResponse> {
  const params = new URLSearchParams()
  if (filters.keyword) params.set('keyword', filters.keyword)
  if (filters.location) params.set('location', filters.location)
  if (filters.type) params.set('type', filters.type)
  if (filters.salary_min) params.set('salary_min', String(filters.salary_min))
  if (filters.posted_after) params.set('posted_after', filters.posted_after)
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  params.set('page', String(page))

  const res = await fetch(`${BACKEND_URL}/api/v1/jobs?${params.toString()}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${BACKEND_URL}/api/v1/jobs/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Job not found')
  return res.json()
}

export async function performJobAction(
  jobId: string,
  action: 'save' | 'hide' | 'apply' | 'report',
  token: string
): Promise<void> {
  await fetch(`${BACKEND_URL}/api/v1/jobs/${jobId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  })
}
