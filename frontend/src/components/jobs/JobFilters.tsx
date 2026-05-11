'use client'
import { useCallback } from 'react'
import { JobFilters as JobFiltersType } from '@/types'

interface JobFiltersProps {
  onChange: (filters: Partial<JobFiltersType>) => void
  currentFilters: Partial<JobFiltersType>
}

const JOB_TYPES = [
  { value: '', label: 'All types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'date', label: 'Most recent' },
  { value: 'salary', label: 'Highest salary' },
]

const POSTED_AFTER_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '1d', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const SALARY_PRESETS = [
  { value: undefined, label: 'Any salary' },
  { value: 50000, label: '$50k+' },
  { value: 75000, label: '$75k+' },
  { value: 100000, label: '$100k+' },
  { value: 150000, label: '$150k+' },
]

export function JobFilters({ onChange, currentFilters }: JobFiltersProps) {
  const update = useCallback(
    (partial: Partial<JobFiltersType>) => {
      onChange({ ...currentFilters, ...partial })
    },
    [onChange, currentFilters]
  )

  function handleReset() {
    onChange({})
  }

  const hasActiveFilters =
    currentFilters.type ||
    currentFilters.salary_min ||
    currentFilters.posted_after ||
    (currentFilters.sort_by && currentFilters.sort_by !== 'relevance')

  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Sort by */}
      <fieldset>
        <legend className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Sort by
        </legend>
        <select
          value={currentFilters.sort_by ?? 'relevance'}
          onChange={(e) => update({ sort_by: e.target.value as JobFiltersType['sort_by'] })}
          className="input-field text-sm"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Job type */}
      <fieldset>
        <legend className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Job type
        </legend>
        <div className="space-y-1.5">
          {JOB_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="job-type"
                value={t.value}
                checked={(currentFilters.type ?? '') === t.value}
                onChange={() => update({ type: t.value || undefined })}
                className="text-indigo-600 focus:ring-indigo-500 rounded-full"
              />
              <span className="text-sm text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 transition-colors">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Minimum salary */}
      <fieldset>
        <legend className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Minimum salary
        </legend>
        <div className="space-y-1.5">
          {SALARY_PRESETS.map((p) => (
            <label key={p.value ?? 'any'} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="salary-min"
                value={p.value ?? ''}
                checked={(currentFilters.salary_min ?? undefined) === p.value}
                onChange={() => update({ salary_min: p.value })}
                className="text-indigo-600 focus:ring-indigo-500 rounded-full"
              />
              <span className="text-sm text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 transition-colors">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Date posted */}
      <fieldset>
        <legend className="block text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Date posted
        </legend>
        <div className="space-y-1.5">
          {POSTED_AFTER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="posted-after"
                value={opt.value}
                checked={(currentFilters.posted_after ?? '') === opt.value}
                onChange={() => update({ posted_after: opt.value || undefined })}
                className="text-indigo-600 focus:ring-indigo-500 rounded-full"
              />
              <span className="text-sm text-slate-700 dark:text-zinc-300 group-hover:text-slate-900 dark:group-hover:text-zinc-100 transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
