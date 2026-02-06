'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculateProjection, calculateAge, ProjectionInput, ProjectionResult, ContributionRateByAge, getBvgMinimumRatesLocal } from '@/lib/projections'
import { getCurrentContributionRates } from '@/app/[locale]/(protected)/settings/contribution-rates/actions'

export interface ScenarioInput {
  name: string
  retirementAge: number
  interestRate: number
  conversionRateObl: number
  conversionRateUeob: number
  salaryGrowthRate: number
  purchaseAmount: number
  capitalRatio: number
}

export interface ProjectionData {
  id: string
  name: string
  employmentId: string
  baseBalanceDate: string
  baseBalanceObl: number
  baseBalanceUeob: number
  annualContribution: number
  createdAt: string
  scenarios: ScenarioData[]
}

export interface ScenarioData {
  id: string
  name: string
  sortOrder: number
  retirementAge: number
  interestRate: number
  conversionRateObl: number
  conversionRateUeob: number
  salaryGrowthRate: number
  purchaseAmount: number
  capitalRatio: number
  results: ProjectionResult | null
}

/**
 * Get employment data with account balances for projection
 */
export async function getEmploymentForProjection(employmentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Fetch employment with person and employer
  const { data: employment, error: employmentError } = await supabase
    .from('employments')
    .select(`
      *,
      insured_person:insured_persons!inner(
        id, first_name, last_name, date_of_birth, ahv_number
      ),
      employer:employers!inner(id, name)
    `)
    .eq('id', employmentId)
    .single()

  if (employmentError || !employment) {
    return { error: 'Employment not found' }
  }

  // Fetch account balances
  const { data: accountBalances } = await supabase
    .from('account_balances')
    .select('*')
    .eq('employment_id', employmentId)

  // Calculate current balances (simplified - in practice, need to identify obl vs ueob accounts)
  const balanceObl = accountBalances
    ?.filter(a => a.account_type_code === 'altersguthaben')
    ?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0

  const balanceUeob = accountBalances
    ?.filter(a => a.account_type_code === 'altersguthaben_ueob')
    ?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0

  // Get employer settings for conversion rate
  const { data: employerSettings } = await supabase
    .from('employer_settings')
    .select('*')
    .eq('employer_id', employment.employer.id)
    .is('valid_to', null)
    .order('valid_from', { ascending: false })
    .limit(1)
    .single()

  // Get system parameters
  const { data: systemParams } = await supabase
    .from('projection_parameters')
    .select('key, value')
    .is('valid_to', null)

  const params: Record<string, number> = {}
  systemParams?.forEach(p => {
    params[p.key] = Number(p.value)
  })

  // Calculate annual contribution from transactions (simplified)
  // In practice, this would be based on the employment rate and salary
  const accountIds = accountBalances?.map(a => a.account_id).filter((id): id is string => id !== null) || []

  let annualContribution = 0
  if (accountIds.length > 0) {
    const { data: recentContributions } = await supabase
      .from('transactions')
      .select('amount, transaction_type_id, transaction_types!inner(effect)')
      .in('account_id', accountIds)
      .gte('booking_date', new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0])

    annualContribution = recentContributions
      ?.filter((t) => {
        const txType = t.transaction_types as unknown as { effect: string } | null
        return txType?.effect === 'credit'
      })
      ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
  }

  // Load contribution rates for the employer (PROJ-17 integration)
  let contributionRates: ContributionRateByAge[] = []
  let usedBvgMinimumRates = true

  const ratesResult = await getCurrentContributionRates(employment.employer.id)

  if (!('error' in ratesResult) && ratesResult.rates && ratesResult.rates.length > 0) {
    // Convert from database format to projection format
    contributionRates = ratesResult.rates.map(rate => ({
      age: rate.age,
      employeeRate: Number(rate.employee_rate),
      employerRate: Number(rate.employer_rate),
      totalRate: Number(rate.total_rate),
    }))
    usedBvgMinimumRates = false
  } else {
    // Fallback to BVG minimum rates
    contributionRates = getBvgMinimumRatesLocal()
    usedBvgMinimumRates = true
  }

  // Extract birth year for BVG age calculation
  const birthDate = new Date(employment.insured_person.date_of_birth)
  const birthYear = birthDate.getFullYear()

  return {
    employment: {
      id: employment.id,
      entryDate: employment.entry_date,
      exitDate: employment.exit_date,
      employmentRate: employment.employment_rate,
    },
    insuredPerson: employment.insured_person,
    employer: employment.employer,
    balances: {
      obl: balanceObl,
      ueob: balanceUeob,
      total: balanceObl + balanceUeob,
      date: new Date().toISOString().split('T')[0],
    },
    annualContribution,
    conversionRateUeob: employerSettings?.conversion_rate_ueob || params.bvg_conversion_rate_obl || 5.4,
    systemParams: params,
    // PROJ-17: Contribution rates
    contributionRates,
    usedBvgMinimumRates,
    birthYear,
  }
}

/**
 * Calculate projection results for scenarios (without saving)
 */
