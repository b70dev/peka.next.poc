'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Trash2, Plus, AlertTriangle } from 'lucide-react'
import { ContributionRateWithTotal } from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

// Partial rate type for creating new rates (without id and version_id)
export interface ExpandedRate {
  age: number
  gender: 'M' | 'W' | null
  employee_rate: number
  employer_rate: number
  total_rate: number
}

// Age group definition
export interface AgeGroup {
  id: string
  fromAge: number
  toAge: number
  employeeRate: number
  employerRate: number
}

// Default BVG age groups
export const DEFAULT_AGE_GROUPS: Omit<AgeGroup, 'id'>[] = [
  { fromAge: 18, toAge: 24, employeeRate: 0, employerRate: 0 },
  { fromAge: 25, toAge: 34, employeeRate: 3.5, employerRate: 3.5 },
  { fromAge: 35, toAge: 44, employeeRate: 5, employerRate: 5 },
  { fromAge: 45, toAge: 54, employeeRate: 7.5, employerRate: 7.5 },
  { fromAge: 55, toAge: 70, employeeRate: 9, employerRate: 9 },
]

// BVG age groups for visual distinction
const BVG_AGE_GROUPS_COLORS = [
  { from: 18, to: 24, color: 'bg-slate-50' },
  { from: 25, to: 34, color: 'bg-blue-50' },
  { from: 35, to: 44, color: 'bg-green-50' },
  { from: 45, to: 54, color: 'bg-amber-50' },
  { from: 55, to: 70, color: 'bg-orange-50' },
]

function getAgeGroupColor(fromAge: number): string {
  const group = BVG_AGE_GROUPS_COLORS.find(g => fromAge >= g.from && fromAge <= g.to)
  return group?.color || ''
}

interface ValidationError {
  type: 'overlap' | 'gap' | 'invalidRange' | 'outOfBounds' | 'minOneGroup'
  groupIndex?: number
  message: string
}

interface ContributionRatesAgeGroupsProps {
  ageGroups: AgeGroup[]
  isEditable: boolean
  onAgeGroupsChange: (groups: AgeGroup[]) => void
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void
}

