-- ============================================================================
-- admin_driver_details_v1
-- Complete driver details with vehicles and documents as JSON arrays
-- ============================================================================

CREATE OR REPLACE VIEW admin_driver_details_v1 AS
SELECT 
  d.id AS driver_id,
  d.first_name,
  d.last_name,
  d.email,
  d.phone,
  d.organization_id,
  d.is_active,
  d.is_approved,
  d.onboarding_status,
  
  -- Profile photo from driver_app_profile
  dap.profile_photo_url,
  
  -- Compliance status
  CASE
    WHEN COUNT(DISTINCT CASE WHEN dd.status = 'approved' THEN dd.id END) >= 6
         AND COUNT(DISTINCT CASE WHEN vd.status = 'approved' THEN vd.id END) >= 5
    THEN 'ok'
    WHEN COUNT(DISTINCT dd.id) = 0 OR COUNT(DISTINCT vd.id) = 0
    THEN 'missing_driver_docs'
    ELSE 'pending'
  END AS compliance_status,
  
  -- Can receive jobs
  (d.is_active 
   AND d.is_approved 
   AND COUNT(DISTINCT CASE WHEN dd.status = 'approved' THEN dd.id END) >= 6
   AND COUNT(DISTINCT CASE WHEN vd.status = 'approved' THEN vd.id END) >= 5
  ) AS can_receive_jobs,
  
  -- Vehicles as JSON array with model info
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', v.id,
        'model_id', v.model_id,
        'model_name', vm.name,
        'make', vm.make,
        'category', v.category,
        'year', v.year,
        'plate', v.plate,
        'color', v.color,
        'status', v.status
      )
    ) FILTER (WHERE v.id IS NOT NULL),
    '[]'::json
  ) AS vehicles,
  
  -- Driver documents as JSON array
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', dd.id,
        'driver_id', dd.driver_id,
        'document_type', dd.document_type,
        'status', dd.status,
        'expiry_date', dd.expiry_date,
        'upload_date', dd.upload_date,
        'document_url', dd.document_url,
        'reviewed_by', dd.reviewed_by,
        'rejection_reason', dd.rejection_reason
      )
    ) FILTER (WHERE dd.id IS NOT NULL),
    '[]'::json
  ) AS driver_documents,
  
  -- Vehicle documents as JSON array
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', vd.id,
        'vehicle_id', vd.vehicle_id,
        'document_type', vd.document_type,
        'status', vd.status,
        'expiry_date', vd.expiry_date,
        'upload_date', vd.upload_date,
        'document_url', vd.document_url,
        'reviewed_by', vd.reviewed_by,
        'rejection_reason', vd.rejection_reason
      )
    ) FILTER (WHERE vd.id IS NOT NULL),
    '[]'::json
  ) AS vehicle_documents,
  
  -- Counts
  COUNT(DISTINCT v.id) AS total_vehicles,
  COUNT(DISTINCT dd.id) AS total_driver_docs,
  COUNT(DISTINCT vd.id) AS total_vehicle_docs,
  COUNT(DISTINCT CASE WHEN dd.status = 'pending' THEN dd.id END) AS pending_driver_docs,
  COUNT(DISTINCT CASE WHEN vd.status = 'pending' THEN vd.id END) AS pending_vehicle_docs,
  COUNT(DISTINCT CASE WHEN dd.expiry_date < CURRENT_DATE THEN dd.id END) AS expired_driver_docs,
  COUNT(DISTINCT CASE WHEN vd.expiry_date < CURRENT_DATE THEN vd.id END) AS expired_vehicle_docs,
  (6 - COUNT(DISTINCT CASE WHEN dd.status = 'approved' THEN dd.id END)) AS missing_driver_docs,
  (5 - COUNT(DISTINCT CASE WHEN vd.status = 'approved' THEN vd.id END)) AS missing_vehicle_docs

FROM drivers d

-- Join profile photo
LEFT JOIN driver_app_profile dap ON dap.driver_id = d.id

-- Join vehicles with model info
LEFT JOIN vehicles v ON v.driver_id = d.id
LEFT JOIN vehicle_models vm ON vm.id = v.model_id

-- Join driver documents
LEFT JOIN driver_documents dd ON dd.driver_id = d.id

-- Join vehicle documents
LEFT JOIN vehicle_documents vd ON vd.vehicle_id = v.id

GROUP BY 
  d.id,
  d.first_name,
  d.last_name,
  d.email,
  d.phone,
  d.organization_id,
  d.is_active,
  d.is_approved,
  d.onboarding_status,
  dap.profile_photo_url;
