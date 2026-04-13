// =============================================================
// PROJ-19: Payment Orders types
// These types mirror the planned payment_orders table schema.
// Once the backend is built and database.types.ts is regenerated,
// these can be replaced with the auto-generated types.
// =============================================================

export const PAYMENT_ORDER_STATUSES = [
  'draft',
  'in_payment_run',
  'approved',
  'exported',
  'cancelled',
] as const

export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUSES)[number]

export interface PaymentOrder {
  id: string
  recipient_name: string
  iban: string
  amount: number
  currency: string
  purpose: string
  reference_number: string | null
  execution_date: string | null
  note: string | null
  status: PaymentOrderStatus
  insured_person_id: string | null
  employment_id: string | null
  created_by: string
  updated_by: string
  version: number
  created_at: string
  updated_at: string
}

export interface PaymentOrderInsert {
  recipient_name: string
  iban: string
  amount: number
  currency?: string
  purpose: string
  reference_number?: string | null
  execution_date?: string | null
  note?: string | null
  status?: PaymentOrderStatus
  insured_person_id?: string | null
  employment_id?: string | null
  force?: boolean
}

export interface PaymentOrderUpdate {
  recipient_name?: string
  iban?: string
  amount?: number
  purpose?: string
  reference_number?: string | null
  execution_date?: string | null
  note?: string | null
  version: number
}

export interface DuplicateCheckResult {
  has_duplicates: boolean
  duplicates: Array<{
    id: string
    recipient_name: string
    iban: string
    amount: number
    purpose: string
    created_at: string
    status: PaymentOrderStatus
  }>
}

/** Statuses that allow editing */
export const EDITABLE_STATUSES: PaymentOrderStatus[] = ['draft']

/** Statuses that allow cancellation */
export const CANCELLABLE_STATUSES: PaymentOrderStatus[] = ['draft', 'in_payment_run']
