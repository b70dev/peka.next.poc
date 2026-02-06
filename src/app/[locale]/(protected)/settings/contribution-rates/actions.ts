'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ===========================================
// Types
// ===========================================

export interface ContributionRateVersion {
  id: string
  employer_id: string
  valid_from: string
  valid_to: string | null
  same_for_all_genders: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface ContributionRate {
  id: string
  version_id: string
  age: number
  gender: 'M' | 'W' | null
  employee_rate: number
  employer_rate: number
}

export interface ContributionRateWithTotal extends ContributionRate {
  total_rate: number
}

export interface CreateVersionInput {
  employer_id: string
  valid_from: string
  same_for_all_genders: boolean
  rates: Omit<ContributionRate, 'id' | 'version_id'>[]
}

export interface UpdateRatesInput {
  version_id: string
  rates: Omit<ContributionRate, 'id' | 'version_id'>[]
}

export interface BvgMinimumRate {
  age: number
  employee_rate: number
  employer_rate: number
  total_rate: number
}

export interface ContributionRateVersionWithUserInfo extends ContributionRateVersion {
  created_by_name: string | null
  updated_by_name: string | null
}

export interface UpdateGenderSettingInput {
  version_id: string
  same_for_all_genders: boolean
  rates: Omit<ContributionRate, 'id' | 'version_id'>[]
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Check if user is authenticated
 */
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: 'Unauthorized', user: null, supabase }
  }

  return { error: null, user, supabase }
}

// ===========================================
// Server Actions
// ===========================================

/**
 * Get all contribution rate versions for an employer
 */
export async function getContributionRateVersions(employerId: string) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const { data: versions, error } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*')
    .eq('employer_id', employerId)
    .order('valid_from', { ascending: false })

  if (error) {
    console.error('Error fetching contribution rate versions:', error)
    return { error: error.message }
  }

  return { versions: versions as ContributionRateVersion[] }
}

/**
 * Get contribution rates for a specific version
 */
export async function getContributionRates(versionId: string) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const { data: rates, error } = await supabase
    .from('employer_contribution_rates')
    .select('*')
    .eq('version_id', versionId)
    .order('age', { ascending: true })
    .order('gender', { ascending: true, nullsFirst: true })

  if (error) {
    console.error('Error fetching contribution rates:', error)
    return { error: error.message }
  }

  // Add total_rate to each rate
  const ratesWithTotal: ContributionRateWithTotal[] = (rates as ContributionRate[]).map(rate => ({
    ...rate,
    total_rate: Number(rate.employee_rate) + Number(rate.employer_rate)
  }))

  return { rates: ratesWithTotal }
}

/**
 * Get the currently active contribution rates for an employer
 * (version where valid_to is NULL or valid_to > today)
 */
export async function getCurrentContributionRates(employerId: string) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const today = new Date().toISOString().split('T')[0]

  // Find the current version
  const { data: versions, error: versionError } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*')
    .eq('employer_id', employerId)
    .lte('valid_from', today)
    .or(`valid_to.is.null,valid_to.gt.${today}`)
    .order('valid_from', { ascending: false })
    .limit(1)

  if (versionError) {
    console.error('Error fetching current version:', versionError)
    return { error: versionError.message }
  }

  if (!versions || versions.length === 0) {
    return {
      version: null,
      rates: [],
      message: 'No contribution rates configured for this employer'
    }
  }

  const version = versions[0] as ContributionRateVersion

  // Get rates for this version
  const { data: rates, error: ratesError } = await supabase
    .from('employer_contribution_rates')
    .select('*')
    .eq('version_id', version.id)
    .order('age', { ascending: true })
    .order('gender', { ascending: true, nullsFirst: true })

  if (ratesError) {
    console.error('Error fetching contribution rates:', ratesError)
    return { error: ratesError.message }
  }

  // Add total_rate to each rate
  const ratesWithTotal: ContributionRateWithTotal[] = (rates as ContributionRate[]).map(rate => ({
    ...rate,
    total_rate: Number(rate.employee_rate) + Number(rate.employer_rate)
  }))

  return {
    version,
    rates: ratesWithTotal
  }
}

/**
 * Get user profile name by user ID
 */
async function getUserProfileName(supabase: Awaited<ReturnType<typeof createClient>>, userId: string | null): Promise<string | null> {
  if (!userId) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  return profile?.full_name || null
}

