-- =====================================================
-- ENHANCE admin_live_drivers_v1 WITH VEHICLE DATA
-- =====================================================
-- Add vehicle_model, vehicle_category, plate_number
-- to the live drivers view for complete UI display
-- =====================================================

CREATE OR REPLACE VIEW admin_live_drivers_v1 AS
SELECT 
  d.id AS driver_id,
  d.first_name,
  d.last_name,
  d.profile_photo_url,
  d.email,
  d.phone,
  d.organization_id,
  o.name AS organization_name,
  dl.lat,
  dl.lng,
  dl.updated_at,
  d.computed_status,
  d.current_booking_id,
  d.rating_average,
  d.total_trips,
  d.vehicle_id,
  v.license_plate AS plate_number,
  v.model_id AS vehicle_model,
  v.category_id AS vehicle_category
FROM 
  drivers d
LEFT JOIN 
  driver_locations dl ON dl.driver_id = d.id
LEFT JOIN 
  organizations o ON o.id = d.organization_id
LEFT JOIN 
  vehicles v ON v.id = d.vehicle_id
WHERE 
  d.computed_status IN ('ONLINE_IDLE', 'ON_TRIP')
  AND dl.lat IS NOT NULL 
  AND dl.lng IS NOT NULL
  AND d.deleted_at IS NULL;

-- Grant access to authenticated users
GRANT SELECT ON admin_live_drivers_v1 TO authenticated;

-- =====================================================
-- NOTES:
-- =====================================================
-- This view now includes:
-- ✅ driver basic info (first_name, last_name, profile_photo_url)
-- ✅ contact (email, phone)
-- ✅ location (lat, lng, updated_at)
-- ✅ status (computed_status, current_booking_id)
-- ✅ organization (organization_id, organization_name)
-- ✅ stats (rating_average, total_trips)
-- ✅ vehicle (vehicle_id, plate_number, vehicle_model, vehicle_category)
--
-- UI can now display complete driver information including:
-- - Profile photo
-- - Full name
-- - Rating and trip count
-- - Vehicle: "BMW 5 Series • Executive • ABC123"
-- - Organization name (not just ID)
-- =====================================================
