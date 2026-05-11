'use client'
import { useState, FormEvent, KeyboardEvent } from 'react'

interface SearchBarProps {
  onSearch: (keyword: string, location: string) => void
  loading?: boolean
  initialKeyword?: string
  initialLocation?: string
}

export function SearchBar({ onSearch, loading, initialKeyword = '', initialLocation = '' }: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword)
  const [location, setLocation] = useState(initialLocation)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch(keyword.trim(), location.trim())
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onSearch(keyword.trim(), location.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto" role="search">
      <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 p-2">
        {/* Keyword input */}
        <div className="flex-1 flex items-center gap-2 px-3">
          <svg
            className="h-5 w-5 text-slate-400 dark:text-zinc-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Job title, keyword, or company"
            className="flex-1 bg-transparent py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
            aria-label="Search keyword"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Clear keyword"
            >
              ✕
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-slate-200 dark:bg-zinc-700 self-stretch" />

        {/* Location input */}
        <div className="flex-1 flex items-center gap-2 px-3">
          <svg
            className="h-5 w-5 text-slate-400 dark:text-zinc-500 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="City, state, or remote"
            className="flex-1 bg-transparent py-2 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
            aria-label="Location"
          />
          {location && (
            <button
              type="button"
              onClick={() => setLocation('')}
              className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label="Clear location"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary sm:px-6 whitespace-nowrap"
          aria-label="Search jobs"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Searching…
            </span>
          ) : (
            'Search Jobs'
          )}
        </button>
      </div>
    </form>
  )
}
