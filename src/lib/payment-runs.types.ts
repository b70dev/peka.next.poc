// =============================================================
// PROJ-20: Payment Runs types
// Mirrors the planned payment_runs, payment_run_events and
// app_settings tables. Will be replaced by auto-generated types
// once the backend is in place.
// =============================================================

export const PAYMENT_RUN_STATUSES = [
  'draft',
  'in_review',
  'visaed',
  'approved',
  'rejected',
  'exported',
] as const

export type PaymentRunStatus = (typeof PAYMENT_RUN_STATUSES)[number]

export const PAYMENT_RUN_EVENT_TYPES = [
  'created',
  'order_added',
  'order_removed',
  'submitted',
  'visaed',
  'approved',
  'rejected',
  'exported',
  'renamed',
] as const

export type PaymentRunEventType = (typeof PAYMENT_RUN_EVENT_TYPES)[number]

export interface PaymentRun {
  id: string
  name: string
  execution_date: string | null
  status: PaymentRunStatus
  rejection_reason: string | null
  created_by: string
  submitted_by: string | null
  submitted_at: string | null
  visaed_by: string | null
  visaed_at: string | null
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  version: number
  created_at: string
  updated_at: string
}

/** PaymentRun enriched with aggregated order data (joined in queries) */
export interface PaymentRunWithSummary extends PaymentRun {
  order_count: number
  total_amount: number
}

export interface PaymentRunEvent {
  id: string
  payment_run_id: string
  event_type: PaymentRunEventType
  actor_id: string
  actor_name?: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

/** Statuses in which the run can still be edited (name/date, add/remove orders) */
export const EDITABLE_RUN_STATUSES: PaymentRunStatus[] = ['draft']

/** Statuses from which the run can still be cancelled/orders removed */
export const CAN_REMOVE_ORDERS_STATUSES: PaymentRunStatus[] = ['draft']

/** Statuses that allow submitting for review */
export const CAN_SUBMIT_STATUSES: PaymentRunStatus[] = ['draft']

/** Statuses that allow visa (first signature) */
export const CAN_VISA_STATUSES: PaymentRunStatus[] = ['in_review']

/** Statuses that allow approval (second signature) */
export const CAN_APPROVE_STATUSES: PaymentRunStatus[] = ['visaed']

/** Statuses that allow rejection */
export const CAN_REJECT_STATUSES: PaymentRunStatus[] = ['in_review', 'visaed']

/** App settings key for the high-amount threshold */
export const SETTING_HIGH_AMOUNT_THRESHOLD = 'payment_run.high_amount_threshold'
