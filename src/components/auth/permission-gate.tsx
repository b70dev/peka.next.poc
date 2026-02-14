'use client'

import { usePermissions } from '@/hooks/use-permissions'
import type { Permission } from '@/lib/auth/roles'

interface PermissionGateProps {
  /** The permission required to show the children */
  permission: Permission
  /** Content to show when user has the permission */
  children: React.ReactNode
  /** Optional fallback to show when permission is denied (default: nothing) */
  fallback?: React.ReactNode
}

/**
 * Client component that conditionally renders children based on the user's permission.
 * Uses the usePermissions hook to check the user's role against the required permission.
 *
 * Buttons/links for write actions are hidden (not disabled) per spec:
 * "Buttons/Links fuer unerlaubte Aktionen sind ausgeblendet (nicht nur disabled)"
 *
 * @example
 * ```tsx
 * <PermissionGate permission="insured.create">
 *   <CreateInsuredPersonDialog />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { hasPermission, isLoading } = usePermissions()

  // While loading, don't show anything to avoid flicker
  if (isLoading) {
    return fallback ?? null
  }

  if (!hasPermission(permission)) {
    return fallback ?? null
  }

  return <>{children}</>
}
