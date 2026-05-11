import { AnalyticsEvent } from '@/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ''

async function track(event: AnalyticsEvent): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      credentials: 'include',
    })
  } catch {
    // analytics must never break the UI
  }
}

export const analytics = {
  searchImpression(jobIds: string[], query: string) {
    return track({ event_type: 'search_impression', metadata: { job_ids: jobIds, query } })
  },
  jobClick(jobId: string) {
    return track({ event_type: 'job_click', job_id: jobId })
  },
  applyClick(jobId: string) {
    return track({ event_type: 'apply_click', job_id: jobId })
  },
  viewDuration(jobId: string, durationMs: number) {
    return track({ event_type: 'view_duration', job_id: jobId, metadata: { duration_ms: durationMs } })
  },
  searchQuery(query: string, resultCount: number) {
    return track({ event_type: 'search_query', metadata: { query, result_count: resultCount } })
  },
  alertCreation(alertConfig: Record<string, unknown>) {
    return track({ event_type: 'alert_creation', metadata: alertConfig })
  },
}
