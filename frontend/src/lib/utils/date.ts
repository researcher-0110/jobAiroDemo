/**
 * Returns a human-readable relative time string, e.g. "3 days ago".
 * Works without any date library dependency.
 */
export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (isNaN(diffMs)) return 'Unknown date'

  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffWeeks === 1) return '1 week ago'
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`
  if (diffYears === 1) return '1 year ago'
  return `${diffYears} years ago`
}

/**
 * Format a date string to a locale date, e.g. "Jan 10, 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
