-- PROJ-20: Atomic RPCs for payment-run approve and reject transitions.
-- Both operations must update payment_runs AND payment_orders in a single
-- transaction to prevent partial state when the cascade write fails.
-- SECURITY DEFINER so the function runs as the schema owner and can write
-- both tables regardless of the calling user's RLS policies.

-- ---------------------------------------------------------------
-- approve_payment_run
-- Transitions: visaed → approved
-- Four-eyes: approver must differ from visaed_by
-- Version-lock: raises 'version_conflict' if expected_version mismatches
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_payment_run(
  p_run_id          UUID,
  p_actor_id        UUID,
  p_expected_version INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run     RECORD;
  v_updated RECORD;
BEGIN
  -- Lock row to prevent concurrent state changes
  SELECT * INTO v_run FROM payment_runs WHERE id = p_run_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING DETAIL = 'Payment run not found';
  END IF;

  IF v_run.status <> 'visaed' THEN
    RAISE EXCEPTION 'invalid_status' USING DETAIL = 'Only visaed runs can be approved';
  END IF;

  IF v_run.version <> p_expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING DETAIL = 'Concurrent modification detected';
  END IF;

  IF v_run.visaed_by = p_actor_id THEN
    RAISE EXCEPTION 'four_eyes_violation' USING DETAIL = 'Approver must differ from visa issuer';
  END IF;

  -- Atomic: update run status
  UPDATE payment_runs
  SET
    status      = 'approved',
    approved_by = p_actor_id,
    approved_at = NOW(),
    version     = p_expected_version + 1
  WHERE id = p_run_id
  RETURNING * INTO v_updated;

  -- Atomic: cascade to contained orders
  UPDATE payment_orders
  SET status = 'approved', updated_by = p_actor_id
  WHERE payment_run_id = p_run_id AND status = 'in_payment_run';

  -- Audit trail
  INSERT INTO payment_run_events (payment_run_id, event_type, actor_id, payload)
  VALUES (p_run_id, 'approved', p_actor_id, NULL);

  RETURN to_jsonb(v_updated);
END;
$$;

-- ---------------------------------------------------------------
-- reject_payment_run
-- Transitions: in_review | visaed → rejected
-- Returns all in_payment_run orders back to draft and detaches them
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION reject_payment_run(
  p_run_id          UUID,
  p_actor_id        UUID,
  p_expected_version INT,
  p_reason          TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run     RECORD;
  v_updated RECORD;
BEGIN
  SELECT * INTO v_run FROM payment_runs WHERE id = p_run_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING DETAIL = 'Payment run not found';
  END IF;

  IF v_run.status NOT IN ('in_review', 'visaed') THEN
    RAISE EXCEPTION 'invalid_status' USING DETAIL = 'Only in_review or visaed runs can be rejected';
  END IF;

  IF v_run.version <> p_expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING DETAIL = 'Concurrent modification detected';
  END IF;

  -- Atomic: update run status
  UPDATE payment_runs
  SET
    status           = 'rejected',
    rejected_by      = p_actor_id,
    rejected_at      = NOW(),
    rejection_reason = p_reason,
    version          = p_expected_version + 1
  WHERE id = p_run_id
  RETURNING * INTO v_updated;

  -- Atomic: return orders to draft and detach from run
  UPDATE payment_orders
  SET status = 'draft', payment_run_id = NULL, updated_by = p_actor_id
  WHERE payment_run_id = p_run_id AND status = 'in_payment_run';

  -- Audit trail — include from_status so reviewers can distinguish in_review vs visaed rejections
  INSERT INTO payment_run_events (payment_run_id, event_type, actor_id, payload)
  VALUES (p_run_id, 'rejected', p_actor_id, jsonb_build_object('reason', p_reason, 'from_status', v_run.status));

  RETURN to_jsonb(v_updated);
END;
$$;

-- Restrict execution to authenticated service role only
REVOKE ALL ON FUNCTION approve_payment_run(UUID, UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reject_payment_run(UUID, UUID, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_payment_run(UUID, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION reject_payment_run(UUID, UUID, INT, TEXT) TO service_role;
