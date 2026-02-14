import { getTranslations } from 'next-intl/server'
import { getCurrentUserRole, type UserRole } from '@/lib/auth/require-role'
import { Badge } from '@/components/ui/badge'

const ROLE_VARIANT_MAP: Record<UserRole, 'destructive' | 'default' | 'secondary'> = {
  super_admin: 'destructive',
  admin: 'default',
  viewer: 'secondary',
}

/**
 * Server component that fetches the user's role and renders a badge.
 * Used in the AppHeader (server component).
 */
export async function HeaderRoleBadge() {
  const result = await getCurrentUserRole()

  if (result.error || !result.data) {
    return null
  }

  const role = result.data.role
  const tRoles = await getTranslations('roles')
  const variant = ROLE_VARIANT_MAP[role] ?? 'secondary'

  return (
    <Badge
      variant={variant}
      title={tRoles(`description.${role}`)}
      className="cursor-default"
    >
      {tRoles(role)}
    </Badge>
  )
}
