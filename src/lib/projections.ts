/**
 * BVG Projection Calculation Engine
 *
 * Calculates retirement projections including:
 * - Projected retirement capital (mandatory and non-mandatory)
 * - Monthly pension amounts
 * - Purchase potential
 */

export interface ContributionRateByAge {
  age: number
  employeeRate: number // AN-Satz in %
  employerRate: number // AG-Satz in %
  totalRate: number // Gesamt in %
}

export interface ProjectionInput {
  // Current state
  currentAge: number
  currentBalanceObl: number
  currentBalanceUeob: number
  annualContribution: number

  // Scenario parameters
  retirementAge: number
  interestRate: number // in % (e.g., 1.25)
  conversionRateObl: number // in % (e.g., 6.8)
  conversionRateUeob: number // in % (e.g., 5.4)
  salaryGrowthRate: number // in % (e.g., 1.5)
  purchaseAmount: number // in CHF
  capitalRatio: number // 0-100, percentage of capital withdrawal

  // For purchase potential calculation
  insuredSalary?: number
  contributionYears?: number

  // Contribution rates from PROJ-17
  contributionRates?: ContributionRateByAge[]
  birthYear?: number // For BVG age calculation
}

export interface ProjectionResult {
  // Projected capital at retirement
  capitalObl: number
  capitalUeob: number
  capitalTotal: number

  // Monthly pension (if 100% pension chosen)
  pensionObl: number
  pensionUeob: number
  pensionTotal: number

  // Mixed form (based on capitalRatio)
  mixedCapital: number
  mixedPensionMonthly: number

  // Purchase potential
  purchasePotential: number

  // Years to retirement
  yearsToRetirement: number

  // Yearly progression for charts
  yearlyProgression: YearlyBalance[]

  // Info about contribution rates used
  usedBvgMinimumRates: boolean
}

export interface YearlyBalance {
  year: number
  age: number
  bvgAge: number // BVG insurance age (calendar year - birth year)
  balanceObl: number
  balanceUeob: number
  balanceTotal: number
  contributionRate?: number // Applied contribution rate for this year
  annualContribution?: number // Contribution amount for this year
}

/**
 * Get BVG insurance age for a given calendar year
 * BVG age = calendar year - birth year
 * This age applies for the entire calendar year regardless of actual birthday
 */
export function getBvgAge(birthYear: number, referenceYear: number): number {
  return referenceYear - birthYear
}

/**
 * Get contribution rate for a specific BVG age from the rates table
 * Returns undefined if no rate is found
 */
export function getContributionRateForBvgAge(
  rates: ContributionRateByAge[],
  bvgAge: number
): ContributionRateByAge | undefined {
  return rates.find(r => r.age === bvgAge)
}

/**
 * Get BVG minimum rates as fallback
 * Standard BVG contribution rates by age group
 */
export function getBvgMinimumRatesLocal(): ContributionRateByAge[] {
  const rates: ContributionRateByAge[] = []

  for (let age = 18; age <= 70; age++) {
    let employeeRate = 0
    let employerRate = 0

    if (age >= 18 && age <= 24) {
      // Under BVG saving threshold
      employeeRate = 0
      employerRate = 0
    } else if (age >= 25 && age <= 34) {
      employeeRate = 3.5
      employerRate = 3.5
    } else if (age >= 35 && age <= 44) {
      employeeRate = 5
      employerRate = 5
    } else if (age >= 45 && age <= 54) {
      employeeRate = 7.5
      employerRate = 7.5
    } else if (age >= 55 && age <= 70) {
      employeeRate = 9
      employerRate = 9
    }

    rates.push({
      age,
      employeeRate,
      employerRate,
      totalRate: employeeRate + employerRate
    })
  }

  return rates
}

/**
 * Calculate BVG projection based on input parameters
 */
