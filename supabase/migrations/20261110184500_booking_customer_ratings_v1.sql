-- Bidirectional ratings (modular):
-- booking_ratings = customer → driver (existing)
-- booking_customer_ratings = driver → customer (new)

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS rating_average numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.booking_customer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  driver_id uuid NULL REFERENCES public.drivers(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NULL,
  rated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_customer_ratings_booking_id_key UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_customer_ratings_customer_id
  ON public.booking_customer_ratings (customer_id);

CREATE INDEX IF NOT EXISTS idx_booking_customer_ratings_driver_id
  ON public.booking_customer_ratings (driver_id);

CREATE OR REPLACE FUNCTION public.recalculate_customer_rating(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.customers c
  SET
    rating_average = COALESCE(s.avg_rating, 0),
    rating_count = COALESCE(s.rating_count, 0),
    updated_at = now()
  FROM (
    SELECT
      ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
      COUNT(*)::integer AS rating_count
    FROM public.booking_customer_ratings r
    WHERE r.customer_id = p_customer_id
  ) s
  WHERE c.id = p_customer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_recalculate_customer_rating_from_booking_customer_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old uuid;
  v_new uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := OLD.customer_id;
    IF v_old IS NOT NULL THEN
      PERFORM public.recalculate_customer_rating(v_old);
    END IF;
    RETURN OLD;
  END IF;

  v_new := NEW.customer_id;
  v_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.customer_id ELSE NULL END;

  IF v_new IS NOT NULL THEN
    PERFORM public.recalculate_customer_rating(v_new);
  END IF;

  IF v_old IS NOT NULL AND v_old IS DISTINCT FROM v_new THEN
    PERFORM public.recalculate_customer_rating(v_old);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_booking_customer_ratings_recalc_customer ON public.booking_customer_ratings;
CREATE TRIGGER trg_booking_customer_ratings_recalc_customer
AFTER INSERT OR UPDATE OF customer_id, rating OR DELETE
ON public.booking_customer_ratings
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_customer_rating_from_booking_customer_ratings();

COMMENT ON TABLE public.booking_customer_ratings IS
  'Driver rates customer after trip. Pair of booking_ratings (customer→driver).';
