-- =============================================================================
-- 028 — Rate limiting
--
-- Shared counter store for src/lib/rate-limit. Serverless instances do not share
-- memory, so counters live here and are updated atomically by the functions
-- below. Only the service role may read/write; thresholds are passed in by the
-- app (configured via RATE_LIMIT_* env vars), never stored here.
--
-- Two row shapes share the table, distinguished by key prefix:
--   w:*  fixed-window counters  (hits within window_start + window)
--   b:*  exponential backoff    (hits = recent events, blocked_until = delay)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  hits          INTEGER NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at
  ON public.rate_limits(expires_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- -----------------------------------------------------------------------------
-- Housekeeping: drop rows whose window / backoff memory has lapsed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_prune()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE expires_at < clock_timestamp()
    AND (blocked_until IS NULL OR blocked_until < clock_timestamp());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- -----------------------------------------------------------------------------
-- Fixed-window counter: counts this request and reports whether it is allowed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now    TIMESTAMPTZ := clock_timestamp();
  v_window INTERVAL := make_interval(secs => GREATEST(p_window_seconds, 1));
  v_row    public.rate_limits;
BEGIN
  INSERT INTO public.rate_limits AS r (key, hits, window_start, expires_at, updated_at)
  VALUES (p_key, 1, v_now, v_now + v_window, v_now)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.window_start + v_window <= v_now THEN 1 ELSE r.hits + 1 END,
    window_start = CASE WHEN r.window_start + v_window <= v_now THEN v_now ELSE r.window_start END,
    expires_at = CASE WHEN r.window_start + v_window <= v_now THEN v_now + v_window ELSE r.window_start + v_window END,
    updated_at = v_now
  RETURNING * INTO v_row;

  IF random() < 0.01 THEN
    PERFORM public.rate_limit_prune();
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_row.hits <= p_limit,
    'remaining', GREATEST(p_limit - v_row.hits, 0),
    'retry_after', CASE
      WHEN v_row.hits <= p_limit THEN 0
      ELSE GREATEST(CEIL(EXTRACT(EPOCH FROM (v_row.window_start + v_window - v_now))), 1)::INTEGER
    END
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Backoff status: seconds the caller must still wait (0 = may proceed).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_backoff_status(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits;
BEGIN
  SELECT * INTO v_row FROM public.rate_limits WHERE key = p_key;

  IF NOT FOUND OR v_row.blocked_until IS NULL OR v_row.blocked_until <= clock_timestamp() THEN
    RETURN jsonb_build_object('retry_after', 0, 'events', COALESCE(v_row.hits, 0));
  END IF;

  RETURN jsonb_build_object(
    'retry_after', GREATEST(CEIL(EXTRACT(EPOCH FROM (v_row.blocked_until - clock_timestamp()))), 1)::INTEGER,
    'events', v_row.hits
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Backoff record: registers one event (e.g. a failed login). Once the event
-- count reaches p_free_attempts, each further event doubles the wait:
--   delay = min(p_base_delay_seconds * 2^(events - p_free_attempts), p_max_delay_seconds)
-- The count resets after p_reset_after_seconds without new events.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_backoff_record(
  p_key TEXT,
  p_free_attempts INTEGER,
  p_base_delay_seconds INTEGER,
  p_max_delay_seconds INTEGER,
  p_reset_after_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now   TIMESTAMPTZ := clock_timestamp();
  v_reset INTERVAL := make_interval(secs => GREATEST(p_reset_after_seconds, 1));
  v_hits  INTEGER;
  v_delay INTEGER := 0;
BEGIN
  INSERT INTO public.rate_limits AS r (key, hits, window_start, expires_at, updated_at)
  VALUES (p_key, 1, v_now, v_now + v_reset, v_now)
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN r.updated_at + v_reset <= v_now THEN 1 ELSE r.hits + 1 END,
    window_start = CASE WHEN r.updated_at + v_reset <= v_now THEN v_now ELSE r.window_start END,
    blocked_until = CASE WHEN r.updated_at + v_reset <= v_now THEN NULL ELSE r.blocked_until END,
    expires_at = v_now + v_reset,
    updated_at = v_now
  RETURNING hits INTO v_hits;

  IF v_hits >= p_free_attempts THEN
    v_delay := LEAST(
      p_base_delay_seconds::NUMERIC * power(2::NUMERIC, LEAST(v_hits - p_free_attempts, 30)),
      p_max_delay_seconds::NUMERIC
    )::INTEGER;
  END IF;

  IF v_delay > 0 THEN
    UPDATE public.rate_limits
    SET blocked_until = v_now + make_interval(secs => v_delay),
        expires_at = GREATEST(expires_at, v_now + make_interval(secs => v_delay))
    WHERE key = p_key;
  END IF;

  RETURN jsonb_build_object('retry_after', v_delay, 'events', v_hits);
END;
$$;

-- -----------------------------------------------------------------------------
-- Reset: clears a counter (e.g. per-account backoff after a successful login).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rate_limit_reset(p_key TEXT)
RETURNS VOID
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE key = p_key;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_prune() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_backoff_status(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_backoff_record(TEXT, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_reset(TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.rate_limit_prune() TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_backoff_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_backoff_record(TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_reset(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