export function calculateProjection(input: ProjectionInput): ProjectionResult {
  const {
    currentAge,
    currentBalanceObl,
    currentBalanceUeob,
    annualContribution,
    retirementAge,
    interestRate,
    conversionRateObl,
    conversionRateUeob,
    salaryGrowthRate,
    purchaseAmount,
    capitalRatio,
    insuredSalary = 0,
    contributionYears = 0,
    contributionRates,
    birthYear,
  } = input

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const currentYear = new Date().getFullYear()

  // Determine which contribution rates to use
  // Use provided rates if available, otherwise fall back to BVG minimum
  const effectiveRates = contributionRates && contributionRates.length > 0
    ? contributionRates
    : getBvgMinimumRatesLocal()
  const usedBvgMinimumRates = !contributionRates || contributionRates.length === 0

  // Convert percentages to decimals
  const interestRateDecimal = interestRate / 100
  const salaryGrowthDecimal = salaryGrowthRate / 100

  // Calculate contribution split (simplified: 60% obl, 40% ueob)
  // In practice, this depends on the pension fund regulations
  const oblContributionRatio = 0.6
  const ueobContributionRatio = 0.4

  // Project balances year by year
  let projectedBalanceObl = currentBalanceObl
  let projectedBalanceUeob = currentBalanceUeob

  // Calculate initial BVG age
  const effectiveBirthYear = birthYear || (currentYear - currentAge)
  const initialBvgAge = getBvgAge(effectiveBirthYear, currentYear)

  const yearlyProgression: YearlyBalance[] = [{
    year: 0,
    age: currentAge,
    bvgAge: initialBvgAge,
    balanceObl: projectedBalanceObl,
    balanceUeob: projectedBalanceUeob,
    balanceTotal: projectedBalanceObl + projectedBalanceUeob,
    contributionRate: undefined,
    annualContribution: undefined,
  }]

  for (let year = 1; year <= yearsToRetirement; year++) {
    // Apply interest on existing balance
    projectedBalanceObl *= (1 + interestRateDecimal)
    projectedBalanceUeob *= (1 + interestRateDecimal)

    // Calculate BVG age for this projection year
    const projectionYear = currentYear + year
    const bvgAge = getBvgAge(effectiveBirthYear, projectionYear)

    // Get contribution rate for this age
    const rateForAge = getContributionRateForBvgAge(effectiveRates, bvgAge)
    const totalContributionRate = rateForAge?.totalRate || 0

    // Calculate contribution based on:
    // 1. Salary with growth adjustment
    // 2. Contribution rate for the BVG age
    let yearlyContribution: number

    if (insuredSalary > 0 && totalContributionRate > 0) {
      // Use insured salary with contribution rate
      const adjustedSalary = insuredSalary * Math.pow(1 + salaryGrowthDecimal, year)
      yearlyContribution = adjustedSalary * (totalContributionRate / 100)
    } else if (annualContribution > 0 && totalContributionRate > 0) {
      // Scale the base annual contribution by the ratio of current rate to initial rate
      const initialRate = getContributionRateForBvgAge(effectiveRates, initialBvgAge)?.totalRate || 1
      const rateMultiplier = totalContributionRate / (initialRate || 1)
      const adjustedContribution = annualContribution * Math.pow(1 + salaryGrowthDecimal, year) * rateMultiplier
      yearlyContribution = adjustedContribution
    } else {
      // Fallback: use base annual contribution with salary growth only
      yearlyContribution = annualContribution * Math.pow(1 + salaryGrowthDecimal, year)
    }

    // Add contributions split between obl and ueob
    projectedBalanceObl += yearlyContribution * oblContributionRatio
    projectedBalanceUeob += yearlyContribution * ueobContributionRatio

    yearlyProgression.push({
      year,
      age: currentAge + year,
      bvgAge,
      balanceObl: Math.round(projectedBalanceObl * 100) / 100,
      balanceUeob: Math.round(projectedBalanceUeob * 100) / 100,
      balanceTotal: Math.round((projectedBalanceObl + projectedBalanceUeob) * 100) / 100,
      contributionRate: totalContributionRate,
      annualContribution: Math.round(yearlyContribution * 100) / 100,
    })
  }

  // Add purchase amount (split proportionally to current balance ratio)
  if (purchaseAmount > 0) {
    const totalCurrentBalance = currentBalanceObl + currentBalanceUeob
    if (totalCurrentBalance > 0) {
      const oblRatio = currentBalanceObl / totalCurrentBalance
      projectedBalanceObl += purchaseAmount * oblRatio
      projectedBalanceUeob += purchaseAmount * (1 - oblRatio)
    } else {
      // If no current balance, split 60/40
      projectedBalanceObl += purchaseAmount * oblContributionRatio
      projectedBalanceUeob += purchaseAmount * ueobContributionRatio
    }
  }

  // Calculate annual pension
  const annualPensionObl = projectedBalanceObl * (conversionRateObl / 100)
  const annualPensionUeob = projectedBalanceUeob * (conversionRateUeob / 100)

  // Calculate monthly pension
  const monthlyPensionObl = annualPensionObl / 12
  const monthlyPensionUeob = annualPensionUeob / 12

  // Calculate mixed form
  const capitalRatioDecimal = capitalRatio / 100
  const pensionRatioDecimal = 1 - capitalRatioDecimal

  const mixedCapital = (projectedBalanceObl + projectedBalanceUeob) * capitalRatioDecimal
  const mixedPensionCapitalObl = projectedBalanceObl * pensionRatioDecimal
  const mixedPensionCapitalUeob = projectedBalanceUeob * pensionRatioDecimal
  const mixedAnnualPension =
    (mixedPensionCapitalObl * (conversionRateObl / 100)) +
    (mixedPensionCapitalUeob * (conversionRateUeob / 100))
  const mixedPensionMonthly = mixedAnnualPension / 12

  // Calculate purchase potential
  const purchasePotential = calculatePurchasePotential(
    insuredSalary,
    currentAge,
    contributionYears,
    currentBalanceObl + currentBalanceUeob
  )

  return {
    capitalObl: Math.round(projectedBalanceObl * 100) / 100,
    capitalUeob: Math.round(projectedBalanceUeob * 100) / 100,
    capitalTotal: Math.round((projectedBalanceObl + projectedBalanceUeob) * 100) / 100,
    pensionObl: Math.round(monthlyPensionObl * 100) / 100,
    pensionUeob: Math.round(monthlyPensionUeob * 100) / 100,
    pensionTotal: Math.round((monthlyPensionObl + monthlyPensionUeob) * 100) / 100,
    mixedCapital: Math.round(mixedCapital * 100) / 100,
    mixedPensionMonthly: Math.round(mixedPensionMonthly * 100) / 100,
    purchasePotential: Math.round(purchasePotential * 100) / 100,
    yearsToRetirement,
    yearlyProgression,
    usedBvgMinimumRates,
  }
}

