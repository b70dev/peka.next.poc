import * as React from 'react'

interface VisuallyHiddenProps {
  children: React.ReactNode
  /**
   * If true, the element will be rendered as a span.
   * Otherwise, it will be rendered as the specified element.
   */
  asChild?: boolean
}

/**
 * VisuallyHidden component for screen reader only content.
 * Visually hides content while keeping it accessible to assistive technologies.
 */
export function VisuallyHidden({ children, asChild }: VisuallyHiddenProps) {
  const Comp = asChild ? React.Fragment : 'span'

  if (asChild) {
    return <>{children}</>
  }

  return (
    <span className="sr-only">
      {children}
    </span>
  )
}
