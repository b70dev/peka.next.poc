'use client'

import { useMemo, useState, useTransition, useCallback } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, X } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { RentnerExcelExportButton } from './rentner-excel-export-button'
import { formatAhvNumber, calculateAge, type PensionerRow } from '@/lib/pensioners'

interface RentnerTableProps {
  pensioners: PensionerRow[]
  totalCount: number
  searchTerm: string
}

export function RentnerTable({ pensioners, totalCount, searchTerm }: RentnerTableProps) {
  const t = useTranslations('pensioners')
  const format = useFormatter()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [localSearch, setLocalSearch] = useState(searchTerm)

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString())
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          current.delete(key)
        } else {
          current.set(key, value)
        }
      })
      return current.toString()
    },
    [searchParams]
  )

  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const queryString = createQueryString(params)
      startTransition(() => {
        router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
      })
    },
    [createQueryString, pathname, router]
  )

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl({ search: value || null })
  }, 300)

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    debouncedSearch(value)
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    updateUrl({ search: null })
  }

  const formattedPensioners = useMemo(() => {
    return pensioners.map((p) => ({
      ...p,
      age: calculateAge(p.date_of_birth),
      formattedAhv: formatAhvNumber(p.ahv_number),
    }))
  }, [pensioners])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchAriaLabel')}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClearSearch}
              aria-label={t('searchPlaceholder')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t('count', { count: totalCount })}
          </p>
          <RentnerExcelExportButton pensioners={pensioners} />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        {formattedPensioners.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm
                ? t('emptyStateSearch', { search: searchTerm })
                : t('emptyState')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">{t('tableCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('columns.lastName')}</TableHead>
                  <TableHead scope="col">{t('columns.firstName')}</TableHead>
                  <TableHead scope="col">{t('columns.ahvNumber')}</TableHead>
                  <TableHead scope="col">{t('columns.dateOfBirth')}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t('columns.age')}
                  </TableHead>
                  <TableHead scope="col">{t('columns.retirementDate')}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t('columns.monthlyAmount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedPensioners.map((p) => {
                  const navigate = () => router.push(`/rentner/${p.id}`)
                  return (
                  <TableRow
                    key={p.id}
                    className="hover:bg-muted/50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                    role="button"
                    tabIndex={0}
                    onClick={navigate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate()
                      }
                    }}
                    aria-label={`${p.last_name}, ${p.first_name}`}
                  >
                    <TableCell className="font-medium">{p.last_name}</TableCell>
                    <TableCell>{p.first_name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{p.formattedAhv}</span>
                    </TableCell>
                    <TableCell>
                      {format.dateTime(new Date(p.date_of_birth), {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t('ageYears', { age: p.age })}
                    </TableCell>
                    <TableCell>
                      {p.retirement_date
                        ? format.dateTime(new Date(p.retirement_date), {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : t('notAvailable')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.monthly_pension_amount != null
                        ? format.number(p.monthly_pension_amount, {
                            style: 'currency',
                            currency: 'CHF',
                          })
                        : t('notAvailable')}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
