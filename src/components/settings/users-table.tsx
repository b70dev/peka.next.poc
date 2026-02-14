'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RoleBadge } from '@/components/ui/role-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, ShieldAlert, UserCog, UserX, UserCheck } from 'lucide-react'
import type { UserProfile } from '@/app/[locale]/(protected)/settings/users/actions'
import type { UserRole } from '@/lib/auth/roles'
import { ChangeRoleDialog } from './change-role-dialog'
import { DeactivateUserDialog } from './deactivate-user-dialog'
import { ActivateUserDialog } from './activate-user-dialog'

interface UsersTableProps {
  users: UserProfile[]
  currentUserId: string
}

type StatusFilter = 'all' | 'active' | 'deactivated'
type RoleFilter = 'all' | UserRole

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const t = useTranslations('settings.userManagement')
  const tRoles = useTranslations('roles')
  const tStatus = useTranslations('status')

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Dialog states
  const [changeRoleUser, setChangeRoleUser] = useState<UserProfile | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<UserProfile | null>(null)
  const [activateUser, setActivateUser] = useState<UserProfile | null>(null)

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const nameMatch = (user.full_name ?? '').toLowerCase().includes(search)
        const emailMatch = (user.email ?? '').toLowerCase().includes(search)
        if (!nameMatch && !emailMatch) return false
      }

      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false

      // Status filter
      if (statusFilter === 'active' && !user.is_active) return false
      if (statusFilter === 'deactivated' && user.is_active) return false

      return true
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      const parts = name.split(' ')
      return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  const formatLastLogin = (dateStr: string | null): string => {
    if (!dateStr) return t('never')
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isCurrentUser = (userId: string): boolean => userId === currentUserId

  return (
    <>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            aria-label={t('searchPlaceholder')}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label={t('filter.allRoles')}>
            <SelectValue placeholder={t('filter.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allRoles')}</SelectItem>
            <SelectItem value="super_admin">{tRoles('super_admin')}</SelectItem>
            <SelectItem value="admin">{tRoles('admin')}</SelectItem>
            <SelectItem value="viewer">{tRoles('viewer')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[180px]" aria-label={t('filter.allStatuses')}>
            <SelectValue placeholder={t('filter.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('filter.active')}</SelectItem>
            <SelectItem value="deactivated">{t('filter.deactivated')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.email')}</TableHead>
              <TableHead>{t('columns.role')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead>{t('columns.lastLogin')}</TableHead>
              <TableHead className="w-[50px]">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                className={!user.is_active ? 'opacity-50' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {user.full_name || '-'}
                        {isCurrentUser(user.id) && (
                          <span className="ml-1 text-xs text-muted-foreground">{t('you')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email ?? '-'}
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>
                  {user.is_active ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                      {tStatus('active')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
                      {t('filter.deactivated')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatLastLogin(user.last_login_at)}
                </TableCell>
                <TableCell>
                  {!isCurrentUser(user.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('columns.actions')}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setChangeRoleUser(user)}>
                          <UserCog className="h-4 w-4 mr-2" />
                          {t('changeRole.title')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.is_active ? (
                          <DropdownMenuItem
                            onClick={() => setDeactivateUser(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            {t('deactivate.confirm')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setActivateUser(user)}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            {t('activate.confirm')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? t('noUsersForSearch', { search: searchTerm }) : t('noUsers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <ChangeRoleDialog
        user={changeRoleUser}
        open={!!changeRoleUser}
        onOpenChange={(open) => !open && setChangeRoleUser(null)}
      />
      <DeactivateUserDialog
        user={deactivateUser}
        open={!!deactivateUser}
        onOpenChange={(open) => !open && setDeactivateUser(null)}
      />
      <ActivateUserDialog
        user={activateUser}
        open={!!activateUser}
        onOpenChange={(open) => !open && setActivateUser(null)}
      />
    </>
  )
}
