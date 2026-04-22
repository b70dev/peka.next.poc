'use client'

import { useState } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Pencil, Mail, Phone, MapPin } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { formatAhvNumber, calculateAge, type PensionerDetail } from '@/lib/pensioners'
import { EditPensionAmountDialog } from './edit-pension-amount-dialog'
import { PensionerPaymentHistory } from './pensioner-payment-history'
import type { PaymentOrder } from '@/lib/payment-orders.types'

interface RentnerDetailProps {
  pensioner: PensionerDetail
  paymentHistory: PaymentOrder[]
}

export function RentnerDetail({ pensioner, paymentHistory }: RentnerDetailProps) {
  const t = useTranslations('pensioners')
  const format = useFormatter()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('accounts.manage')
  const [editOpen, setEditOpen] = useState(false)

  const fullName = `${pensioner.last_name}, ${pensioner.first_name}`
  const age = calculateAge(pensioner.date_of_birth)

  const formatDate = (value: string | null) => {
    if (!value) return t('notAvailable')
    return format.dateTime(new Date(value), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatAmount = (value: number | null) => {
    if (value === null || value === undefined) return t('notAvailable')
    return format.number(value, { style: 'currency', currency: 'CHF' })
  }

  const addressLines: string[] = []
  if (pensioner.street) addressLines.push(pensioner.street)
  const cityLine = [pensioner.postal_code, pensioner.city].filter(Boolean).join(' ')
  if (cityLine) addressLines.push(cityLine)
  if (pensioner.country) addressLines.push(pensioner.country)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/rentner">{t('detail.breadcrumbList')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {formatAhvNumber(pensioner.ahv_number)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/insured/${pensioner.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('detail.openInInsuredProfile')}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stammdaten */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.masterData')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('detail.fields.dateOfBirth')}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(pensioner.date_of_birth)}{' '}
                  <span className="text-muted-foreground">
                    ({t('ageYears', { age })})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('detail.fields.gender')}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {pensioner.gender ?? t('notAvailable')}
                </dd>
              </div>
            </dl>

            <div>
              <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {t('detail.fields.address')}
              </dt>
              <dd className="text-sm font-medium">
                {addressLines.length > 0 ? (
                  addressLines.map((line) => <div key={line}>{line}</div>)
                ) : (
                  <span className="text-muted-foreground font-normal">
                    {t('notAvailable')}
                  </span>
                )}
              </dd>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('detail.fields.email')}
                </dt>
                <dd className="text-sm font-medium break-all">
                  {pensioner.email ? (
                    <a
                      href={`mailto:${pensioner.email}`}
                      className="hover:underline"
                    >
                      {pensioner.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground font-normal">
                      {t('notAvailable')}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('detail.fields.phone')}
                </dt>
                <dd className="text-sm font-medium">
                  {pensioner.phone ?? pensioner.mobile ?? (
                    <span className="text-muted-foreground font-normal">
                      {t('notAvailable')}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Rentenbezug */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t('detail.pensionBlock')}</CardTitle>
            {canEdit && pensioner.pension_account_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                {t('detail.editAmount')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('detail.fields.retirementDate')}
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {formatDate(pensioner.retirement_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t('detail.fields.monthlyAmount')}
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatAmount(pensioner.monthly_pension_amount)}
                </dd>
              </div>
              {pensioner.pension_account_id && (
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {t('detail.fields.accountId')}
                  </dt>
                  <dd className="mt-1 text-xs font-mono break-all">
                    {pensioner.pension_account_id}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.paymentHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PensionerPaymentHistory paymentOrders={paymentHistory} />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {canEdit && pensioner.pension_account_id && (
        <EditPensionAmountDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          accountId={pensioner.pension_account_id}
          currentAmount={pensioner.monthly_pension_amount}
        />
      )}
    </div>
  )
}
