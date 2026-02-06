'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Copy, Trash2, Save, FolderOpen, AlertTriangle, TrendingUp } from 'lucide-react'
import { calculateProjection, ProjectionInput, ProjectionResult, formatCurrency, formatPercentage } from '@/lib/projections'
import { saveProjection, deleteProjection, ScenarioInput } from '@/app/[locale]/(protected)/accounts/[employmentId]/projections/actions'
import { useToast } from '@/hooks/use-toast'
import { ScenarioComparisonChart } from './scenario-comparison-chart'

interface Scenario {
  id: string
  name: string
  retirementAge: number
  interestRate: number
  conversionRateObl: number
  conversionRateUeob: number
  salaryGrowthRate: number
  purchaseAmount: number
  capitalRatio: number
  result: ProjectionResult | null
}

export interface SavedProjection {
  id: string
  name: string
  created_at: string
  base_balance_date: string
  scenarios: Array<{
    id: string
    name: string
    retirement_age: number
    interest_rate: number
    conversion_rate_obl: number
    conversion_rate_ueob: number
    salary_growth_rate: number
    purchase_amount: number
    capital_ratio: number
  }>
}

interface ProjectionClientProps {
  employmentId: string
  currentAge: number
  balances: {
    obl: number
    ueob: number
    total: number
    date: string
  }
  annualContribution: number
  conversionRateUeob: number
  systemParams: Record<string, number>
  savedProjections: SavedProjection[]
}

