import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

// =============================================================
// PROJ-21: GET /api/payment-runs/[id]/exports
// Liefert die Export-Historie eines Zahlungslaufs (ohne xml_content,
// um die Payload klein zu halten).
// =============================================================

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const roleResult = await requireRole('admin')
    if (roleResult.error) {
      return NextResponse.json(
        { error: roleResult.error.error },
        { status: roleResult.error.status }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payment_run_exports')
      .select(
        'id, payment_run_id, exported_at, exported_by, pain_version, filename, message_id, created_at'
      )
      .eq('payment_run_id', id)
      .order('exported_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error loading exports:', error)
      return NextResponse.json({ error: 'Failed to load exports' }, { status: 500 })
    }

    // Enrich with exporter names
    const actorIds = Array.from(new Set((data ?? []).map((e) => e.exported_by)))
    const nameMap: Record<string, string> = {}
    if (actorIds.length > 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', actorIds)
      users?.forEach((u) => {
        nameMap[u.id] = u.full_name ?? u.email ?? ''
      })
    }

    const enriched = (data ?? []).map((row) => ({
      ...row,
      exported_by_name: nameMap[row.exported_by] ?? null,
    }))

    return NextResponse.json({ exports: enriched })
  } catch (err) {
    console.error('Unexpected error in GET /api/payment-runs/[id]/exports:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
