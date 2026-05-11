export interface Job {
  id: string
  title: string
  company: string
  location: string
  type: 'full-time' | 'part-time' | 'contract' | 'remote'
  salary_min?: number
  salary_max?: number
  description: string
  apply_url: string
  ats_source: string
  board_url: string
  posted_at: string
  created_at: string
}

export interface JobFilters {
  keyword: string
  location: string
  type?: string
  salary_min?: number
  posted_after?: string
  sort_by: 'relevance' | 'date' | 'salary'
}

export interface UserJobAction {
  job_id: string
  action: 'save' | 'hide' | 'apply' | 'report'
}

export type AnalyticsEventType =
  | 'search_impression'
  | 'job_click'
  | 'apply_click'
  | 'view_duration'
  | 'search_query'
  | 'alert_creation'

export interface AnalyticsEvent {
  event_type: AnalyticsEventType
  job_id?: string
  metadata?: Record<string, unknown>
}