export function ProjectionClient({
  employmentId,
  currentAge,
  balances,
  annualContribution,
  conversionRateUeob,
  systemParams,
  savedProjections: initialSavedProjections,
}: ProjectionClientProps) {
  const t = useTranslations('projections')
  const tActions = useTranslations('actions')
  const { toast } = useToast()

  // Default values from system params
  const defaultRetirementAge = systemParams.default_retirement_age || 65
  const defaultInterestRate = systemParams.bvg_min_interest_rate || 1.25
  const defaultConversionRateObl = systemParams.bvg_conversion_rate_obl || 6.8

  // Create initial scenario
  const createDefaultScenario = (index: number): Scenario => ({
    id: crypto.randomUUID(),
    name: t('scenarios.defaultName', { number: index + 1 }),
    retirementAge: defaultRetirementAge,
    interestRate: defaultInterestRate,
    conversionRateObl: defaultConversionRateObl,
    conversionRateUeob: conversionRateUeob,
    salaryGrowthRate: 0,
    purchaseAmount: 0,
    capitalRatio: 0,
    result: null,
  })

  const [scenarios, setScenarios] = useState<Scenario[]>([createDefaultScenario(0)])
  const [activeScenarioId, setActiveScenarioId] = useState<string>(scenarios[0].id)
  const [savedProjections, setSavedProjections] = useState(initialSavedProjections)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [projectionName, setProjectionName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Calculate results for all scenarios
  const calculateResults = useCallback(() => {
    setScenarios(prev => prev.map(scenario => {
      const input: ProjectionInput = {
        currentAge,
        currentBalanceObl: balances.obl,
        currentBalanceUeob: balances.ueob,
        annualContribution,
        retirementAge: scenario.retirementAge,
        interestRate: scenario.interestRate,
        conversionRateObl: scenario.conversionRateObl,
        conversionRateUeob: scenario.conversionRateUeob,
        salaryGrowthRate: scenario.salaryGrowthRate,
        purchaseAmount: scenario.purchaseAmount,
        capitalRatio: scenario.capitalRatio,
      }
      return {
        ...scenario,
        result: calculateProjection(input),
      }
    }))
  }, [currentAge, balances, annualContribution])

  // Calculate on mount and when scenarios change
  useEffect(() => {
    const timer = setTimeout(calculateResults, 300)
    return () => clearTimeout(timer)
  }, [calculateResults])

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0]

  const updateScenario = (id: string, updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s =>
      s.id === id ? { ...s, ...updates, result: null } : s
    ))
  }

  const addScenario = () => {
    if (scenarios.length >= 5) return
    const newScenario = createDefaultScenario(scenarios.length)
    setScenarios(prev => [...prev, newScenario])
    setActiveScenarioId(newScenario.id)
  }

  const duplicateScenario = (id: string) => {
    if (scenarios.length >= 5) return
    const source = scenarios.find(s => s.id === id)
    if (!source) return

    const newScenario: Scenario = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (${t('scenarios.duplicate')})`,
      result: null,
    }
    setScenarios(prev => [...prev, newScenario])
    setActiveScenarioId(newScenario.id)
  }

  const deleteScenario = (id: string) => {
    if (scenarios.length <= 1) return
    setScenarios(prev => prev.filter(s => s.id !== id))
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios.find(s => s.id !== id)?.id || scenarios[0].id)
    }
  }

  const handleSave = async () => {
    if (!projectionName.trim()) return

    setIsSaving(true)
    try {
      const scenarioInputs: ScenarioInput[] = scenarios.map(s => ({
        name: s.name,
        retirementAge: s.retirementAge,
        interestRate: s.interestRate,
        conversionRateObl: s.conversionRateObl,
        conversionRateUeob: s.conversionRateUeob,
        salaryGrowthRate: s.salaryGrowthRate,
        purchaseAmount: s.purchaseAmount,
        capitalRatio: s.capitalRatio,
      }))

      const result = await saveProjection(employmentId, projectionName, scenarioInputs)

      if ('error' in result) {
        toast({
          title: t('save.error'),
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: t('save.success'),
        })
        setSaveDialogOpen(false)
        setProjectionName('')
        // Refresh saved projections would require a server action
      }
    } finally {
      setIsSaving(false)
    }
  }

  const loadProjection = (projection: SavedProjection) => {
    const loadedScenarios: Scenario[] = projection.scenarios.map(s => ({
      id: crypto.randomUUID(),
      name: s.name,
      retirementAge: s.retirement_age,
      interestRate: Number(s.interest_rate),
      conversionRateObl: Number(s.conversion_rate_obl),
      conversionRateUeob: Number(s.conversion_rate_ueob),
      salaryGrowthRate: Number(s.salary_growth_rate),
      purchaseAmount: Number(s.purchase_amount),
      capitalRatio: Number(s.capital_ratio),
      result: null,
    }))

    if (loadedScenarios.length > 0) {
      setScenarios(loadedScenarios)
      setActiveScenarioId(loadedScenarios[0].id)
    }
  }

  const handleDeleteProjection = async (projectionId: string) => {
    const result = await deleteProjection(projectionId, employmentId)
    if ('error' in result) {
      toast({
        title: t('save.error'),
        description: result.error,
        variant: 'destructive',
      })
    } else {
      setSavedProjections(prev => prev.filter(p => p.id !== projectionId))
    }
  }

  // Warnings
  const warnings: string[] = []
  if (activeScenario.retirementAge < currentAge) {
    warnings.push(t('warnings.retirementInPast'))
  }
  if (activeScenario.interestRate < 0) {
    warnings.push(t('warnings.negativeInterest'))
  }
  if (activeScenario.interestRate > 10) {
    warnings.push(t('warnings.unrealisticInterest'))
  }
  if (activeScenario.salaryGrowthRate > 10) {
    warnings.push(t('warnings.unrealisticSalaryGrowth'))
  }

  return (
    <div className="space-y-6">
      {/* Scenario tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>{t('scenarios.title')}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addScenario}
                disabled={scenarios.length >= 5}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('scenarios.add')}
              </Button>
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    {tActions('save')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('save.title')}</DialogTitle>
                    <DialogDescription>
                      {t('scenarios.title')}: {scenarios.length}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="projectionName">{t('save.name')}</Label>
                    <Input
                      id="projectionName"
                      value={projectionName}
                      onChange={(e) => setProjectionName(e.target.value)}
                      placeholder={t('save.namePlaceholder', { date: new Date().toLocaleDateString('de-CH') })}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      {tActions('cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={!projectionName.trim() || isSaving}>
                      {tActions('save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeScenarioId} onValueChange={setActiveScenarioId}>
            <TabsList className="mb-4 flex-wrap h-auto">
              {scenarios.map((scenario, index) => (
                <TabsTrigger key={scenario.id} value={scenario.id} className="relative group">
                  {scenario.name || t('scenarios.defaultName', { number: index + 1 })}
                </TabsTrigger>
              ))}
            </TabsList>

            {scenarios.map((scenario) => (
              <TabsContent key={scenario.id} value={scenario.id}>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Parameters */}
                  <div className="space-y-4">
                    <h3 className="font-medium">{t('parameters.title')}</h3>

                    <div>
                      <Label htmlFor={`name-${scenario.id}`}>{t('parameters.name')}</Label>
                      <Input
                        id={`name-${scenario.id}`}
                        value={scenario.name}
                        onChange={(e) => updateScenario(scenario.id, { name: e.target.value })}
                        placeholder={t('parameters.namePlaceholder')}
                      />
                    </div>

                    <div>
                      <Label>{t('parameters.retirementAge')}: {scenario.retirementAge} {t('parameters.years')}</Label>
                      <Slider
                        value={[scenario.retirementAge]}
                        onValueChange={([value]) => updateScenario(scenario.id, { retirementAge: value })}
                        min={58}
                        max={70}
                        step={1}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>58</span>
                        <span>70</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`interest-${scenario.id}`}>{t('parameters.interestRate')} (%)</Label>
                        <Input
                          id={`interest-${scenario.id}`}
                          type="number"
                          step="0.25"
                          value={scenario.interestRate}
                          onChange={(e) => updateScenario(scenario.id, { interestRate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`salary-${scenario.id}`}>{t('parameters.salaryGrowth')} (%)</Label>
                        <Input
                          id={`salary-${scenario.id}`}
                          type="number"
                          step="0.5"
                          value={scenario.salaryGrowthRate}
                          onChange={(e) => updateScenario(scenario.id, { salaryGrowthRate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`conv-obl-${scenario.id}`}>{t('parameters.conversionRateObl')} (%)</Label>
                        <Input
                          id={`conv-obl-${scenario.id}`}
                          type="number"
                          step="0.1"
                          value={scenario.conversionRateObl}
                          onChange={(e) => updateScenario(scenario.id, { conversionRateObl: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`conv-ueob-${scenario.id}`}>{t('parameters.conversionRateUeob')} (%)</Label>
                        <Input
                          id={`conv-ueob-${scenario.id}`}
                          type="number"
                          step="0.1"
                          value={scenario.conversionRateUeob}
                          onChange={(e) => updateScenario(scenario.id, { conversionRateUeob: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`purchase-${scenario.id}`}>{t('parameters.purchaseAmount')} (CHF)</Label>
                      <Input
                        id={`purchase-${scenario.id}`}
                        type="number"
                        step="1000"
                        value={scenario.purchaseAmount}
                        onChange={(e) => updateScenario(scenario.id, { purchaseAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <Label>{t('parameters.capitalRatio')}: {scenario.capitalRatio}% {t('parameters.capital')} / {100 - scenario.capitalRatio}% {t('parameters.pension')}</Label>
                      <Slider
                        value={[scenario.capitalRatio]}
                        onValueChange={([value]) => updateScenario(scenario.id, { capitalRatio: value })}
                        min={0}
                        max={100}
                        step={10}
                        className="mt-2"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateScenario(scenario.id)}
                        disabled={scenarios.length >= 5}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {t('scenarios.duplicate')}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={scenarios.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t('scenarios.delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('scenarios.deleteConfirm')}</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{tActions('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteScenario(scenario.id)}>
                              {t('scenarios.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="space-y-4">
                    <h3 className="font-medium">{t('results.title')}</h3>

                    {warnings.length > 0 && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                        {warnings.map((warning, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-orange-700">
                            <AlertTriangle className="h-4 w-4" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}

                    {scenario.result && (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              {t('results.projectedCapital')}
                            </CardTitle>
                            <CardDescription>
                              {t('yearsToRetirement')}: {scenario.result.yearsToRetirement} {t('parameters.years')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.obl')}</p>
                                <p className="font-semibold">{formatCurrency(scenario.result.capitalObl)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.ueob')}</p>
                                <p className="font-semibold">{formatCurrency(scenario.result.capitalUeob)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.totalCapital')}</p>
                                <p className="font-semibold text-primary">{formatCurrency(scenario.result.capitalTotal)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{t('results.monthlyPension')}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.obl')}</p>
                                <p className="font-semibold">{formatCurrency(scenario.result.pensionObl)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.ueob')}</p>
                                <p className="font-semibold">{formatCurrency(scenario.result.pensionUeob)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">{t('results.totalPension')}</p>
                                <p className="font-semibold text-primary">{formatCurrency(scenario.result.pensionTotal)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {scenario.capitalRatio > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{t('results.mixed')}</CardTitle>
                              <CardDescription>
                                {scenario.capitalRatio}% {t('parameters.capital')} / {100 - scenario.capitalRatio}% {t('parameters.pension')}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                  <p className="text-xs text-muted-foreground">{t('results.mixedCapital')}</p>
                                  <p className="font-semibold">{formatCurrency(scenario.result.mixedCapital)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">{t('results.mixedPension')}</p>
                                  <p className="font-semibold">{formatCurrency(scenario.result.mixedPensionMonthly)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-muted-foreground">{t('purchasePotential')}</p>
                              <p className="font-semibold">{formatCurrency(scenario.result.purchasePotential)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {scenarios.length > 1 && scenarios.every(s => s.result) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('comparison.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScenarioComparisonChart
              scenarios={scenarios.map(s => ({
                name: s.name,
                capitalTotal: s.result?.capitalTotal || 0,
                capitalObl: s.result?.capitalObl || 0,
                capitalUeob: s.result?.capitalUeob || 0,
                pensionTotal: s.result?.pensionTotal || 0,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Saved Projections */}
      {savedProjections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t('saved.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedProjections.map((projection) => (
                <div
                  key={projection.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{projection.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('saved.scenarioCount', { count: projection.scenarios.length })} |{' '}
                      {t('saved.createdAt', { date: new Date(projection.created_at).toLocaleDateString('de-CH') })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadProjection(projection)}>
                      {t('saved.load')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('saved.deleteConfirm')}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{tActions('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteProjection(projection.id)}>
                            {t('saved.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