// Generate unique ID
function generateId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Convert individual rates to age groups (for initialization)
export function convertRatesToAgeGroups(rates: ContributionRateWithTotal[]): AgeGroup[] {
  if (rates.length === 0) {
    return DEFAULT_AGE_GROUPS.map(g => ({ ...g, id: generateId() }))
  }

  // When rates exist for multiple genders (M/W), pick one representative set
  // to avoid creating duplicate/overlapping age groups
  const genders = [...new Set(rates.map(r => r.gender))]
  const representativeRates = genders.length > 1
    ? rates.filter(r => r.gender === (genders.includes('M') ? 'M' : genders[0]))
    : rates

  // Sort rates by age
  const sortedRates = [...representativeRates].sort((a, b) => a.age - b.age)

  const groups: AgeGroup[] = []
  let currentGroup: AgeGroup | null = null

  for (const rate of sortedRates) {
    if (!currentGroup) {
      currentGroup = {
        id: generateId(),
        fromAge: rate.age,
        toAge: rate.age,
        employeeRate: rate.employee_rate,
        employerRate: rate.employer_rate,
      }
    } else if (
      rate.employee_rate === currentGroup.employeeRate &&
      rate.employer_rate === currentGroup.employerRate &&
      rate.age === currentGroup.toAge + 1
    ) {
      // Extend current group
      currentGroup.toAge = rate.age
    } else {
      // Start new group
      groups.push(currentGroup)
      currentGroup = {
        id: generateId(),
        fromAge: rate.age,
        toAge: rate.age,
        employeeRate: rate.employee_rate,
        employerRate: rate.employer_rate,
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups.length > 0 ? groups : DEFAULT_AGE_GROUPS.map(g => ({ ...g, id: generateId() }))
}

// Expand age groups to individual rates
export function expandAgeGroupsToIndividual(
  groups: AgeGroup[],
  sameForAllGenders: boolean = true
): ExpandedRate[] {
  const rates: ExpandedRate[] = []

  // Sort groups by fromAge
  const sortedGroups = [...groups].sort((a, b) => a.fromAge - b.fromAge)

  for (const group of sortedGroups) {
    for (let age = group.fromAge; age <= group.toAge; age++) {
      if (sameForAllGenders) {
        rates.push({
          age,
          gender: null,
          employee_rate: group.employeeRate,
          employer_rate: group.employerRate,
          total_rate: group.employeeRate + group.employerRate,
        })
      } else {
        // Male
        rates.push({
          age,
          gender: 'M',
          employee_rate: group.employeeRate,
          employer_rate: group.employerRate,
          total_rate: group.employeeRate + group.employerRate,
        })
        // Female
        rates.push({
          age,
          gender: 'W',
          employee_rate: group.employeeRate,
          employer_rate: group.employerRate,
          total_rate: group.employeeRate + group.employerRate,
        })
      }
    }
  }

  return rates
}

// Validate age groups
export function validateAgeGroups(groups: AgeGroup[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (groups.length === 0) {
    errors.push({
      type: 'minOneGroup',
      message: 'minOneGroup',
    })
    return errors
  }

  // Sort by fromAge
  const sorted = [...groups].sort((a, b) => a.fromAge - b.fromAge)

  for (let i = 0; i < sorted.length; i++) {
    const group = sorted[i]

    // Check bounds
    if (group.fromAge < 18 || group.toAge > 70) {
      errors.push({
        type: 'outOfBounds',
        groupIndex: i,
        message: 'outOfBounds',
      })
    }

    // Check valid range
    if (group.fromAge > group.toAge) {
      errors.push({
        type: 'invalidRange',
        groupIndex: i,
        message: 'invalidRange',
      })
    }

    // Check for overlaps and gaps with next group
    if (i < sorted.length - 1) {
      const nextGroup = sorted[i + 1]

      // Check overlap
      if (group.toAge >= nextGroup.fromAge) {
        errors.push({
          type: 'overlap',
          groupIndex: i,
          message: 'overlap',
        })
      }

      // Check gap
      if (group.toAge + 1 < nextGroup.fromAge) {
        errors.push({
          type: 'gap',
          groupIndex: i,
          message: 'gap',
        })
      }
    }
  }

  return errors
}

export function ContributionRatesAgeGroups({
  ageGroups,
  isEditable,
  onAgeGroupsChange,
  onValidationChange,
}: ContributionRatesAgeGroupsProps) {
  const t = useTranslations('settings.contributionRates')
  const tTable = useTranslations('settings.contributionRates.table')
  const tAgeGroups = useTranslations('settings.contributionRates.ageGroups')

  // Validate on every change
  const validationErrors = useMemo(() => {
    const errors = validateAgeGroups(ageGroups)
    onValidationChange?.(errors.length === 0, errors)
    return errors
  }, [ageGroups, onValidationChange])

  // Add new age group
  const handleAddGroup = useCallback(() => {
    const sorted = [...ageGroups].sort((a, b) => a.fromAge - b.fromAge)
    const lastGroup = sorted[sorted.length - 1]

    let newFromAge = 18
    let newToAge = 24

    if (lastGroup) {
      newFromAge = lastGroup.toAge + 1
      newToAge = Math.min(newFromAge + 9, 70)
    }

    if (newFromAge > 70) {
      // No more space for new groups
      return
    }

    const newGroup: AgeGroup = {
      id: generateId(),
      fromAge: newFromAge,
      toAge: newToAge,
      employeeRate: 0,
      employerRate: 0,
    }

    onAgeGroupsChange([...ageGroups, newGroup])
  }, [ageGroups, onAgeGroupsChange])

  // Delete age group
  const handleDeleteGroup = useCallback((id: string) => {
    if (ageGroups.length <= 1) {
      return // Keep at least one group
    }
    onAgeGroupsChange(ageGroups.filter(g => g.id !== id))
  }, [ageGroups, onAgeGroupsChange])

  // Update age group field
  const handleGroupChange = useCallback((
    id: string,
    field: keyof Omit<AgeGroup, 'id'>,
    value: number
  ) => {
    onAgeGroupsChange(
      ageGroups.map(g => {
        if (g.id === id) {
          return { ...g, [field]: value }
        }
        return g
      })
    )
  }, [ageGroups, onAgeGroupsChange])

  // Load default groups
  const handleLoadDefaultGroups = useCallback(() => {
    const defaultGroups = DEFAULT_AGE_GROUPS.map(g => ({
      ...g,
      id: generateId(),
    }))
    onAgeGroupsChange(defaultGroups)
  }, [onAgeGroupsChange])

  // Parse and validate number input
  const handleNumberInput = useCallback((
    id: string,
    field: keyof Omit<AgeGroup, 'id'>,
    value: string,
    min: number,
    max: number
  ) => {
    const numValue = parseFloat(value) || 0
    const clampedValue = Math.min(Math.max(numValue, min), max)
    const roundedValue = field === 'fromAge' || field === 'toAge'
      ? Math.round(clampedValue)
      : Math.round(clampedValue * 100) / 100
    handleGroupChange(id, field, roundedValue)
  }, [handleGroupChange])

  // Sort groups for display
  const sortedGroups = useMemo(() => {
    return [...ageGroups].sort((a, b) => a.fromAge - b.fromAge)
  }, [ageGroups])

  // Check if a group has validation errors
  const getGroupErrors = useCallback((groupIndex: number): ValidationError[] => {
    return validationErrors.filter(e => e.groupIndex === groupIndex)
  }, [validationErrors])

  if (ageGroups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground">
          {tAgeGroups('validation.minOneGroup')}
        </div>
        {isEditable && (
          <div className="flex justify-center">
            <Button onClick={handleLoadDefaultGroups} variant="outline">
              {tAgeGroups('defaultGroups')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>
                  {tAgeGroups(`validation.${error.message}`)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Age Groups Table */}
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-24 text-center">{tAgeGroups('fromAge')}</TableHead>
              <TableHead className="w-24 text-center">{tAgeGroups('toAge')}</TableHead>
              <TableHead className="text-right">{tTable('employeeRate')}</TableHead>
              <TableHead className="text-right">{tTable('employerRate')}</TableHead>
              <TableHead className="text-right">{tTable('totalRate')}</TableHead>
              {isEditable && <TableHead className="w-16"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedGroups.map((group, index) => {
              const groupErrors = getGroupErrors(index)
              const hasErrors = groupErrors.length > 0
              const bgColor = getAgeGroupColor(group.fromAge)
              const totalRate = group.employeeRate + group.employerRate
              const isHighValue = totalRate > 25

              return (
                <TableRow
                  key={group.id}
                  className={cn(
                    bgColor,
                    hasErrors && 'bg-red-50 border-red-200'
                  )}
                >
                  {/* From Age */}
                  <TableCell className="text-center">
                    {isEditable ? (
                      <Input
                        type="number"
                        min={18}
                        max={70}
                        value={group.fromAge}
                        onChange={(e) => handleNumberInput(group.id, 'fromAge', e.target.value, 18, 70)}
                        className={cn(
                          "w-16 h-8 text-center font-mono",
                          hasErrors && "border-red-400"
                        )}
                        aria-label={`${tAgeGroups('fromAge')} ${index + 1}`}
                      />
                    ) : (
                      <span className="font-mono">{group.fromAge}</span>
                    )}
                  </TableCell>

                  {/* To Age */}
                  <TableCell className="text-center">
                    {isEditable ? (
                      <Input
                        type="number"
                        min={18}
                        max={70}
                        value={group.toAge}
                        onChange={(e) => handleNumberInput(group.id, 'toAge', e.target.value, 18, 70)}
                        className={cn(
                          "w-16 h-8 text-center font-mono",
                          hasErrors && "border-red-400"
                        )}
                        aria-label={`${tAgeGroups('toAge')} ${index + 1}`}
                      />
                    ) : (
                      <span className="font-mono">{group.toAge}</span>
                    )}
                  </TableCell>

                  {/* Employee Rate */}
                  <TableCell className="text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={group.employeeRate}
                        onChange={(e) => handleNumberInput(group.id, 'employeeRate', e.target.value, 0, 100)}
                        className="w-20 h-8 text-right font-mono"
                        aria-label={`${tTable('employeeRate')} ${tAgeGroups('fromAge')} ${group.fromAge}-${group.toAge}`}
                      />
                    ) : (
                      <span className="font-mono">{group.employeeRate.toFixed(2)}</span>
                    )}
                  </TableCell>

                  {/* Employer Rate */}
                  <TableCell className="text-right">
                    {isEditable ? (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={group.employerRate}
                        onChange={(e) => handleNumberInput(group.id, 'employerRate', e.target.value, 0, 100)}
                        className="w-20 h-8 text-right font-mono"
                        aria-label={`${tTable('employerRate')} ${tAgeGroups('fromAge')} ${group.fromAge}-${group.toAge}`}
                      />
                    ) : (
                      <span className="font-mono">{group.employerRate.toFixed(2)}</span>
                    )}
                  </TableCell>

                  {/* Total Rate */}
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-mono font-medium",
                      isHighValue && "text-amber-600"
                    )}>
                      {totalRate.toFixed(2)}
                    </span>
                  </TableCell>

                  {/* Delete Button */}
                  {isEditable && (
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={ageGroups.length <= 1}
                              aria-label={tAgeGroups('deleteGroup')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {tAgeGroups('deleteGroup')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Action Buttons */}
      {isEditable && (
        <div className="flex justify-between items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDefaultGroups}
                >
                  {tAgeGroups('defaultGroups')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {tAgeGroups('defaultGroupsHint')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddGroup}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {tAgeGroups('addGroup')}
          </Button>
        </div>
      )}
    </div>
  )
}
