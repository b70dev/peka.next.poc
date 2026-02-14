'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole, Permission } from '@/lib/auth/roles'
import { USER_ROLES, PERMISSIONS, ROLE_HIERARCHY } from '@/lib/auth/roles'

// =============================================================
// PROJ-4: Client-side permissions hook
// =============================================================

interface UsePermissionsReturn {
  /** The current user's role, or null if loading/not authenticated */
  role: UserRole | null
  /** Whether the permissions are still loading */
  isLoading: boolean
  /** Whether the user is authenticated and active */
  isAuthenticated: boolean
  /** Check if user has at least the given role */
  hasMinimumRole: (minimumRole: UserRole) => boolean
  /** Check if user has a specific permission */
  hasPermission: (permission: Permission) => boolean
  /** Whether the user is a super admin */
  isSuperAdmin: boolean
  /** Whether the user is at least an admin */
  isAdmin: boolean
  /** Whether the user is a viewer (lowest role) */
  isViewer: boolean
  /** Refresh permissions from the database */
  refresh: () => Promise<void>
}

/**
 * Client-side hook for checking user permissions.
 * Fetches the user's role from the database and provides
 * helper methods for permission checks.
 *
 * This hook reads from the database on mount and can be
 * refreshed manually. It does NOT poll automatically.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { role, hasPermission, isLoading } = usePermissions()
 *
 *   if (isLoading) return <Spinner />
 *
 *   return (
 *     <>
 *       {hasPermission('insured.create') && (
 *         <Button>Create Insured Person</Button>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchRole = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setRole(null)
        setIsAuthenticated(false)
        return
      }

      // Fetch user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setRole(null)
        setIsAuthenticated(false)
        return
      }

      if (!profile.is_active) {
        setRole(null)
        setIsAuthenticated(false)
        return
      }

      const userRole = profile.role as UserRole
      if (USER_ROLES.includes(userRole)) {
        setRole(userRole)
        setIsAuthenticated(true)
      } else {
        setRole(null)
        setIsAuthenticated(false)
      }
    } catch {
      setRole(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRole()
  }, [fetchRole])

  const hasMinimumRoleFn = useCallback(
    (minimumRole: UserRole): boolean => {
      if (!role) return false
      return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole]
    },
    [role]
  )

  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      if (!role) return false
      const requiredRole = PERMISSIONS[permission]
      return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole]
    },
    [role]
  )

  return {
    role,
    isLoading,
    isAuthenticated,
    hasMinimumRole: hasMinimumRoleFn,
    hasPermission: hasPermissionFn,
    isSuperAdmin: role === 'super_admin',
    isAdmin: hasMinimumRoleFn('admin'),
    isViewer: role !== null,
    refresh: fetchRole,
  }
}
