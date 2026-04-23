'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/auth/permission-gate'
import { ZasRunsTable } from './zas-runs-table'
import { CreateZasRunDialog } from './create-zas-run-dialog'
import type { ZasRunWithCounts } from '@/lib/zas-runs.types'

interface ZasRunsClientProps {
  runs: ZasRunWithCounts[]
}

/**
 * PROJ-23: Client wrapper for the ZAS Lebensnachweis overview.
 * Owns the "create run" dialog state and orchestrates table + toolbar.
 */
export function ZasRunsClient({ runs }: ZasRunsClientProps) {
  const t = useTranslations('zasLifeVerification')
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <PermissionGate permission="zas.manage">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('newRun')}
          </Button>
        </PermissionGate>
      </div>

      <ZasRunsTable runs={runs} />

      <PermissionGate permission="zas.manage">
        <CreateZasRunDialog open={createOpen} onOpenChange={setCreateOpen} />
      </PermissionGate>
    </div>
  )
}
