'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { EmploymentInsert, EmploymentUpdate, InsuredPersonUpdate, Database } from '@/lib/database.types'
import { requireRole } from '@/lib/auth/require-role'

export type AttributeType = Database["public"]["Tables"]["attribute_types"]["Row"]
export type AttributeValue = Database["public"]["Tables"]["attribute_values"]["Row"]
type InsuredPersonAttributeRow = Database["public"]["Tables"]["insured_person_attributes"]["Row"]

export type InsuredPersonAttribute = InsuredPersonAttributeRow & {
  attribute_type?: AttributeType
  attribute_value?: AttributeValue
}

// =============================================================
// PROJ-22: Zod-Schemas für Merkmal-Eingaben
// =============================================================

const AttributeMutationSchema = z.object({
  attribute_type_id: z.string().uuid('Invalid attribute type ID'),
  attribute_value_id: z.string().uuid('Invalid attribute value ID'),
  note: z
    .string()
    .max(500, 'Note must be at most 500 characters')
    .nullish()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
})

const UuidSchema = z.string().uuid('Invalid ID')

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

// -------------------------------------------------------------
// PROJ-22: Merkmale - Read actions (jeder aktive Nutzer inkl. viewer)
// -------------------------------------------------------------

export async function getAttributeMasterData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: 'Unauthorized',
      types: [] as AttributeType[],
      values: [] as AttributeValue[],
    }
  }

  const [typesRes, valuesRes] = await Promise.all([
    supabase
      .from('attribute_types')
      .select('*')
      .order('name')
      .limit(500),
    supabase
      .from('attribute_values')
      .select('*')
      .order('sort_order')
      .order('name')
      .limit(5000),
  ])

  if (typesRes.error) console.error('Error fetching attribute types:', typesRes.error)
  if (valuesRes.error) console.error('Error fetching attribute values:', valuesRes.error)

  return {
    types: (typesRes.data || []) as AttributeType[],
    values: (valuesRes.data || []) as AttributeValue[],
  }
}

export async function getInsuredPersonAttributes(insuredPersonId: string) {
  const idCheck = UuidSchema.safeParse(insuredPersonId)
  if (!idCheck.success) {
    return { error: 'Invalid insured person ID', attributes: [] as InsuredPersonAttribute[] }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', attributes: [] as InsuredPersonAttribute[] }

  const { data, error } = await supabase
    .from('insured_person_attributes')
    .select('*, attribute_type:attribute_types(*), attribute_value:attribute_values(*)')
    .eq('insured_person_id', insuredPersonId)
    .order('created_at')
    .limit(500)

  if (error) {
    console.error('Error fetching attributes:', error)
    return { error: error.message, attributes: [] as InsuredPersonAttribute[] }
  }

  return { attributes: (data || []) as InsuredPersonAttribute[] }
}

// -------------------------------------------------------------
// PROJ-22: Merkmale - Write actions (nur admin/super_admin)
// -------------------------------------------------------------

export async function createAttribute(
  insuredPersonId: string,
  data: { attribute_type_id: string; attribute_value_id: string; note?: string | null }
) {
  // 1. Zod-Validation
  const idCheck = UuidSchema.safeParse(insuredPersonId)
  if (!idCheck.success) {
    return { error: 'Invalid insured person ID' }
  }

  const parsed = AttributeMutationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  // 2. Auth + Rolle (mindestens admin)
  const roleResult = await requireRole('admin')
  if (roleResult.error) {
    return { error: roleResult.error.error }
  }

  // 3. Insert
  const supabase = await createClient()
  const { error } = await supabase
    .from('insured_person_attributes')
    .insert({
      insured_person_id: insuredPersonId,
      attribute_type_id: parsed.data.attribute_type_id,
      attribute_value_id: parsed.data.attribute_value_id,
      note: parsed.data.note,
    })

  if (error) {
    if (error.code === '23505') return { error: 'duplicateAttribute' }
    console.error('Error creating attribute:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function updateAttribute(
  attributeId: string,
  insuredPersonId: string,
  data: { attribute_type_id: string; attribute_value_id: string; note?: string | null }
) {
  // 1. Zod-Validation
  const idCheck = UuidSchema.safeParse(attributeId)
  const insuredIdCheck = UuidSchema.safeParse(insuredPersonId)
  if (!idCheck.success || !insuredIdCheck.success) {
    return { error: 'Invalid ID' }
  }

  const parsed = AttributeMutationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  // 2. Auth + Rolle (mindestens admin)
  const roleResult = await requireRole('admin')
  if (roleResult.error) {
    return { error: roleResult.error.error }
  }

  // 3. Update
  const supabase = await createClient()
  const { error } = await supabase
    .from('insured_person_attributes')
    .update({
      attribute_type_id: parsed.data.attribute_type_id,
      attribute_value_id: parsed.data.attribute_value_id,
      note: parsed.data.note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attributeId)
    .eq('insured_person_id', insuredPersonId)

  if (error) {
    if (error.code === '23505') return { error: 'duplicateAttribute' }
    console.error('Error updating attribute:', error)
    return { error: error.message }
  }

  revalidatePath(`/insured/${insuredPersonId}`)
  return { success: true }
}

export async function deleteAttribute(attributeId: string, insuredPersonId: string) {
  // 1. Zod-Validation
  const idCheck = UuidSchema.safeParse(attributeId)
  const insuredIdCheck = UuidSchema.safeParse(insuredPersonId)
  if (!idCheck.success || !insuredIdCheck.success) {
    return { error: 'Invalid ID' }
  }

  // 2. Auth + Rolle (mindestens admin)
  const roleResult = await requireRole('admin')
  if (roleResult.error) {
    return { error: roleResult.error.error }
  }

  // 3. Delete (scoped auf insured_person_id für zusätzliche Sicherheit)
  const supabase = await createClient()
  const { error } = await supabase
    .from('insured_person_attributes')
    .delete()
    .eq('id', attributeId)
    .eq('insured_person_id', insuredPersonId)

  if (error) {
    console.error('Error deleting attribute:', error)
    return { error: error.message }
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
