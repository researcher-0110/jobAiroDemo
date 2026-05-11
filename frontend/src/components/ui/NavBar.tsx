'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { createClient } from '@/lib/supabase/client'

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isAdmin =
    user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Jobs' },
    ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-slate-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity"
            aria-label="JobAiro home"
          >
            <span aria-hidden="true">✈</span>
            JobAiro
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {loading ? (
              <div className="h-8 w-20 skeleton rounded-md" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-medium flex-shrink-0" aria-hidden="true">
                    {user.email?.[0].toUpperCase() ?? 'U'}
                  </span>
                  <span className="hidden md:block max-w-[120px] truncate">{user.email}</span>
                  <span aria-hidden="true" className="text-slate-400">▾</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-zinc-900 shadow-lg border border-slate-200 dark:border-zinc-700 z-20 py-1"
                      role="menu"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800">
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        onClick={() => setUserMenuOpen(false)}
                        role="menuitem"
                      >
                        Dashboard
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                          onClick={() => setUserMenuOpen(false)}
                          role="menuitem"
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => { setUserMenuOpen(false); handleSignOut() }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-ghost text-sm px-3 py-1.5">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary text-sm px-3 py-1.5">
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="sm:hidden btn-ghost p-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                'block px-3 py-2 rounded-md text-sm font-medium',
                pathname === link.href
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800',
              ].join(' ')}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
