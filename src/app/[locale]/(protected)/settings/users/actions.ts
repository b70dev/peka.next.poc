'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, USER_ROLES, type UserRole } from '@/lib/auth/require-role'

// =============================================================
// PROJ-4: User Management Server Actions
// Only accessible by Super-Admins
// =============================================================

// =============================================================
// Zod Schemas
// =============================================================

const ChangeRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  newRole: z.enum(['super_admin', 'admin', 'viewer'], {
    message: 'Invalid role. Must be super_admin, admin, or viewer',
  }),
  mfaCode: z.string().min(6, 'MFA code is required'),
})

const DeactivateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  reason: z.string().max(500, 'Reason must be at most 500 characters').optional(),
})

const ActivateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
})

const GetAuditLogSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
})

// =============================================================
// Types
// =============================================================

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  actor_id: string
  target_user_id: string
  action: 'role_change' | 'activate' | 'deactivate'
  old_role: string | null
  new_role: string | null
  reason: string | null
  created_at: string
  actor_name: string | null
  actor_email: string | null
}

// =============================================================
// Helper: Verify MFA code
// =============================================================

async function verifyMfaCode(mfaCode: string): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createClient()

  // Get TOTP factor
  const { data: factorsData } = await supabase.auth.mfa.listFactors()
  const totpFactor = factorsData?.totp?.[0]

  if (!totpFactor) {
    return { valid: false, error: 'MFA not configured. Please set up MFA first.' }
  }

  // Create challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  })

  if (challengeError || !challengeData) {
    return { valid: false, error: 'Failed to create MFA challenge' }
  }

  // Verify the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challengeData.id,
    code: mfaCode,
  })

  if (verifyError) {
    return { valid: false, error: 'Invalid MFA code' }
  }

  return { valid: true }
}

// =============================================================
// Server Actions
// =============================================================

/**
 * Get all users with their roles and status.
 * Only accessible by Super-Admins.
 */
export async function getAllUsers(): Promise<{
  users?: UserProfile[]
  error?: string
}> {
  const { data: currentUser, error: roleError } = await requireRole('super_admin')
  if (roleError) {
    return { error: roleError.error }
  }

  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, avatar_url, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching users:', error)
    return { error: 'Failed to load users' }
  }

  // Validate and map roles
  const mappedUsers: UserProfile[] = (users ?? []).map((user) => ({
    ...user,
    role: (USER_ROLES.includes(user.role as UserRole) ? user.role : 'viewer') as UserRole,
  }))

  // Suppress unused variable warning - currentUser is used for authorization
  void currentUser

  return { users: mappedUsers }
}

/**
 * Change a user's role.
 * Requires Super-Admin role and MFA verification.
 *
 * Rules:
 * - Cannot change own role
 * - Cannot demote the last super_admin
 * - MFA code must be valid
 */
export async function changeUserRole(
  userId: string,
  newRole: string,
  mfaCode: string
): Promise<{ success?: boolean; error?: string }> {
  // 1. Validate input
  const parseResult = ChangeRoleSchema.safeParse({ userId, newRole, mfaCode })
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return { error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Check permissions
  const { data: currentUser, error: roleError } = await requireRole('super_admin')
  if (roleError) {
    return { error: roleError.error }
  }

  // 3. Prevent self-role-change
  if (currentUser.userId === userId) {
    return { error: 'You cannot change your own role' }
  }

  const supabase = await createClient()

  // 4. Fetch target user's current role
  const { data: targetUser, error: targetError } = await supabase
    .from('user_profiles')
    .select('id, role, is_active, email')
    .eq('id', userId)
    .single()

  if (targetError || !targetUser) {
    return { error: 'User not found' }
  }

  const oldRole = targetUser.role as UserRole
  const validatedNewRole = parseResult.data.newRole

  // 5. No-op if role is the same
  if (oldRole === validatedNewRole) {
    return { error: 'User already has this role' }
  }

  // 6. Protect last super_admin
  if (oldRole === 'super_admin') {
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if (countError) {
      return { error: 'Failed to check super admin count' }
    }

    if (count !== null && count <= 1) {
      return {
        error: 'Cannot change role of the last Super-Admin. Promote another user to Super-Admin first.',
      }
    }
  }

  // 7. Verify MFA
  const mfaResult = await verifyMfaCode(mfaCode)
  if (!mfaResult.valid) {
    return { error: mfaResult.error ?? 'MFA verification failed' }
  }

  // 8. Update role
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      role: validatedNewRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error updating user role:', updateError)
    return { error: 'Failed to update role' }
  }

  // 9. Write audit log
  const { error: auditError } = await supabase.from('user_role_audit_log').insert({
    actor_id: currentUser.userId,
    target_user_id: userId,
    action: 'role_change',
    old_role: oldRole,
    new_role: validatedNewRole,
  })

  if (auditError) {
    console.error('Error writing audit log:', auditError)
    // Do not fail the operation - the role change already succeeded
  }

  revalidatePath('/settings/users')
  return { success: true }
}

