'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowDown } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ContributionRateWithTotal } from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

type GenderFilter = 'all' | 'M' | 'W'
type SortDirection = 'asc' | 'desc'

interface ContributionRatesTableProps {
  rates: ContributionRateWithTotal[]
  sameForAllGenders: boolean
  isEditable: boolean
  onRateChange: (age: number, gender: 'M' | 'W' | null, field: 'employee_rate' | 'employer_rate', value: number) => void
}

// BVG age groups for visual distinction
const BVG_AGE_GROUPS = [
  { from: 18, to: 24, color: 'bg-slate-50' },
  { from: 25, to: 34, color: 'bg-blue-50' },
  { from: 35, to: 44, color: 'bg-green-50' },
  { from: 45, to: 54, color: 'bg-amber-50' },
  { from: 55, to: 70, color: 'bg-orange-50' },
]

function getAgeGroupColor(age: number): string {
  const group = BVG_AGE_GROUPS.find(g => age >= g.from && age <= g.to)
  return group?.color || ''
}

export function ContributionRatesTable({
  rates,
  sameForAllGenders,
  isEditable,
  onRateChange
}: ContributionRatesTableProps) {
  const t = useTranslations('settings.contributionRates.table')
  const tValidation = useTranslations('settings.contributionRates.validation')

  // Filter and sort state
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }, [])

  // Filter rates by gender
  const filteredRates = useMemo(() => {
    if (genderFilter === 'all' || sameForAllGenders) {
      return rates
    }
    return rates.filter(rate => rate.gender === genderFilter)
  }, [rates, genderFilter, sameForAllGenders])

  // Group rates by age for display
  const groupedRates = useMemo(() => {
    const grouped = new Map<number, { male?: ContributionRateWithTotal; female?: ContributionRateWithTotal; neutral?: ContributionRateWithTotal }>()

    filteredRates.forEach(rate => {
      if (!grouped.has(rate.age)) {
        grouped.set(rate.age, {})
      }
      const group = grouped.get(rate.age)!
      if (rate.gender === 'M') {
        group.male = rate
      } else if (rate.gender === 'W') {
        group.female = rate
      } else {
        group.neutral = rate
      }
    })

    // Sort by age based on sortDirection
    const entries = Array.from(grouped.entries())
    return sortDirection === 'asc'
      ? entries.sort((a, b) => a[0] - b[0])
      : entries.sort((a, b) => b[0] - a[0])
  }, [filteredRates, sortDirection])

  // Handle input change with validation
  const handleInputChange = useCallback((
    age: number,
    gender: 'M' | 'W' | null,
    field: 'employee_rate' | 'employer_rate',
    value: string
  ) => {
    // Parse value
    const numValue = parseFloat(value) || 0

    // Clamp to valid range
    const clampedValue = Math.min(Math.max(numValue, 0), 100)

    // Round to 2 decimal places
    const roundedValue = Math.round(clampedValue * 100) / 100

    onRateChange(age, gender, field, roundedValue)
  }, [onRateChange])

  // Render rate input cell
  const renderRateInput = useCallback((
    rate: ContributionRateWithTotal | undefined,
    age: number,
    gender: 'M' | 'W' | null,
    field: 'employee_rate' | 'employer_rate'
  ) => {
    if (!rate) return <span className="text-muted-foreground">-</span>

    const value = rate[field]
    const isHighValue = value > 25

    if (!isEditable) {
      return (
        <span className={cn(
          "font-mono",
          isHighValue && "text-amber-600"
        )}>
          {value.toFixed(2)}
        </span>
      )
    }

    return (
      <Input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={(e) => handleInputChange(age, gender, field, e.target.value)}
        className={cn(
          "w-20 h-8 text-right font-mono",
          isHighValue && "border-amber-400 focus:ring-amber-400"
        )}
        aria-label={`${t(field === 'employee_rate' ? 'employeeRate' : 'employerRate')} ${t('age')} ${age}`}
      />
    )
  }, [isEditable, handleInputChange, t])

  // Render total cell
  const renderTotalCell = useCallback((rate: ContributionRateWithTotal | undefined) => {
    if (!rate) return <span className="text-muted-foreground">-</span>

    const total = rate.total_rate
    const isHighValue = total > 25

    return (
      <span className={cn(
        "font-mono font-medium",
        isHighValue && "text-amber-600"
      )}>
        {total.toFixed(2)}
      </span>
    )
  }, [])

  if (groupedRates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('noRates')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      {!sameForAllGenders && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('filter.gender')}:</span>
            <Select
              value={genderFilter}
              onValueChange={(value: GenderFilter) => setGenderFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allGenders')}</SelectItem>
                <SelectItem value="M">{t('filter.maleOnly')}</SelectItem>
                <SelectItem value="W">{t('filter.femaleOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="h-[600px] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead
                className="w-16 text-center cursor-pointer hover:bg-muted/50 select-none"
                onClick={toggleSortDirection}
                aria-label={sortDirection === 'asc' ? t('sort.ageAsc') : t('sort.ageDesc')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('age')}
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
            {!sameForAllGenders && (
              <TableHead className="w-20 text-center">{t('gender')}</TableHead>
            )}
            <TableHead className="text-right">{t('employeeRate')}</TableHead>
            <TableHead className="text-right">{t('employerRate')}</TableHead>
            <TableHead className="text-right">{t('totalRate')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedRates.map(([age, group]) => {
            const bgColor = getAgeGroupColor(age)

            if (sameForAllGenders) {
              // Single row per age
              const rate = group.neutral || group.male || group.female
              return (
                <TableRow key={age} className={bgColor}>
                  <TableCell className="text-center font-medium">{age}</TableCell>
                  <TableCell className="text-right">
                    {renderRateInput(rate, age, rate?.gender || null, 'employee_rate')}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderRateInput(rate, age, rate?.gender || null, 'employer_rate')}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderTotalCell(rate)}
                  </TableCell>
                </TableRow>
              )
            } else if (genderFilter !== 'all') {
              // Single row per age when filtered by gender
              const rate = genderFilter === 'M' ? group.male : group.female
              return (
                <TableRow key={age} className={bgColor}>
                  <TableCell className="text-center font-medium">{age}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{genderFilter === 'M' ? t('male') : t('female')}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {renderRateInput(rate, age, genderFilter, 'employee_rate')}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderRateInput(rate, age, genderFilter, 'employer_rate')}
                  </TableCell>
                  <TableCell className="text-right">
                    {renderTotalCell(rate)}
                  </TableCell>
                </TableRow>
              )
            } else {
              // Two rows per age (male and female) when showing all
              return (
                <>
                  <TableRow key={`${age}-M`} className={bgColor}>
                    <TableCell rowSpan={2} className="text-center font-medium border-b-0">
                      {age}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{t('male')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderRateInput(group.male, age, 'M', 'employee_rate')}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderRateInput(group.male, age, 'M', 'employer_rate')}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderTotalCell(group.male)}
                    </TableCell>
                  </TableRow>
                  <TableRow key={`${age}-W`} className={bgColor}>
                    <TableCell className="text-center">
                      <Badge variant="outline">{t('female')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderRateInput(group.female, age, 'W', 'employee_rate')}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderRateInput(group.female, age, 'W', 'employer_rate')}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderTotalCell(group.female)}
                    </TableCell>
                  </TableRow>
                </>
              )
            }
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}
