'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Save, AlertTriangle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  ContributionRateVersion,
  ContributionRateVersionWithUserInfo,
  ContributionRateWithTotal,
  updateRates,
  getVersionWithRates,
  updateGenderSetting
} from '@/app/[locale]/(protected)/settings/contribution-rates/actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ContributionRatesTable } from './contribution-rates-table'
import { VersionSelector } from './contribution-rates-version-selector'
import { CreateVersionDialog } from './contribution-rates-create-version-dialog'
import { BvgMinimumButton } from './contribution-rates-bvg-minimum-button'
import {
  ContributionRatesAgeGroups,
  AgeGroup,
  ExpandedRate,
  convertRatesToAgeGroups,
  expandAgeGroupsToIndividual,
  validateAgeGroups,
} from './contribution-rates-age-groups'
import { ContributionRatesImportDialog } from './contribution-rates-import-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface ContributionRatesClientProps {
  employerId: string
  employerName: string
  versions: ContributionRateVersion[]
  currentVersion: ContributionRateVersion | null
  currentRates: ContributionRateWithTotal[]
  isEmpty: boolean
}

export function ContributionRatesClient({
  employerId,
  employerName,
  versions,
  currentVersion,
  currentRates,
  isEmpty
}: ContributionRatesClientProps) {
  const t = useTranslations('settings.contributionRates')
  const tActions = useTranslations('actions')
  const router = useRouter()

  const [selectedVersion, setSelectedVersion] = useState<ContributionRateVersion | ContributionRateVersionWithUserInfo | null>(currentVersion)
  const [rates, setRates] = useState<ContributionRateWithTotal[]>(currentRates)
  const [originalRates, setOriginalRates] = useState<ContributionRateWithTotal[]>(currentRates)
  const [sameForAllGenders, setSameForAllGenders] = useState(currentVersion?.same_for_all_genders ?? true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Gender toggle dialog state
  const [genderDialogOpen, setGenderDialogOpen] = useState(false)
  const [pendingGenderChange, setPendingGenderChange] = useState<boolean | null>(null)
  const [isUpdatingGender, setIsUpdatingGender] = useState(false)

  // View mode: 'individual' or 'ageGroups'
  const [viewMode, setViewMode] = useState<'individual' | 'ageGroups'>('individual')

  // Age groups state (for age groups view)
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(() =>
    convertRatesToAgeGroups(currentRates)
  )
  const [ageGroupsValid, setAgeGroupsValid] = useState(true)

  // Check if current version is editable (valid_to is null)
  const isEditable = selectedVersion?.valid_to === null

  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    // For age groups mode, compare expanded rates
    const currentRatesToCompare: Array<{ age: number; gender: 'M' | 'W' | null; employee_rate: number; employer_rate: number }> = viewMode === 'ageGroups'
      ? expandAgeGroupsToIndividual(ageGroups, sameForAllGenders)
      : rates

    if (currentRatesToCompare.length !== originalRates.length) return true
    return currentRatesToCompare.some((rate, index) => {
      const original = originalRates[index]
      if (!original) return true
      return (
        rate.employee_rate !== original.employee_rate ||
        rate.employer_rate !== original.employer_rate
      )
    })
  }, [rates, originalRates, viewMode, ageGroups, sameForAllGenders])

  // Handle version change
  const handleVersionChange = useCallback(async (versionId: string) => {
    const version = versions.find(v => v.id === versionId)
    if (!version) return

    setIsLoading(true)
    try {
      const { version: fetchedVersion, rates: fetchedRates, error } = await getVersionWithRates(versionId)
      if (error) {
        toast.error(error)
        return
      }
      setSelectedVersion(fetchedVersion || null)
      setRates(fetchedRates || [])
      setOriginalRates(fetchedRates || [])
      setSameForAllGenders(fetchedVersion?.same_for_all_genders ?? true)
      // Also update age groups when version changes
      setAgeGroups(convertRatesToAgeGroups(fetchedRates || []))
    } catch (error) {
      toast.error(t('save.error'))
    } finally {
      setIsLoading(false)
    }
  }, [versions, t])

  // Handle rate change
  const handleRateChange = useCallback((age: number, gender: 'M' | 'W' | null, field: 'employee_rate' | 'employer_rate', value: number) => {
    setRates(prevRates => {
      return prevRates.map(rate => {
        if (rate.age === age && rate.gender === gender) {
          const newRate = { ...rate, [field]: value }
          newRate.total_rate = Number(newRate.employee_rate) + Number(newRate.employer_rate)
          return newRate
        }
        return rate
      })
    })
  }, [])

  // Handle BVG minimum rates loaded
  const handleBvgMinimumLoaded = useCallback((bvgRates: ContributionRateWithTotal[]) => {
    setRates(bvgRates)
    // Also update age groups
    setAgeGroups(convertRatesToAgeGroups(bvgRates))
  }, [])

  // Handle import
  const handleImport = useCallback((importedRates: ContributionRateWithTotal[]) => {
    setRates(importedRates)
    // Also update age groups
    setAgeGroups(convertRatesToAgeGroups(importedRates))
    toast.success(t('import.success'))
  }, [t])

  // Handle age groups change
  const handleAgeGroupsChange = useCallback((groups: AgeGroup[]) => {
    setAgeGroups(groups)
    // Expand to individual rates for saving (add placeholder id and version_id)
    const expandedRates = expandAgeGroupsToIndividual(groups, sameForAllGenders)
    const ratesWithIds: ContributionRateWithTotal[] = expandedRates.map((rate, index) => ({
      ...rate,
      id: `temp-${index}`,
      version_id: selectedVersion?.id || '',
    }))
    setRates(ratesWithIds)
  }, [sameForAllGenders, selectedVersion])

  // Handle age groups validation change
  const handleAgeGroupsValidationChange = useCallback((isValid: boolean) => {
    setAgeGroupsValid(isValid)
  }, [])

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: 'individual' | 'ageGroups') => {
    if (mode === 'ageGroups' && viewMode === 'individual') {
      // Convert current rates to age groups
      setAgeGroups(convertRatesToAgeGroups(rates))
    } else if (mode === 'individual' && viewMode === 'ageGroups') {
      // Expand age groups to individual rates
      const expandedRates = expandAgeGroupsToIndividual(ageGroups, sameForAllGenders)
      const ratesWithIds: ContributionRateWithTotal[] = expandedRates.map((rate, index) => ({
        ...rate,
        id: `temp-${index}`,
        version_id: selectedVersion?.id || '',
      }))
      setRates(ratesWithIds)
    }
    setViewMode(mode)
  }, [viewMode, rates, ageGroups, sameForAllGenders, selectedVersion])

  // Handle gender toggle switch click - opens confirmation dialog
  const handleGenderToggleClick = useCallback((checked: boolean) => {
    setPendingGenderChange(checked)
    setGenderDialogOpen(true)
  }, [])

  // Handle gender toggle confirmation
  const handleGenderToggleConfirm = useCallback(async () => {
    if (pendingGenderChange === null || !selectedVersion || !isEditable) {
      setGenderDialogOpen(false)
      return
    }

    setIsUpdatingGender(true)
    try {
      let newRates: { age: number; gender: 'M' | 'W' | null; employee_rate: number; employer_rate: number }[]

      if (pendingGenderChange) {
        // Switching to same_for_all_genders = true
        // Keep only rates with gender = null, or convert M rates to null
        const maleRates = rates.filter(r => r.gender === 'M' || r.gender === null)
        newRates = maleRates.map(rate => ({
          age: rate.age,
          gender: null,
          employee_rate: rate.employee_rate,
          employer_rate: rate.employer_rate
        }))
      } else {
        // Switching to same_for_all_genders = false
        // Duplicate all rates for M and W
        const baseRates = rates.filter(r => r.gender === null || r.gender === 'M')
        newRates = []
        for (const rate of baseRates) {
          newRates.push({
            age: rate.age,
            gender: 'M',
            employee_rate: rate.employee_rate,
            employer_rate: rate.employer_rate
          })
          newRates.push({
            age: rate.age,
            gender: 'W',
            employee_rate: rate.employee_rate,
            employer_rate: rate.employer_rate
          })
        }
      }

      const result = await updateGenderSetting({
        version_id: selectedVersion.id,
        same_for_all_genders: pendingGenderChange,
        rates: newRates
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('genderToggle.success'))
      setSameForAllGenders(pendingGenderChange)

      // Update local state with new rates
      const newRatesWithTotal: ContributionRateWithTotal[] = newRates.map((rate, index) => ({
        ...rate,
        id: `temp-${index}`,
        version_id: selectedVersion.id,
        total_rate: rate.employee_rate + rate.employer_rate
      }))
      setRates(newRatesWithTotal)
      setOriginalRates(newRatesWithTotal)
      setAgeGroups(convertRatesToAgeGroups(newRatesWithTotal))

      router.refresh()
    } catch {
      toast.error(t('genderToggle.error'))
    } finally {
      setIsUpdatingGender(false)
      setGenderDialogOpen(false)
      setPendingGenderChange(null)
    }
  }, [pendingGenderChange, selectedVersion, isEditable, rates, t, router])

  // Handle gender toggle cancel
  const handleGenderToggleCancel = useCallback(() => {
    setGenderDialogOpen(false)
    setPendingGenderChange(null)
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedVersion || !isEditable) return

    // Validate age groups if in age groups mode
    if (viewMode === 'ageGroups') {
      const errors = validateAgeGroups(ageGroups)
      if (errors.length > 0) {
        return // Don't save if there are validation errors
      }
    }

    setIsSaving(true)
    try {
      // Expand age groups to individual rates if in age groups mode
      const ratesToExpand = viewMode === 'ageGroups'
        ? expandAgeGroupsToIndividual(ageGroups, sameForAllGenders)
        : rates

      const ratesToSave = ratesToExpand.map(rate => ({
        age: rate.age,
        gender: rate.gender,
        employee_rate: rate.employee_rate,
        employer_rate: rate.employer_rate
      }))

      const result = await updateRates({
        version_id: selectedVersion.id,
        rates: ratesToSave
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(t('save.success'))
      // Update original rates with the expanded rates
      if (viewMode === 'ageGroups') {
        const expandedRates = expandAgeGroupsToIndividual(ageGroups, sameForAllGenders)
        const savedRates: ContributionRateWithTotal[] = expandedRates.map((rate, index) => ({
          ...rate,
          id: `temp-${index}`,
          version_id: selectedVersion?.id || '',
        }))
        setOriginalRates(savedRates)
        setRates(savedRates)
      } else {
        setOriginalRates(rates)
      }
      router.refresh()
    } catch (error) {
      toast.error(t('save.error'))
    } finally {
      setIsSaving(false)
    }
  }, [selectedVersion, isEditable, rates, t, router])

  // Handle new version created
  const handleVersionCreated = useCallback(() => {
    router.refresh()
  }, [router])

  // Empty state - show only create buttons
  if (isEmpty) {
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <CreateVersionDialog
          employerId={employerId}
          onVersionCreated={handleVersionCreated}
          isFirst={true}
        />
        <BvgMinimumButton
          employerId={employerId}
          onRatesCreated={handleVersionCreated}
          isFirst={true}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Version Selector and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t('version.title')}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <VersionSelector
                versions={versions}
                selectedVersionId={selectedVersion?.id || null}
                onVersionChange={handleVersionChange}
                isLoading={isLoading}
              />
              <CreateVersionDialog
                employerId={employerId}
                onVersionCreated={handleVersionCreated}
                currentRates={rates}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Version Info */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {selectedVersion && (
                <>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('version.validFrom')}: </span>
                    <span className="font-medium">
                      {new Date(selectedVersion.valid_from).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                  {selectedVersion.valid_to && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('version.validTo')}: </span>
                      <span className="font-medium">
                        {new Date(selectedVersion.valid_to).toLocaleDateString('de-CH')}
                      </span>
                    </div>
                  )}
                  {!isEditable && (
                    <Badge variant="secondary">{t('version.readOnly')}</Badge>
                  )}
                </>
              )}
            </div>

            {/* View Mode Toggle and Gender Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">
                  {t('viewMode.label')}:
                </Label>
                <RadioGroup
                  value={viewMode}
                  onValueChange={(value) => handleViewModeChange(value as 'individual' | 'ageGroups')}
                  className="flex gap-4"
                  disabled={!isEditable}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="view-individual" />
                    <Label htmlFor="view-individual" className="text-sm cursor-pointer whitespace-nowrap">
                      {t('viewMode.individual')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ageGroups" id="view-ageGroups" />
                    <Label htmlFor="view-ageGroups" className="text-sm cursor-pointer whitespace-nowrap">
                      {t('viewMode.ageGroups')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Gender Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="same-for-all-genders"
                  checked={sameForAllGenders}
                  onCheckedChange={handleGenderToggleClick}
                  disabled={!isEditable || isUpdatingGender}
                />
                <Label htmlFor="same-for-all-genders" className="text-sm whitespace-nowrap">
                  {t('sameForAllGenders')}
                </Label>
              </div>
            </div>
          </div>

          {/* Audit Trail Info */}
          {selectedVersion && selectedVersion.updated_at && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {t('audit.lastModified', {
                    date: new Date(selectedVersion.updated_at).toLocaleDateString('de-CH'),
                    time: new Date(selectedVersion.updated_at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
                  })}
                  {(selectedVersion as ContributionRateVersionWithUserInfo).updated_by_name && (
                    <> {t('audit.by')} <span className="font-medium">{(selectedVersion as ContributionRateVersionWithUserInfo).updated_by_name}</span></>
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gender Toggle Confirmation Dialog */}
      <AlertDialog open={genderDialogOpen} onOpenChange={setGenderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingGenderChange ? t('genderToggle.enableTitle') : t('genderToggle.disableTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGenderChange
                ? t('genderToggle.enableDescription')
                : t('genderToggle.disableDescription')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleGenderToggleCancel} disabled={isUpdatingGender}>
              {tActions('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenderToggleConfirm} disabled={isUpdatingGender}>
              {isUpdatingGender ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('genderToggle.updating')}
                </>
              ) : (
                tActions('confirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rates Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === 'ageGroups' ? (
            <ContributionRatesAgeGroups
              ageGroups={ageGroups}
              isEditable={isEditable}
              onAgeGroupsChange={handleAgeGroupsChange}
              onValidationChange={handleAgeGroupsValidationChange}
            />
          ) : (
            <ContributionRatesTable
              rates={rates}
              sameForAllGenders={sameForAllGenders}
              isEditable={isEditable}
              onRateChange={handleRateChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Action Bar */}
      {isEditable && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card border rounded-lg sticky bottom-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <BvgMinimumButton
              employerId={employerId}
              onRatesLoaded={handleBvgMinimumLoaded}
              sameForAllGenders={sameForAllGenders}
            />
            <ContributionRatesImportDialog
              sameForAllGenders={sameForAllGenders}
              onImport={handleImport}
            />
            {hasChanges && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{t('warnings.unsavedChanges')}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              onClick={() => {
                setRates([...originalRates])
                setAgeGroups(convertRatesToAgeGroups(originalRates))
              }}
              disabled={!hasChanges || isSaving}
            >
              {tActions('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving || (viewMode === 'ageGroups' && !ageGroupsValid)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('save.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save.button')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
