-- Show vehicle plate in admin bookings even when booking_legs.assigned_vehicle_id
-- is null. Driver accept often sets assigned_driver_id only; plate comes from
-- the driver's linked vehicle (vehicles.driver_id).

CREATE OR REPLACE VIEW admin_booking_list AS
WITH main_leg AS (
  SELECT DISTINCT ON (bl.booking_id)
    bl.booking_id,
    bl.id AS main_leg_id,
    bl.leg_number,
    bl.leg_kind,
    bl.status AS leg_status,
    bl.scheduled_at,
    bl.pickup_address,
    bl.dropoff_address,
    bl.assigned_driver_id,
    bl.assigned_vehicle_id,
    bl.distance_miles,
    bl.duration_min,
    bl.vehicle_category_id,
    bl.vehicle_model_id
  FROM booking_legs bl
  WHERE bl.deleted_at IS NULL
  ORDER BY
    bl.booking_id,
    CASE
      WHEN lower(bl.leg_kind::text) = 'main' THEN 0
      WHEN bl.leg_number = 1 THEN 1
      ELSE 2
    END,
    bl.leg_number,
    bl.created_at
),
return_leg AS (
  SELECT DISTINCT ON (bl.booking_id)
    bl.booking_id,
    bl.scheduled_at AS return_scheduled_at
  FROM booking_legs bl
  WHERE bl.deleted_at IS NULL
    AND (lower(bl.leg_kind::text) = 'return' OR bl.leg_number = 2)
  ORDER BY
    bl.booking_id,
    CASE WHEN lower(bl.leg_kind::text) = 'return' THEN 0 ELSE 1 END,
    bl.leg_number,
    bl.created_at DESC
),
vr_pick AS (
  SELECT DISTINCT ON (vr.booking_id)
    vr.booking_id,
    vr.vehicle_category_id,
    vr.vehicle_model_id
  FROM booking_vehicle_requests vr
  ORDER BY vr.booking_id, vr.created_at DESC NULLS LAST, vr.id DESC
),
vr_qty AS (
  SELECT vr.booking_id, SUM(COALESCE(vr.quantity, 0))::integer AS fleet_size
  FROM booking_vehicle_requests vr
  GROUP BY vr.booking_id
),
vr_summary AS (
  SELECT
    vr.booking_id,
    string_agg(
      COALESCE(vm.label, vr.vehicle_model_id) || ' x' || COALESCE(vr.quantity, 0)::text,
      ', ' ORDER BY COALESCE(vm.label, vr.vehicle_model_id)
    ) AS requested_vehicle_summary
  FROM booking_vehicle_requests vr
  LEFT JOIN vehicle_model_catalog vm ON vm.id = vr.vehicle_model_id
  GROUP BY vr.booking_id
),
latest_payment AS (
  SELECT DISTINCT ON (bp.booking_id)
    bp.booking_id,
    bp.status AS latest_payment_status,
    bp.amount_pence AS latest_payment_amount_pence,
    bp.currency AS latest_payment_currency,
    bp.created_at AS latest_payment_created_at
  FROM booking_payments bp
  WHERE bp.deleted_at IS NULL
  ORDER BY bp.booking_id, bp.created_at DESC
),
paid_totals AS (
  SELECT
    bp.booking_id,
    SUM(CASE WHEN bp.status = 'succeeded' AND bp.deleted_at IS NULL THEN bp.amount_pence ELSE 0 END)::integer AS total_paid_pence
  FROM booking_payments bp
  GROUP BY bp.booking_id
),
latest_fin AS (
  SELECT DISTINCT ON (f.booking_id)
    f.booking_id,
    f.gross_amount_pence,
    f.platform_fee_pence,
    f.platform_profit_pence,
    f.currency AS financial_currency,
    f.pricing_source,
    f.version
  FROM internal_booking_financials f
  ORDER BY f.booking_id, f.version DESC, f.created_at DESC
),
resolved_vehicle AS (
  SELECT
    b.id AS booking_id,
    COALESCE(
      vr.vehicle_category_id,
      ml.vehicle_category_id,
      b.trip_configuration_raw #>> '{selectedVehicle,category,id}',
      b.trip_configuration_raw #>> '{vehicleType}'
    ) AS requested_vehicle_category_id,
    COALESCE(
      vr.vehicle_model_id,
      ml.vehicle_model_id,
      b.trip_configuration_raw #>> '{selectedVehicle,model,id}',
      NULLIF(b.trip_configuration_raw #>> '{vehicleModel}', '')
    ) AS requested_vehicle_model_id
  FROM bookings b
  LEFT JOIN main_leg ml ON ml.booking_id = b.id
  LEFT JOIN vr_pick vr ON vr.booking_id = b.id
  WHERE b.deleted_at IS NULL
),
driver_vehicle AS (
  SELECT DISTINCT ON (v.driver_id)
    v.id,
    v.driver_id,
    v.license_plate,
    v.make,
    v.model,
    v.category_id,
    v.model_id,
    v.status,
    v.organization_id
  FROM vehicles v
  WHERE v.deleted_at IS NULL
    AND v.driver_id IS NOT NULL
  ORDER BY
    v.driver_id,
    CASE lower(COALESCE(v.status, ''))
      WHEN 'active' THEN 0
      WHEN 'approved' THEN 1
      ELSE 2
    END,
    v.updated_at DESC NULLS LAST,
    v.created_at DESC
)
SELECT
  b.id,
  b.customer_id,
  b.organization_id,
  b.booking_type,
  b.fleet_mode,
  b.status,
  b.currency,
  b.source,
  b.start_at,
  b.end_at,
  b.hours_requested,
  b.days_requested,
  b.passenger_count,
  b.bag_count,
  b.custom_requirements,
  b.billing_entity_id,
  b.trip_configuration_raw,
  b.reference,
  b.notes_internal,
  b.created_at,
  b.updated_at,
  b.deleted_at,
  c.first_name AS customer_first_name,
  c.last_name AS customer_last_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  ml.pickup_address,
  ml.dropoff_address,
  ml.scheduled_at,
  ml.leg_status AS trip_status,
  ml.assigned_driver_id,
  ml.assigned_vehicle_id,
  TRIM(BOTH FROM d.first_name || ' ' || d.last_name) AS driver_name,
  d.phone AS driver_phone,
  d.status AS driver_status,
  d.organization_id AS driver_org_id,
  COALESCE(v_assigned.license_plate, dv.license_plate) AS vehicle_plate,
  NULLIF(
    TRIM(
      BOTH FROM
      COALESCE(v_assigned.make, dv.make, '') || ' ' || COALESCE(v_assigned.model, dv.model, '')
    ),
    ''
  ) AS vehicle_make_model,
  COALESCE(v_assigned.category_id, dv.category_id) AS vehicle_category_id,
  COALESCE(v_assigned.model_id, dv.model_id) AS vehicle_model_id,
  COALESCE(v_assigned.status, dv.status) AS vehicle_status,
  COALESCE(v_assigned.organization_id, dv.organization_id) AS vehicle_org_id,
  lp.latest_payment_status::text AS latest_payment_status,
  lp.latest_payment_amount_pence,
  lp.latest_payment_currency,
  lp.latest_payment_created_at,
  COALESCE(pt.total_paid_pence, 0) AS total_paid_pence,
  lf.gross_amount_pence,
  lf.platform_fee_pence,
  lf.platform_profit_pence,
  lf.financial_currency,
  lf.pricing_source,
  lf.version AS financial_version,
  COALESCE(lf.gross_amount_pence, lp.latest_payment_amount_pence) AS display_price_pence,
  lf.gross_amount_pence IS NOT NULL AS has_financial_snapshot,
  CASE
    WHEN lf.gross_amount_pence IS NULL THEN 'snapshot_missing'
    WHEN lp.latest_payment_status = 'succeeded' THEN 'financial_confirmed'
    WHEN lp.latest_payment_status = 'pending' THEN 'awaiting_capture'
    ELSE 'no_payment'
  END AS financial_status,
  ml.distance_miles,
  ml.duration_min,
  rv.requested_vehicle_category_id,
  rv.requested_vehicle_model_id,
  COALESCE(vcc_req.label, b.trip_configuration_raw #>> '{selectedVehicle,category,name}') AS requested_vehicle_category_label,
  COALESCE(vm_req.label, b.trip_configuration_raw #>> '{selectedVehicle,model,name}') AS requested_vehicle_model_label,
  vcc_ass.label AS assigned_vehicle_category_label,
  vm_ass.label AS assigned_vehicle_model_label,
  COALESCE(b.hours_requested, 0) AS booked_hours,
  COALESCE(b.days_requested, 0) AS booked_days,
  rl.return_scheduled_at,
  COALESCE(vrq.fleet_size, 0) AS fleet_size,
  vrs.requested_vehicle_summary,
  CASE
    WHEN COALESCE(vrq.fleet_size, 0) > 1 THEN COALESCE(vrs.requested_vehicle_summary, vcc_req.label)
    WHEN vm_req.label IS NOT NULL AND vcc_req.label IS NOT NULL THEN vcc_req.label || ' · ' || vm_req.label
    WHEN vm_req.label IS NOT NULL THEN vm_req.label
    ELSE vcc_req.label
  END AS requested_vehicle_display
FROM bookings b
JOIN customers c ON c.id = b.customer_id
LEFT JOIN main_leg ml ON ml.booking_id = b.id
LEFT JOIN return_leg rl ON rl.booking_id = b.id
LEFT JOIN resolved_vehicle rv ON rv.booking_id = b.id
LEFT JOIN vr_qty vrq ON vrq.booking_id = b.id
LEFT JOIN vr_summary vrs ON vrs.booking_id = b.id
LEFT JOIN latest_payment lp ON lp.booking_id = b.id
LEFT JOIN paid_totals pt ON pt.booking_id = b.id
LEFT JOIN latest_fin lf ON lf.booking_id = b.id
LEFT JOIN drivers d ON d.id = ml.assigned_driver_id AND d.deleted_at IS NULL
LEFT JOIN vehicles v_assigned ON v_assigned.id = ml.assigned_vehicle_id AND v_assigned.deleted_at IS NULL
LEFT JOIN driver_vehicle dv ON dv.driver_id = ml.assigned_driver_id
LEFT JOIN vehicle_category_catalog vcc_req ON vcc_req.id = rv.requested_vehicle_category_id
LEFT JOIN vehicle_model_catalog vm_req ON vm_req.id = rv.requested_vehicle_model_id
LEFT JOIN vehicle_category_catalog vcc_ass ON vcc_ass.id = COALESCE(v_assigned.category_id, dv.category_id)
LEFT JOIN vehicle_model_catalog vm_ass ON vm_ass.id = COALESCE(v_assigned.model_id, dv.model_id)
WHERE b.deleted_at IS NULL;