/**
 * Calculate maximum purchase potential based on BVG regulations
 *
 * Simplified calculation - in practice, this requires the pension fund's
 * specific regulations and the individual's employment history
 */
export function calculatePurchasePotential(
  insuredSalary: number,
  currentAge: number,
  contributionYears: number,
  currentBalance: number
): number {
  if (insuredSalary <= 0 || currentAge < 25 || currentAge >= 65) {
    return 0
  }

  // BVG coordination deduction 2024
  const coordinationDeduction = 25725
  const maxInsuredSalary = 88200

  // Calculate coordinated salary
  const coordinatedSalary = Math.min(
    Math.max(0, insuredSalary - coordinationDeduction),
    maxInsuredSalary - coordinationDeduction
  )

  if (coordinatedSalary <= 0) {
    return 0
  }

  // Simplified target capital calculation based on age and salary
  // In practice, this uses the pension fund's specific contribution tables
  const yearsContributing = Math.max(0, currentAge - 25)
  const maxYearsContributing = 40 // 25 to 65

  // Age-based contribution rates (simplified BVG scale)
  let cumulativeRate = 0
  for (let age = 25; age < currentAge; age++) {
    if (age < 35) {
      cumulativeRate += 0.07 // 7%
    } else if (age < 45) {
      cumulativeRate += 0.10 // 10%
    } else if (age < 55) {
      cumulativeRate += 0.15 // 15%
    } else {
      cumulativeRate += 0.18 // 18%
    }
  }

  // Target capital based on cumulative contributions
  const targetCapital = coordinatedSalary * cumulativeRate

  // Purchase potential is the difference (cannot be negative)
  return Math.max(0, targetCapital - currentBalance)
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = new Date(birthDate)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Validate projection parameters
 */
export function validateProjectionParams(params: Partial<ProjectionInput>): string[] {
  const errors: string[] = []

  if (params.retirementAge !== undefined) {
    if (params.retirementAge < 58 || params.retirementAge > 70) {
      errors.push('Pensionierungsalter muss zwischen 58 und 70 Jahren liegen')
    }
  }

  if (params.interestRate !== undefined) {
    if (params.interestRate < -5 || params.interestRate > 20) {
      errors.push('Zinssatz muss zwischen -5% und 20% liegen')
    }
  }

  if (params.conversionRateObl !== undefined) {
    if (params.conversionRateObl <= 0 || params.conversionRateObl > 10) {
      errors.push('Umwandlungssatz obligatorisch muss zwischen 0% und 10% liegen')
    }
  }

  if (params.conversionRateUeob !== undefined) {
    if (params.conversionRateUeob <= 0 || params.conversionRateUeob > 10) {
      errors.push('Umwandlungssatz überobligatorisch muss zwischen 0% und 10% liegen')
    }
  }

  if (params.salaryGrowthRate !== undefined) {
    if (params.salaryGrowthRate < -10 || params.salaryGrowthRate > 50) {
      errors.push('Lohnentwicklung muss zwischen -10% und 50% liegen')
    }
  }

  if (params.purchaseAmount !== undefined) {
    if (params.purchaseAmount < 0) {
      errors.push('Einkaufsbetrag kann nicht negativ sein')
    }
  }

  if (params.capitalRatio !== undefined) {
    if (params.capitalRatio < 0 || params.capitalRatio > 100) {
      errors.push('Kapitalanteil muss zwischen 0% und 100% liegen')
    }
  }

  return errors
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, locale = 'de-CH'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}
