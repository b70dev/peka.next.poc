#!/usr/bin/env node
// Regenerates src/lib/database.types.ts from the live Supabase schema
// and re-appends the manual convenience type aliases that the
// `supabase gen types` CLI does not produce.
//
// Usage:
//   export SUPABASE_ACCESS_TOKEN=sbp_...   (PAT from supabase.com/dashboard/account/tokens)
//   npm run db:types

import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const PROJECT_ID = "yobxyotvvhxwvkgxsxhx"
const __dirname = dirname(fileURLToPath(import.meta.url))
const TARGET = join(__dirname, "..", "src", "lib", "database.types.ts")

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "ERROR: SUPABASE_ACCESS_TOKEN is not set.\n" +
      "Create a Personal Access Token at https://supabase.com/dashboard/account/tokens\n" +
      "and export it before running this script.",
  )
  process.exit(1)
}

const ALIASES = `
// Convenience type aliases for common operations

// Employments
export type Employment = Database["public"]["Tables"]["employments"]["Row"]
export type EmploymentRow = Database["public"]["Tables"]["employments"]["Row"]
export type EmploymentInsert = Database["public"]["Tables"]["employments"]["Insert"]
export type EmploymentUpdate = Database["public"]["Tables"]["employments"]["Update"]

// Insured Persons
export type InsuredPerson = Database["public"]["Tables"]["insured_persons"]["Row"]
export type InsuredPersonRow = Database["public"]["Tables"]["insured_persons"]["Row"]
export type InsuredPersonInsert = Database["public"]["Tables"]["insured_persons"]["Insert"]
export type InsuredPersonUpdate = Database["public"]["Tables"]["insured_persons"]["Update"]
export type InsuredPersonStatus = Database["public"]["Enums"]["insured_person_status"]

// Employers
export type Employer = Database["public"]["Tables"]["employers"]["Row"]
export type EmployerRow = Database["public"]["Tables"]["employers"]["Row"]
export type EmployerInsert = Database["public"]["Tables"]["employers"]["Insert"]
export type EmployerUpdate = Database["public"]["Tables"]["employers"]["Update"]

// Projections
export type Projection = Database["public"]["Tables"]["projections"]["Row"]
export type ProjectionRow = Database["public"]["Tables"]["projections"]["Row"]
export type ProjectionInsert = Database["public"]["Tables"]["projections"]["Insert"]
export type ProjectionUpdate = Database["public"]["Tables"]["projections"]["Update"]

export type ProjectionScenario = Database["public"]["Tables"]["projection_scenarios"]["Row"]
export type ProjectionScenarioRow = Database["public"]["Tables"]["projection_scenarios"]["Row"]
export type ProjectionScenarioInsert = Database["public"]["Tables"]["projection_scenarios"]["Insert"]
export type ProjectionScenarioUpdate = Database["public"]["Tables"]["projection_scenarios"]["Update"]

// Accounts
export type Account = Database["public"]["Tables"]["accounts"]["Row"]
export type AccountType = Database["public"]["Tables"]["account_types"]["Row"]
export type AccountBalance = Database["public"]["Views"]["account_balances"]["Row"]
export type AccountSummary = Database["public"]["Views"]["account_summaries"]["Row"]
export type BalanceEffect = Database["public"]["Enums"]["balance_effect"]

// Transactions
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type TransactionType = Database["public"]["Tables"]["transaction_types"]["Row"]
export type TransactionEffect = Database["public"]["Enums"]["transaction_effect"]

// For the transactions with running balance function result
export type TransactionWithRunningBalance = Database["public"]["Functions"]["get_transactions_with_running_balance"]["Returns"][number]

// Contribution Rate Versions
export type ContributionRateVersion = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Row"]
export type ContributionRateVersionRow = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Row"]
export type ContributionRateVersionInsert = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Insert"]
export type ContributionRateVersionUpdate = Database["public"]["Tables"]["employer_contribution_rate_versions"]["Update"]

// Contribution Rates
export type ContributionRate = Database["public"]["Tables"]["employer_contribution_rates"]["Row"]
export type ContributionRateRow = Database["public"]["Tables"]["employer_contribution_rates"]["Row"]
export type ContributionRateInsert = Database["public"]["Tables"]["employer_contribution_rates"]["Insert"]
export type ContributionRateUpdate = Database["public"]["Tables"]["employer_contribution_rates"]["Update"]

// BVG Minimum Rates (from function)
export type BvgMinimumRate = Database["public"]["Functions"]["get_bvg_minimum_rates"]["Returns"][number]

// Contribution Rate for Age (from function)
export type ContributionRateForAge = Database["public"]["Functions"]["get_contribution_rate_for_age"]["Returns"][number]

// User Profiles
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
export type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"]
export type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"]
export type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]

// User Role Audit Log
export type UserRoleAuditLog = Database["public"]["Tables"]["user_role_audit_log"]["Row"]
export type UserRoleAuditLogRow = Database["public"]["Tables"]["user_role_audit_log"]["Row"]
export type UserRoleAuditLogInsert = Database["public"]["Tables"]["user_role_audit_log"]["Insert"]
`

const isWindows = process.platform === "win32"
const cmd = `npx -y supabase@latest gen types typescript --project-id ${PROJECT_ID} --schema public`

console.log(`Generating types from project ${PROJECT_ID}...`)
const result = isWindows
  ? spawnSync(cmd, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, shell: true })
  : spawnSync(
      "npx",
      [
        "-y",
        "supabase@latest",
        "gen",
        "types",
        "typescript",
        "--project-id",
        PROJECT_ID,
        "--schema",
        "public",
      ],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
    )

if (result.error || result.status !== 0) {
  console.error("supabase gen types failed:")
  if (result.error) console.error(result.error.message)
  if (result.stderr) console.error(result.stderr)
  process.exit(result.status ?? 1)
}

const generated = result.stdout
if (!generated.includes("export type Database")) {
  console.error("Generated output looks invalid (no `export type Database` found).")
  process.exit(1)
}

writeFileSync(TARGET, generated + ALIASES, "utf8")
console.log(`Wrote ${TARGET}`)
