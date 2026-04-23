// =============================================================
// PROJ-4: Shared role types and constants
// This file is safe to import from both client and server code.
// =============================================================

/**
 * Valid user roles in hierarchical order.
 * super_admin > admin > viewer
 */
export const USER_ROLES = ['super_admin', 'admin', 'viewer'] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Role hierarchy levels for comparison.
 * Higher number = more permissions.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 3,
  admin: 2,
  viewer: 1,
}

/**
 * Permission definitions based on roles.
 * Maps feature areas to the minimum role required.
 */
export const PERMISSIONS = {
  // User management
  'users.manage': 'super_admin',
  'users.view_audit_log': 'super_admin',

  // Data management (CRUD)
  'insured.create': 'admin',
  'insured.edit': 'admin',
  'employers.create': 'admin',
  'employers.edit': 'admin',
  'contribution_rates.edit': 'admin',
  'accounts.manage': 'admin',
  'transactions.create': 'admin',
  'payment_orders.create': 'admin',
  'payment_orders.edit': 'admin',
  'zas.manage': 'admin',

  // Read-only access
  'insured.view': 'viewer',
  'employers.view': 'viewer',
  'accounts.view': 'viewer',
  'reports.view': 'viewer',
  'excel.export': 'viewer',
  'profile.edit_own': 'viewer',

  // System settings
  'settings.system': 'super_admin',
} as const satisfies Record<string, UserRole>

export type Permission = keyof typeof PERMISSIONS

/**
 * Checks if a role meets or exceeds the minimum required role.
 * Pure function - no database access.
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Checks if a role has a specific permission.
 * Pure function - no database access.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const requiredRole = PERMISSIONS[permission]
  return hasMinimumRole(role, requiredRole)
}