/**
 * Get a specific version with its rates
 */
export async function getVersionWithRates(versionId: string) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  // Get version
  const { data: version, error: versionError } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (versionError) {
    console.error('Error fetching version:', versionError)
    return { error: versionError.message }
  }

  // Get user names for audit trail
  const [createdByName, updatedByName] = await Promise.all([
    getUserProfileName(supabase, version.created_by),
    getUserProfileName(supabase, version.updated_by)
  ])

  // Get rates
  const { data: rates, error: ratesError } = await supabase
    .from('employer_contribution_rates')
    .select('*')
    .eq('version_id', versionId)
    .order('age', { ascending: true })
    .order('gender', { ascending: true, nullsFirst: true })

  if (ratesError) {
    console.error('Error fetching rates:', ratesError)
    return { error: ratesError.message }
  }

  // Add total_rate
  const ratesWithTotal: ContributionRateWithTotal[] = (rates as ContributionRate[]).map(rate => ({
    ...rate,
    total_rate: Number(rate.employee_rate) + Number(rate.employer_rate)
  }))

  const versionWithUserInfo: ContributionRateVersionWithUserInfo = {
    ...version as ContributionRateVersion,
    created_by_name: createdByName,
    updated_by_name: updatedByName
  }

  return {
    version: versionWithUserInfo,
    rates: ratesWithTotal
  }
}

/**
 * Create a new version with rates
 */
export async function createVersion(input: CreateVersionInput) {
  const { error: authError, user, supabase } = await requireAuth()
  if (authError || !user) {
    return { error: authError || 'Unauthorized' }
  }

  // Validate input
  if (!input.employer_id) {
    return { error: 'Employer ID is required' }
  }
  if (!input.valid_from) {
    return { error: 'Valid from date is required' }
  }
  if (!input.rates || input.rates.length === 0) {
    return { error: 'At least one rate is required' }
  }

  // Validate rates
  for (const rate of input.rates) {
    if (rate.age < 18 || rate.age > 70) {
      return { error: `Invalid age: ${rate.age}. Must be between 18 and 70.` }
    }
    if (rate.employee_rate < 0 || rate.employee_rate > 100) {
      return { error: `Invalid employee rate for age ${rate.age}: ${rate.employee_rate}. Must be between 0 and 100.` }
    }
    if (rate.employer_rate < 0 || rate.employer_rate > 100) {
      return { error: `Invalid employer rate for age ${rate.age}: ${rate.employer_rate}. Must be between 0 and 100.` }
    }
  }

  // Close previous version (set valid_to to the day before the new version)
  const newValidFrom = new Date(input.valid_from)
  const previousValidTo = new Date(newValidFrom)
  previousValidTo.setDate(previousValidTo.getDate() - 1)

  const { error: closeError } = await supabase
    .from('employer_contribution_rate_versions')
    .update({ valid_to: previousValidTo.toISOString().split('T')[0] })
    .eq('employer_id', input.employer_id)
    .is('valid_to', null)

  if (closeError) {
    console.error('Error closing previous version:', closeError)
    // Continue anyway - there might not be a previous version
  }

  // Create new version
  const { data: version, error: versionError } = await supabase
    .from('employer_contribution_rate_versions')
    .insert({
      employer_id: input.employer_id,
      valid_from: input.valid_from,
      valid_to: null,
      same_for_all_genders: input.same_for_all_genders,
      created_by: user.id
    })
    .select()
    .single()

  if (versionError || !version) {
    console.error('Error creating version:', versionError)
    return { error: versionError?.message || 'Failed to create version' }
  }

  // Insert rates
  const ratesToInsert = input.rates.map(rate => ({
    version_id: version.id,
    age: rate.age,
    gender: rate.gender,
    employee_rate: rate.employee_rate,
    employer_rate: rate.employer_rate
  }))

  const { error: ratesError } = await supabase
    .from('employer_contribution_rates')
    .insert(ratesToInsert)

  if (ratesError) {
    console.error('Error inserting rates:', ratesError)
    // Rollback: delete the version
    await supabase.from('employer_contribution_rate_versions').delete().eq('id', version.id)
    return { error: ratesError.message }
  }

  revalidatePath('/settings/contribution-rates')
  return {
    success: true,
    versionId: version.id,
    message: 'Version created successfully'
  }
}

