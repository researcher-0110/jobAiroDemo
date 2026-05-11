/**
 * Format a salary range into a human-readable string.
 * e.g. formatSalary(80000, 120000) → "$80k – $120k"
 *      formatSalary(100000, undefined) → "$100k+"
 *      formatSalary(undefined, 150000) → "Up to $150k"
 */
export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Salary not specified'

  const fmt = (n: number): string => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
    return `$${n.toLocaleString()}`
  }

  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  if (max) return `Up to ${fmt(max)}`
  return 'Salary not specified'
}

/**
 * Merge Tailwind class names safely (simple version without tailwind-merge).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
