'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight, Wallet, Building2, User } from 'lucide-react'
import { Employment, InsuredPerson, Employer, AccountSummary } from '@/lib/database.types'

type EmploymentWithRelations = Employment & {
  insured_person: InsuredPerson
  employer: Employer
  account_summary: AccountSummary[] | null
}

interface EmploymentAccountsListProps {
  employments: EmploymentWithRelations[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  searchTerm: string
}

export function EmploymentAccountsList({
  employments,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  searchTerm: initialSearchTerm,
}: EmploymentAccountsListProps) {
  const t = useTranslations('accounts')
  const tPagination = useTranslations('insured.pagination')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParams({ search: searchTerm, page: '1' })
  }

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() })
  }

  const handlePageSizeChange = (newSize: string) => {
    updateSearchParams({ pageSize: newSize, page: '1' })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'CHF 0.00'
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('de-CH')
  }

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          {t('card.viewAccounts')}
        </Button>
      </form>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {totalCount > 0
          ? t('found', { count: totalCount })
          : initialSearchTerm
          ? t('noResultsForSearch', { search: initialSearchTerm })
          : t('noResults')}
      </p>

      {/* Employment Cards */}
      {employments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('emptyState')}</h3>
            <p className="text-muted-foreground">{t('emptyStateHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {employments.map((employment) => {
            const summary = employment.account_summary?.[0]
            const person = employment.insured_person
            const employer = employment.employer

            return (
              <Link
                key={employment.id}
                href={`/accounts/${employment.id}`}
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {person.last_name}, {person.first_name}
                          </span>
                          <Badge variant="outline" className="font-mono text-xs">
                            {person.ahv_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{employer.name}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>
                            {t('card.employmentSince')} {formatDate(employment.entry_date)}
                          </span>
                          {employment.exit_date && (
                            <>
                              <span className="text-muted-foreground/50">-</span>
                              <span>{formatDate(employment.exit_date)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {t('card.accountCount', { count: summary?.active_account_count ?? 0 })}
                          </p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(summary?.total_balance)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tPagination('perPage')}:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tPagination('showing', { from, to, total: totalCount })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              {tPagination('first')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {tPagination('page', { page: currentPage, totalPages })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              {tPagination('last')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
