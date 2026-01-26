'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { EmploymentInsert, EmploymentUpdate, InsuredPersonUpdate } from '@/lib/database.types'

export async function addEmployment(
  insuredPersonId: string,
  data: {
    employer_id: string;
    entry_date: string;
    employment_rate: number;
    is_primary?: boolean;
    notes?: string;
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const employment: EmploymentInsert = {
    insured_person_id: insuredPersonId,
    employer_id: data.employer_id,
    entry_date: data.entry_date,
    employment_rate: data.employment_rate,
    is_primary: data.is_primary ?? false,
    notes: data.notes,
    created_by: user.id,
    updated_by: user.id,
  }

  const { error } = await supabase
    .from('employments')
    .insert(employment)

  if (error) {
    console.error('Error adding employment:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function updateEmployment(
  employmentId: string,
  insuredPersonId: string,
  data: {
    employer_id?: string;
    entry_date?: string;
    exit_date?: string | null;
    employment_rate?: number;
    is_primary?: boolean;
    notes?: string;
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const update: EmploymentUpdate = {
    ...data,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('employments')
    .update(update)
    .eq('id', employmentId)

  if (error) {
    console.error('Error updating employment:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function endEmployment(
  employmentId: string,
  insuredPersonId: string,
  exitDate: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('employments')
    .update({
      exit_date: exitDate,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employmentId)

  if (error) {
    console.error('Error ending employment:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function getEmployers() {
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

export async function changeStatus(
  insuredPersonId: string,
  newStatus: string,
  reason?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Get current status
  const { data: person, error: fetchError } = await supabase
    .from('insured_persons')
    .select('status')
    .eq('id', insuredPersonId)
    .single()

  if (fetchError) {
    console.error('Error fetching person:', fetchError)
    return { error: fetchError.message }
  }

  const oldStatus = person?.status

  // Update status
  const { error: updateError } = await supabase
    .from('insured_persons')
    .update({
      status: newStatus,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', insuredPersonId)

  if (updateError) {
    console.error('Error updating status:', updateError)
    return { error: updateError.message }
  }

  // Record status change in history
  const { error: historyError } = await supabase
    .from('insured_person_status_history')
    .insert({
      insured_person_id: insuredPersonId,
      old_status: oldStatus,
      new_status: newStatus,
      reason: reason || null,
      changed_by: user.id,
    })

  if (historyError) {
    console.error('Error recording status history:', historyError)
    // Don't fail the whole operation for history error
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function updateInsuredPerson(
  insuredPersonId: string,
  data: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: 'm' | 'f' | 'd' | null;
    nationality?: string | null;
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed' | 'registered_partnership' | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    street?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const update: InsuredPersonUpdate = {
    ...data,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('insured_persons')
    .update(update)
    .eq('id', insuredPersonId)

  if (error) {
    console.error('Error updating insured person:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  revalidatePath('/insured')
  return { success: true }
}