export async function calculateScenarios(
  employmentId: string,
  scenarios: ScenarioInput[]
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const employmentData = await getEmploymentForProjection(employmentId)
  if ('error' in employmentData) {
    return { error: employmentData.error }
  }

  const currentAge = calculateAge(employmentData.insuredPerson.date_of_birth)

  const results = scenarios.map(scenario => {
    const input: ProjectionInput = {
      currentAge,
      currentBalanceObl: employmentData.balances.obl,
      currentBalanceUeob: employmentData.balances.ueob,
      annualContribution: employmentData.annualContribution,
      retirementAge: scenario.retirementAge,
      interestRate: scenario.interestRate,
      conversionRateObl: scenario.conversionRateObl,
      conversionRateUeob: scenario.conversionRateUeob,
      salaryGrowthRate: scenario.salaryGrowthRate,
      purchaseAmount: scenario.purchaseAmount,
      capitalRatio: scenario.capitalRatio,
      // PROJ-17: Pass contribution rates
      contributionRates: employmentData.contributionRates,
      birthYear: employmentData.birthYear,
    }

    return {
      scenarioName: scenario.name,
      result: calculateProjection(input),
    }
  })

  return { results, usedBvgMinimumRates: employmentData.usedBvgMinimumRates }
}

/**
 * Save a projection with its scenarios
 */
export async function saveProjection(
  employmentId: string,
  name: string,
  scenarios: ScenarioInput[]
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const employmentData = await getEmploymentForProjection(employmentId)
  if ('error' in employmentData) {
    return { error: employmentData.error }
  }

  const currentAge = calculateAge(employmentData.insuredPerson.date_of_birth)

  // Create projection
  const { data: projection, error: projectionError } = await supabase
    .from('projections')
    .insert({
      employment_id: employmentId,
      name,
      base_balance_date: employmentData.balances.date,
      base_balance_obl: employmentData.balances.obl,
      base_balance_ueob: employmentData.balances.ueob,
      annual_contribution: employmentData.annualContribution,
      created_by: user.id,
    })
    .select()
    .single()

  if (projectionError || !projection) {
    console.error('Error creating projection:', projectionError)
    return { error: projectionError?.message || 'Failed to create projection' }
  }

  // Calculate and save scenarios
  const scenarioInserts = scenarios.map((scenario, index) => {
    const input: ProjectionInput = {
      currentAge,
      currentBalanceObl: employmentData.balances.obl,
      currentBalanceUeob: employmentData.balances.ueob,
      annualContribution: employmentData.annualContribution,
      retirementAge: scenario.retirementAge,
      interestRate: scenario.interestRate,
      conversionRateObl: scenario.conversionRateObl,
      conversionRateUeob: scenario.conversionRateUeob,
      salaryGrowthRate: scenario.salaryGrowthRate,
      purchaseAmount: scenario.purchaseAmount,
      capitalRatio: scenario.capitalRatio,
      // PROJ-17: Pass contribution rates
      contributionRates: employmentData.contributionRates,
      birthYear: employmentData.birthYear,
    }

    const result = calculateProjection(input)

    return {
      projection_id: projection.id,
      name: scenario.name,
      sort_order: index,
      retirement_age: scenario.retirementAge,
      interest_rate: scenario.interestRate,
      conversion_rate_obl: scenario.conversionRateObl,
      conversion_rate_ueob: scenario.conversionRateUeob,
      salary_growth_rate: scenario.salaryGrowthRate,
      purchase_amount: scenario.purchaseAmount,
      capital_ratio: scenario.capitalRatio,
      result_capital_obl: result.capitalObl,
      result_capital_ueob: result.capitalUeob,
      result_pension_obl: result.pensionObl,
      result_pension_ueob: result.pensionUeob,
      result_purchase_potential: result.purchasePotential,
    }
  })

  const { error: scenariosError } = await supabase
    .from('projection_scenarios')
    .insert(scenarioInserts)

  if (scenariosError) {
    console.error('Error creating scenarios:', scenariosError)
    // Clean up the projection
    await supabase.from('projections').delete().eq('id', projection.id)
    return { error: scenariosError.message }
  }

  revalidatePath(`/accounts/${employmentId}/projections`)
  return { success: true, projectionId: projection.id }
}

/**
 * Load saved projections for an employment
 */
export async function getSavedProjections(employmentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: projections, error } = await supabase
    .from('projections')
    .select(`
      *,
      scenarios:projection_scenarios(*)
    `)
    .eq('employment_id', employmentId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projections:', error)
    return { error: error.message }
  }

  return { projections: projections || [] }
}

/**
 * Load a specific projection with its scenarios
 */
export async function getProjection(projectionId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: projection, error } = await supabase
    .from('projections')
    .select(`
      *,
      scenarios:projection_scenarios(*)
    `)
    .eq('id', projectionId)
    .single()

  if (error || !projection) {
    console.error('Error fetching projection:', error)
    return { error: error?.message || 'Projection not found' }
  }

  return { projection }
}

/**
 * Delete a projection
 */
export async function deleteProjection(projectionId: string, employmentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('projections')
    .delete()
    .eq('id', projectionId)

  if (error) {
    console.error('Error deleting projection:', error)
    return { error: error.message }
  }

  revalidatePath(`/accounts/${employmentId}/projections`)
  return { success: true }
}

/**
 * Update projection name
 */
export async function updateProjectionName(
  projectionId: string,
  name: string,
  employmentId: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('projections')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', projectionId)

  if (error) {
    console.error('Error updating projection:', error)
    return { error: error.message }
  }

  revalidatePath(`/accounts/${employmentId}/projections`)
  return { success: true }
}
