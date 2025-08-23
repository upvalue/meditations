import type { ReactNode } from 'react'

interface CopyLayoutProps {
  statusCode?: string
  title: string
  subtitle?: string
  primaryAction: {
    text: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    text: string
    href: string
  }
  children?: ReactNode
}

export default function CopyLayout({
  statusCode,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  children,
}: CopyLayoutProps) {
  return (
    <>
      <main className="grid min-h-full place-items-center bg-zinc-50 px-6 py-24 sm:py-32 lg:px-8 dark:bg-zinc-900">
        <div className="text-center">
          {statusCode && (
            <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
              {statusCode}
            </p>
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-7xl dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 text-lg font-medium text-pretty text-zinc-600 sm:text-xl/8 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
          {children && (
            <div className="mt-6 flex justify-center">{children}</div>
          )}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {primaryAction.onClick ? (
              <button
                onClick={primaryAction.onClick}
                className="rounded-md cursor-pointer bg-emerald-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus-visible:outline-emerald-500"
              >
                {primaryAction.text}
              </button>
            ) : (
              <a
                href={primaryAction.href}
                className="rounded-md cursor-pointer bg-emerald-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus-visible:outline-emerald-500"
              >
                {primaryAction.text}
              </a>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="text-sm font-semibold text-zinc-900 dark:text-white"
              >
                {secondaryAction.text} <span aria-hidden="true">&rarr;</span>
              </a>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