/**
 * Update rates for an existing version
 * Only the current version (valid_to = NULL) can be updated
 */
export async function updateRates(input: UpdateRatesInput) {
  const { error: authError, user, supabase } = await requireAuth()
  if (authError || !user) {
    return { error: authError || 'Unauthorized' }
  }

  // Check if version exists and is current (valid_to = NULL)
  const { data: version, error: versionError } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*')
    .eq('id', input.version_id)
    .single()

  if (versionError || !version) {
    return { error: 'Version not found' }
  }

  if (version.valid_to !== null) {
    return { error: 'Cannot update historical versions. Only the current version can be edited.' }
  }

  // Validate rates
  for (const rate of input.rates) {
    if (rate.age < 18 || rate.age > 70) {
      return { error: `Invalid age: ${rate.age}. Must be between 18 and 70.` }
    }
    if (rate.employee_rate < 0 || rate.employee_rate > 100) {
      return { error: `Invalid employee rate for age ${rate.age}: ${rate.employee_rate}. Must be between 0 and 100.` }
    }
    if (rate.employer_rate < 0 || rate.employer_rate > 100) {
      return { error: `Invalid employer rate for age ${rate.age}: ${rate.employer_rate}. Must be between 0 and 100.` }
    }
  }

  // Delete existing rates
  const { error: deleteError } = await supabase
    .from('employer_contribution_rates')
    .delete()
    .eq('version_id', input.version_id)

  if (deleteError) {
    console.error('Error deleting existing rates:', deleteError)
    return { error: deleteError.message }
  }

  // Insert new rates
  const ratesToInsert = input.rates.map(rate => ({
    version_id: input.version_id,
    age: rate.age,
    gender: rate.gender,
    employee_rate: rate.employee_rate,
    employer_rate: rate.employer_rate
  }))

  const { error: insertError } = await supabase
    .from('employer_contribution_rates')
    .insert(ratesToInsert)

  if (insertError) {
    console.error('Error inserting rates:', insertError)
    return { error: insertError.message }
  }

  // Update version's updated_at and updated_by
  await supabase
    .from('employer_contribution_rate_versions')
    .update({
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', input.version_id)

  revalidatePath('/settings/contribution-rates')
  return {
    success: true,
    message: 'Rates updated successfully'
  }
}

/**
 * Delete a version (only if not the only version for the employer)
 */
export async function deleteVersion(versionId: string, employerId: string) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  // Check how many versions exist for this employer
  const { count, error: countError } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*', { count: 'exact', head: true })
    .eq('employer_id', employerId)

  if (countError) {
    return { error: countError.message }
  }

  if (count !== null && count <= 1) {
    return { error: 'Cannot delete the only version. At least one version must exist.' }
  }

  // Delete the version (rates will be cascaded)
  const { error: deleteError } = await supabase
    .from('employer_contribution_rate_versions')
    .delete()
    .eq('id', versionId)

  if (deleteError) {
    console.error('Error deleting version:', deleteError)
    return { error: deleteError.message }
  }

  revalidatePath('/settings/contribution-rates')
  return {
    success: true,
    message: 'Version deleted successfully'
  }
}

/**
 * Get BVG minimum rates (standard template)
 * Calls the database function get_bvg_minimum_rates()
 */
export async function getBvgMinimumRates(): Promise<{ rates?: BvgMinimumRate[], error?: string }> {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const { data: rates, error } = await supabase
    .rpc('get_bvg_minimum_rates')

  if (error) {
    console.error('Error fetching BVG minimum rates:', error)
    return { error: error.message }
  }

  return { rates: rates as BvgMinimumRate[] }
}

/**
 * Get contribution rate for a specific age (used by projections)
 * Calls the database function get_contribution_rate_for_age()
 */
export async function getContributionRateForAge(
  employerId: string,
  age: number,
  gender: 'M' | 'W' | null = null,
  referenceDate: string = new Date().toISOString().split('T')[0]
) {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const { data: rate, error } = await supabase
    .rpc('get_contribution_rate_for_age', {
      p_employer_id: employerId,
      p_age: age,
      p_gender: gender,
      p_reference_date: referenceDate
    })

  if (error) {
    console.error('Error fetching contribution rate for age:', error)
    return { error: error.message }
  }

  if (!rate || rate.length === 0) {
    return {
      rate: null,
      message: `No contribution rate found for employer ${employerId}, age ${age}`
    }
  }

  return {
    rate: {
      employee_rate: Number(rate[0].employee_rate),
      employer_rate: Number(rate[0].employer_rate),
      total_rate: Number(rate[0].total_rate)
    }
  }
}

/**
 * Get all employers (for dropdown selection)
 */
export async function getEmployers() {
  const { error: authError, supabase } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  const { data: employers, error } = await supabase
    .from('employers')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching employers:', error)
    return { error: error.message }
  }

  return { employers }
}

