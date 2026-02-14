import { createClient } from '@/lib/supabase/server'

// =============================================================
// PROJ-4: Role-based access control helpers (Server-side)
// =============================================================

// Re-export shared types and constants from roles.ts
// so existing imports continue to work
export {
  USER_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasMinimumRole,
  hasPermission,
} from './roles'
export type { UserRole, Permission } from './roles'

import { USER_ROLES, ROLE_HIERARCHY, type UserRole } from './roles'

/**
 * Result of getCurrentUserRole().
 * Returns the user's role and profile data, or an error.
 */
export interface UserRoleResult {
  userId: string
  email: string
  role: UserRole
  isActive: boolean
  fullName: string | null
}

/**
 * Error returned when role check fails.
 */
export interface RoleError {
  error: string
  status: 401 | 403 | 423
}

/**
 * Gets the current authenticated user's role and profile from the database.
 * This always reads from the database (no caching) to ensure role changes
 * take effect immediately.
 *
 * @returns UserRoleResult on success, or RoleError on failure
 */
export async function getCurrentUserRole(): Promise<
  { data: UserRoleResult; error: null } | { data: null; error: RoleError }
> {
  const supabase = await createClient()

  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      data: null,
      error: { error: 'Not authenticated', status: 401 },
    }
  }

  // 2. Fetch user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, role, is_active, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      data: null,
      error: { error: 'User profile not found', status: 401 },
    }
  }

  // 3. Check if user is active
  if (!profile.is_active) {
    // Sign out deactivated users
    await supabase.auth.signOut()
    return {
      data: null,
      error: { error: 'Account deactivated', status: 423 },
    }
  }

  // 4. Validate role
  const role = profile.role as UserRole
  if (!USER_ROLES.includes(role)) {
    return {
      data: null,
      error: { error: 'Invalid user role', status: 403 },
    }
  }

  return {
    data: {
      userId: profile.id,
      email: profile.email ?? user.email ?? '',
      role,
      isActive: profile.is_active,
      fullName: profile.full_name,
    },
    error: null,
  }
}

/**
 * Checks if the current user has (at least) the required role.
 * Uses hierarchical comparison: super_admin > admin > viewer.
 *
 * @param minimumRole - The minimum role required to proceed
 * @returns The user's role data on success, or RoleError on failure
 *
 * @example
 * ```ts
 * // In a Server Action:
 * const { data: currentUser, error } = await requireRole('super_admin')
 * if (error) {
 *   return { error: error.error }
 * }
 * // currentUser is guaranteed to be super_admin
 * ```
 */
export async function requireRole(minimumRole: UserRole): Promise<
  { data: UserRoleResult; error: null } | { data: null; error: RoleError }
> {
  const result = await getCurrentUserRole()

  if (result.error) {
    return result
  }

  const userLevel = ROLE_HIERARCHY[result.data.role]
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    return {
      data: null,
      error: {
        error: 'Insufficient permissions',
        status: 403,
      },
    }
  }

  return result
}