/**
 * Deactivate a user account.
 * Requires Super-Admin role.
 *
 * Rules:
 * - Cannot deactivate yourself
 * - Cannot deactivate the last active super_admin
 * - Already deactivated users return an error
 */
export async function deactivateUser(
  userId: string,
  reason?: string
): Promise<{ success?: boolean; error?: string }> {
  // 1. Validate input
  const parseResult = DeactivateUserSchema.safeParse({ userId, reason })
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return { error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Check permissions
  const { data: currentUser, error: roleError } = await requireRole('super_admin')
  if (roleError) {
    return { error: roleError.error }
  }

  // 3. Prevent self-deactivation
  if (currentUser.userId === userId) {
    return { error: 'You cannot deactivate your own account' }
  }

  const supabase = await createClient()

  // 4. Fetch target user
  const { data: targetUser, error: targetError } = await supabase
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .single()

  if (targetError || !targetUser) {
    return { error: 'User not found' }
  }

  if (!targetUser.is_active) {
    return { error: 'User is already deactivated' }
  }

  // 5. Protect last active super_admin
  if (targetUser.role === 'super_admin') {
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if (countError) {
      return { error: 'Failed to check super admin count' }
    }

    if (count !== null && count <= 1) {
      return {
        error:
          'Cannot deactivate the last active Super-Admin. Promote another user to Super-Admin first.',
      }
    }
  }

  // 6. Deactivate user
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error deactivating user:', updateError)
    return { error: 'Failed to deactivate user' }
  }

  // 7. Write audit log
  const { error: auditError } = await supabase.from('user_role_audit_log').insert({
    actor_id: currentUser.userId,
    target_user_id: userId,
    action: 'deactivate',
    old_role: targetUser.role,
    new_role: targetUser.role,
    reason: parseResult.data.reason ?? null,
  })

  if (auditError) {
    console.error('Error writing audit log:', auditError)
  }

  revalidatePath('/settings/users')
  return { success: true }
}

/**
 * Activate a previously deactivated user account.
 * Requires Super-Admin role.
 */
export async function activateUser(
  userId: string
): Promise<{ success?: boolean; error?: string }> {
  // 1. Validate input
  const parseResult = ActivateUserSchema.safeParse({ userId })
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return { error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Check permissions
  const { data: currentUser, error: roleError } = await requireRole('super_admin')
  if (roleError) {
    return { error: roleError.error }
  }

  const supabase = await createClient()

  // 3. Fetch target user
  const { data: targetUser, error: targetError } = await supabase
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .single()

  if (targetError || !targetUser) {
    return { error: 'User not found' }
  }

  if (targetUser.is_active) {
    return { error: 'User is already active' }
  }

  // 4. Activate user
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Error activating user:', updateError)
    return { error: 'Failed to activate user' }
  }

  // 5. Write audit log
  const { error: auditError } = await supabase.from('user_role_audit_log').insert({
    actor_id: currentUser.userId,
    target_user_id: userId,
    action: 'activate',
    old_role: targetUser.role,
    new_role: targetUser.role,
  })

  if (auditError) {
    console.error('Error writing audit log:', auditError)
  }

  revalidatePath('/settings/users')
  return { success: true }
}

/**
 * Get audit log entries for a specific user.
 * Requires Super-Admin role.
 */
export async function getUserAuditLog(
  userId: string
): Promise<{ entries?: AuditLogEntry[]; error?: string }> {
  // 1. Validate input
  const parseResult = GetAuditLogSchema.safeParse({ userId })
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return { error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Check permissions
  const { error: roleError } = await requireRole('super_admin')
  if (roleError) {
    return { error: roleError.error }
  }

  const supabase = await createClient()

  // 3. Fetch audit log entries with actor information
  const { data: entries, error } = await supabase
    .from('user_role_audit_log')
    .select('id, actor_id, target_user_id, action, old_role, new_role, reason, created_at')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching audit log:', error)
    return { error: 'Failed to load audit log' }
  }

  if (!entries || entries.length === 0) {
    return { entries: [] }
  }

  // 4. Fetch actor names for audit log entries
  const actorIds = [...new Set(entries.map((e) => e.actor_id))]
  const { data: actors } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .in('id', actorIds)

  const actorMap = new Map(
    (actors ?? []).map((a) => [a.id, { name: a.full_name, email: a.email }])
  )

  const enrichedEntries: AuditLogEntry[] = entries.map((entry) => {
    const actor = actorMap.get(entry.actor_id)
    return {
      ...entry,
      action: entry.action as AuditLogEntry['action'],
      actor_name: actor?.name ?? null,
      actor_email: actor?.email ?? null,
    }
  })

  return { entries: enrichedEntries }
}