/**
 * Create initial BVG minimum rates for an employer
 * Helper function to quickly set up an employer with standard rates
 */
export async function createBvgMinimumVersion(
  employerId: string,
  validFrom: string = new Date().toISOString().split('T')[0]
) {
  const { error: authError } = await requireAuth()
  if (authError) {
    return { error: authError }
  }

  // Get BVG minimum rates
  const { rates: bvgRates, error: ratesError } = await getBvgMinimumRates()
  if (ratesError || !bvgRates) {
    return { error: ratesError || 'Failed to get BVG minimum rates' }
  }

  // Convert to input format (same_for_all_genders = true, so gender = null)
  const rates = bvgRates.map(rate => ({
    age: rate.age,
    gender: null as 'M' | 'W' | null,
    employee_rate: rate.employee_rate,
    employer_rate: rate.employer_rate
  }))

  // Create version
  return createVersion({
    employer_id: employerId,
    valid_from: validFrom,
    same_for_all_genders: true,
    rates
  })
}

/**
 * Update the gender setting for a version and transform rates accordingly
 * When switching to same_for_all_genders: true, keep only gender=null rates (using M rates as source)
 * When switching to same_for_all_genders: false, duplicate rates for M and W
 */
export async function updateGenderSetting(input: UpdateGenderSettingInput) {
  const { error: authError, user, supabase } = await requireAuth()
  if (authError || !user) {
    return { error: authError || 'Unauthorized' }
  }

  // Check if version exists and is current (valid_to = NULL)
  const { data: version, error: versionError } = await supabase
    .from('employer_contribution_rate_versions')
    .select('*')
    .eq('id', input.version_id)
    .single()

  if (versionError || !version) {
    return { error: 'Version not found' }
  }

  if (version.valid_to !== null) {
    return { error: 'Cannot update historical versions. Only the current version can be edited.' }
  }

  // Validate rates
  for (const rate of input.rates) {
    if (rate.age < 18 || rate.age > 70) {
      return { error: `Invalid age: ${rate.age}. Must be between 18 and 70.` }
    }
    if (rate.employee_rate < 0 || rate.employee_rate > 100) {
      return { error: `Invalid employee rate for age ${rate.age}: ${rate.employee_rate}. Must be between 0 and 100.` }
    }
    if (rate.employer_rate < 0 || rate.employer_rate > 100) {
      return { error: `Invalid employer rate for age ${rate.age}: ${rate.employer_rate}. Must be between 0 and 100.` }
    }
  }

  // Delete existing rates
  const { error: deleteError } = await supabase
    .from('employer_contribution_rates')
    .delete()
    .eq('version_id', input.version_id)

  if (deleteError) {
    console.error('Error deleting existing rates:', deleteError)
    return { error: deleteError.message }
  }

  // Insert new rates
  const ratesToInsert = input.rates.map(rate => ({
    version_id: input.version_id,
    age: rate.age,
    gender: rate.gender,
    employee_rate: rate.employee_rate,
    employer_rate: rate.employer_rate
  }))

  const { error: insertError } = await supabase
    .from('employer_contribution_rates')
    .insert(ratesToInsert)

  if (insertError) {
    console.error('Error inserting rates:', insertError)
    return { error: insertError.message }
  }

  // Update version's same_for_all_genders, updated_at and updated_by
  const { error: updateError } = await supabase
    .from('employer_contribution_rate_versions')
    .update({
      same_for_all_genders: input.same_for_all_genders,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    })
    .eq('id', input.version_id)

  if (updateError) {
    console.error('Error updating version:', updateError)
    return { error: updateError.message }
  }

  revalidatePath('/settings/contribution-rates')
  return {
    success: true,
    message: 'Gender setting updated successfully'
  }
}
