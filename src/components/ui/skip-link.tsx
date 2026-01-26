'use client'

import { useTranslations } from 'next-intl'

interface SkipLinkProps {
  href?: string
  children?: React.ReactNode
}

export function SkipLink({ href = '#main-content', children }: SkipLinkProps) {
  const t = useTranslations('accessibility')

  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:p-4 focus:border focus:border-border focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {children || t('skipToMain')}
    </a>
  )
}
