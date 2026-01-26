'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { InsuredPersonInsert, EmploymentInsert } from '@/lib/database.types'
import { validateAhvNumber } from '@/lib/ahv-validation'

interface CreateInsuredPersonData {
  // Personal data
  first_name: string
  last_name: string
  ahv_number: string
  date_of_birth: string
  gender?: 'm' | 'f' | 'd' | null
  nationality?: string | null
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'registered_partnership' | null

  // Contact data
  email?: string | null
  phone?: string | null
  mobile?: string | null

  // Address
  street?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null

  // Emergency contact
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null

  // Notes
  notes?: string | null

  // First employment (required)
  employment: {
    employer_id: string
    entry_date: string
    employment_rate: number
  }
}

export async function createInsuredPerson(data: CreateInsuredPersonData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Validate AHV number
  const ahvValidation = validateAhvNumber(data.ahv_number)
  if (!ahvValidation.valid) {
    return { error: ahvValidation.error }
  }

  // Normalize AHV number (remove dots for storage)
  const normalizedAhv = data.ahv_number.replace(/\./g, '')

  // Check if AHV number already exists
  const { data: existing, error: checkError } = await supabase
    .from('insured_persons')
    .select('id')
    .eq('ahv_number', normalizedAhv)
    .maybeSingle()

  if (checkError) {
    console.error('Error checking AHV number:', checkError)
    return { error: 'dbError' }
  }

  if (existing) {
    return { error: 'ahvAlreadyExists' }
  }

  // Create insured person
  const insuredPerson: InsuredPersonInsert = {
    first_name: data.first_name,
    last_name: data.last_name,
    ahv_number: normalizedAhv,
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    nationality: data.nationality,
    marital_status: data.marital_status,
    email: data.email,
    phone: data.phone,
    mobile: data.mobile,
    street: data.street,
    postal_code: data.postal_code,
    city: data.city,
    country: data.country || 'CH',
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_phone: data.emergency_contact_phone,
    notes: data.notes,
    status: 'active',
    entry_date: data.employment.entry_date,
    employer_id: data.employment.employer_id,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data: newPerson, error: insertError } = await supabase
    .from('insured_persons')
    .insert(insuredPerson)
    .select('id')
    .single()

  if (insertError) {
    console.error('Error creating insured person:', insertError)
    return { error: insertError.message }
  }

  // Create employment record
  const employment: EmploymentInsert = {
    insured_person_id: newPerson.id,
    employer_id: data.employment.employer_id,
    entry_date: data.employment.entry_date,
    employment_rate: data.employment.employment_rate,
    is_primary: true,
    created_by: user.id,
    updated_by: user.id,
  }

  const { error: employmentError } = await supabase
    .from('employments')
    .insert(employment)

  if (employmentError) {
    console.error('Error creating employment:', employmentError)
    // Don't fail the whole operation, but log the error
  }

  revalidatePath('/insured')
  return { success: true, id: newPerson.id }
}

export async function getEmployersForSelect() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching employers:', error)
    return { error: error.message, employers: [] }
  }

  return { employers: data || [] }
}
