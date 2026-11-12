-- Phase 1: keep booking_ratings slim; fix cached avg+count on drivers.
-- Driver app and admin already read drivers.rating_average / rating_count.

CREATE OR REPLACE FUNCTION public.recalculate_driver_rating(p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_driver_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.drivers d
  SET
    rating_average = COALESCE(s.avg_rating, 0),
    rating_count = COALESCE(s.rating_count, 0),
    updated_at = now()
  FROM (
    SELECT
      ROUND(AVG(br.rating)::numeric, 2) AS avg_rating,
      COUNT(*)::integer AS rating_count
    FROM public.booking_ratings br
    WHERE br.driver_id = p_driver_id
  ) s
  WHERE d.id = p_driver_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_recalculate_driver_rating_from_booking_ratings()
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
    v_old := OLD.driver_id;
    IF v_old IS NOT NULL THEN
      PERFORM public.recalculate_driver_rating(v_old);
    END IF;
    RETURN OLD;
  END IF;

  v_new := NEW.driver_id;
  v_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.driver_id ELSE NULL END;

  IF v_new IS NOT NULL THEN
    PERFORM public.recalculate_driver_rating(v_new);
  END IF;

  IF v_old IS NOT NULL AND v_old IS DISTINCT FROM v_new THEN
    PERFORM public.recalculate_driver_rating(v_old);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_booking_ratings_recalc_driver ON public.booking_ratings;
CREATE TRIGGER trg_booking_ratings_recalc_driver
AFTER INSERT OR UPDATE OF driver_id, rating OR DELETE
ON public.booking_ratings
FOR EACH ROW
EXECUTE FUNCTION public.trg_recalculate_driver_rating_from_booking_ratings();

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT x.driver_id
    FROM (
      SELECT driver_id FROM public.booking_ratings WHERE driver_id IS NOT NULL
      UNION
      SELECT id FROM public.drivers
      WHERE deleted_at IS NULL
        AND (
          COALESCE(rating_count, 0) <> 0
          OR COALESCE(rating_average, 0) <> 0
        )
    ) x
  LOOP
    PERFORM public.recalculate_driver_rating(r.driver_id);
  END LOOP;

  UPDATE public.drivers d
  SET rating_average = 0,
      rating_count = 0,
      updated_at = now()
  WHERE d.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_ratings br WHERE br.driver_id = d.id
    )
    AND (
      COALESCE(d.rating_count, 0) <> 0
      OR COALESCE(d.rating_average, 0) <> 0
    );
END $$;
