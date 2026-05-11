'use client'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleTheme() {
    const newIsDark = !isDark
    setIsDark(newIsDark)

    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="btn-ghost p-2 rounded-md"
        aria-label="Toggle theme"
        disabled
      >
        <span className="text-lg" aria-hidden="true">☀</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost p-2 rounded-md transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {isDark ? '☀' : '☾'}
      </span>
    </button>
  )
}
