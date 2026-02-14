'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { UserRole } from '@/lib/auth/roles'

interface RoleBadgeProps {
  role: UserRole
  showTooltip?: boolean
  className?: string
}

const ROLE_VARIANT_MAP: Record<UserRole, { variant: 'destructive' | 'default' | 'secondary'; className: string }> = {
  super_admin: { variant: 'destructive', className: '' },
  admin: { variant: 'default', className: '' },
  viewer: { variant: 'secondary', className: '' },
}

export function RoleBadge({ role, showTooltip = true, className }: RoleBadgeProps) {
  const tRoles = useTranslations('roles')

  const { variant, className: variantClassName } = ROLE_VARIANT_MAP[role] ?? ROLE_VARIANT_MAP.viewer

  const badge = (
    <Badge
      variant={variant}
      className={`${variantClassName} ${className ?? ''}`}
    >
      {tRoles(role)}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tRoles(`description.${role}`)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
