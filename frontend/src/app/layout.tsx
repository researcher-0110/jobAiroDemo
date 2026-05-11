import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { NavBar } from '@/components/ui/NavBar'

export const metadata: Metadata = {
  title: {
    default: 'JobAiro — Find Your Next Role',
    template: '%s | JobAiro',
  },
  description: 'Search thousands of jobs aggregated from top ATS sources in real time.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://jobairo.com'),
  openGraph: {
    siteName: 'JobAiro',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 antialiased">
        <ThemeProvider>
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 dark:border-zinc-800 py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  &copy; {new Date().getFullYear()} JobAiro. All rights reserved.
                </p>
                <nav className="flex gap-6">
                  <a href="/privacy" className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors">
                    Privacy
                  </a>
                  <a href="/terms" className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors">
                    Terms
                  </a>
                  <a href="/contact" className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors">
                    Contact
                  </a>
                </nav>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
