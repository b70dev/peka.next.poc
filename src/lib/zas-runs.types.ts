// =============================================================
// PROJ-23: Shared types for the ZAS Lebensnachweis frontend.
// These mirror the row shapes returned by the API routes
// (`src/app/api/zas-runs/...`) and the database tables
// `zas_life_verification_runs` / `zas_life_verification_deaths`.
// =============================================================

export const ZAS_RUN_STATUSES = [
  'request_created',
  'response_imported',
  'completed',
  'completed_without_response',
] as const

export type ZasRunStatus = (typeof ZAS_RUN_STATUSES)[number]

export const ZAS_DEATH_STATUSES = ['open', 'processed', 'already_known'] as const

export type ZasDeathStatus = (typeof ZAS_DEATH_STATUSES)[number]

/**
 * One row in the runs overview table.
 * Matches the JSON shape returned by GET /api/zas-runs.
 */
export interface ZasRun {
  id: string
  status: ZasRunStatus
  pensioner_count: number
  request_filename: string | null
  request_generated_at: string | null
  response_imported_at: string | null
  response_imported_by: string | null
  completed_at: string | null
  completed_by: string | null
  created_at: string
  created_by: string | null
}

/**
 * Aggregated counts for the run overview table.
 * The list endpoint does NOT join deaths; counts are loaded
 * via a small follow-up query and merged into rows.
 */
export interface ZasRunWithCounts extends ZasRun {
  death_count: number
  open_death_count: number
  created_by_name: string | null
}

/**
 * One reported death entry. Matches GET /api/zas-runs/[id].deaths[].
 */
export interface ZasDeath {
  id: string
  run_id: string
  insured_person_id: string | null
  ahv_number: string
  last_name: string | null
  first_name: string | null
  date_of_death: string | null
  status: ZasDeathStatus
  processed_at: string | null
  processed_by: string | null
  notes: string | null
  created_at: string
}
