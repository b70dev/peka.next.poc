'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Lock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AccountType } from '@/lib/database.types'
import { EditAccountTypeDialog } from './edit-account-type-dialog'

interface AccountTypeWithUsage extends AccountType {
  usage_count: number
}

interface AccountTypesTableProps {
  accountTypes: AccountTypeWithUsage[]
}

export function AccountTypesTable({ accountTypes }: AccountTypesTableProps) {
  const t = useTranslations('settings.accountTypes')
  const router = useRouter()
  const [editingType, setEditingType] = useState<AccountType | null>(null)

  const handleToggleActive = async (type: AccountTypeWithUsage) => {
    if (type.is_system) {
      toast.error(t('cannotDeactivateSystem'))
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('account_types')
      .update({ is_active: !type.is_active })
      .eq('id', type.id)

    if (error) {
      toast.error(t('updateError'))
      console.error('Error toggling account type:', error)
      return
    }

    toast.success(type.is_active ? t('deactivated') : t('activated'))
    router.refresh()
  }

  const getEffectIcon = (effect: string) => {
    switch (effect) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getEffectBadge = (effect: string) => {
    switch (effect) {
      case 'positive':
        return <Badge variant="default" className="bg-green-100 text-green-800">+</Badge>
      case 'negative':
        return <Badge variant="destructive">-</Badge>
      default:
        return <Badge variant="secondary">~</Badge>
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>{t('columns.code')}</TableHead>
              <TableHead>{t('columns.nameDe')}</TableHead>
              <TableHead>{t('columns.nameFr')}</TableHead>
              <TableHead>{t('columns.nameEn')}</TableHead>
              <TableHead className="text-center">{t('columns.effect')}</TableHead>
              <TableHead className="text-center">{t('columns.type')}</TableHead>
              <TableHead className="text-center">{t('columns.usage')}</TableHead>
              <TableHead className="text-center">{t('columns.active')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountTypes.map((type, index) => (
              <TableRow key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {type.sort_order}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {type.code}
                </TableCell>
                <TableCell className="font-medium">
                  {type.name_de}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {type.name_fr || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {type.name_en || '-'}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getEffectIcon(type.affects_balance)}
                    {getEffectBadge(type.affects_balance)}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {type.is_system ? (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      System
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{type.usage_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={type.is_active}
                    onCheckedChange={() => handleToggleActive(type)}
                    disabled={type.is_system}
                    aria-label={type.is_active ? t('deactivate') : t('activate')}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingType(type)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {accountTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {t('noAccountTypes')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <EditAccountTypeDialog
        accountType={editingType}
        open={!!editingType}
        onOpenChange={(open) => !open && setEditingType(null)}
      />
    </>
  )
}
