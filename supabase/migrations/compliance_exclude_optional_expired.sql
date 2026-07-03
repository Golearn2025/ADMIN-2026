-- Exclude optional documents (e.g. hire_agreement) from expired compliance counts
CREATE OR REPLACE VIEW driver_compliance_v3 AS
SELECT
  d.id AS driver_id,
  COALESCE(v.total_vehicles, 0::bigint) AS total_vehicles,
  COALESCE(dd.approved_driver_docs, 0::bigint) AS approved_driver_docs,
  COALESCE(dd.expired_driver_docs, 0::bigint) AS expired_driver_docs,
  COALESCE(vd.approved_vehicle_docs, 0::bigint) AS approved_vehicle_docs,
  COALESCE(vd.expired_vehicle_docs, 0::bigint) AS expired_vehicle_docs,
  req.driver_required_docs,
  req.vehicle_required_docs,
  req.driver_required_docs + req.vehicle_required_docs * COALESCE(v.total_vehicles, 0::bigint) AS total_required_docs,
  COALESCE(dd.approved_driver_docs, 0::bigint) + COALESCE(vd.approved_vehicle_docs, 0::bigint) AS total_approved_docs,
  CASE
    WHEN COALESCE(v.total_vehicles, 0::bigint) = 0 THEN 'no_vehicle'::text
    WHEN (req.driver_required_docs + req.vehicle_required_docs * COALESCE(v.total_vehicles, 0::bigint))
      > (COALESCE(dd.approved_driver_docs, 0::bigint) + COALESCE(vd.approved_vehicle_docs, 0::bigint)) THEN 'missing'::text
    WHEN COALESCE(dd.expired_driver_docs, 0::bigint) > 0 OR COALESCE(vd.expired_vehicle_docs, 0::bigint) > 0 THEN 'expired'::text
    ELSE 'ok'::text
  END AS compliance_status,
  CASE
    WHEN d.is_active = true
      AND d.is_approved = true
      AND COALESCE(v.total_vehicles, 0::bigint) > 0
      AND (req.driver_required_docs + req.vehicle_required_docs * COALESCE(v.total_vehicles, 0::bigint))
        = (COALESCE(dd.approved_driver_docs, 0::bigint) + COALESCE(vd.approved_vehicle_docs, 0::bigint))
      AND COALESCE(dd.expired_driver_docs, 0::bigint) = 0
      AND COALESCE(vd.expired_vehicle_docs, 0::bigint) = 0 THEN true
    ELSE false
  END AS can_receive_jobs
FROM drivers d
LEFT JOIN LATERAL (
  SELECT count(*) AS total_vehicles
  FROM vehicles v_1
  WHERE v_1.driver_id = d.id AND v_1.deleted_at IS NULL
) v ON true
LEFT JOIN LATERAL (
  SELECT
    count(DISTINCT dd_1.document_type) FILTER (
      WHERE dd_1.status = 'approved'::text
        AND EXISTS (
          SELECT 1 FROM required_documents rd
          WHERE rd.document_type = dd_1.document_type
            AND rd.entity_type = 'driver'::text
            AND rd.requirement_level = 'required'::text
            AND rd.organization_id = d.organization_id
        )
    ) AS approved_driver_docs,
    count(*) FILTER (
      WHERE dd_1.expiry_date < now()
        AND EXISTS (
          SELECT 1 FROM required_documents rd
          WHERE rd.document_type = dd_1.document_type
            AND rd.entity_type = 'driver'::text
            AND rd.requirement_level = 'required'::text
            AND rd.organization_id = d.organization_id
        )
    ) AS expired_driver_docs
  FROM driver_documents dd_1
  WHERE dd_1.driver_id = d.id
) dd ON true
LEFT JOIN LATERAL (
  SELECT
    count(DISTINCT (vd_1.document_type || '-'::text) || vd_1.vehicle_id) FILTER (
      WHERE vd_1.status = 'approved'::text
        AND EXISTS (
          SELECT 1 FROM required_documents rd
          WHERE rd.document_type = vd_1.document_type
            AND rd.entity_type = 'vehicle'::text
            AND rd.requirement_level = 'required'::text
            AND rd.organization_id = d.organization_id
        )
    ) AS approved_vehicle_docs,
    count(*) FILTER (
      WHERE vd_1.expiry_date < now()
        AND EXISTS (
          SELECT 1 FROM required_documents rd
          WHERE rd.document_type = vd_1.document_type
            AND rd.entity_type = 'vehicle'::text
            AND rd.requirement_level = 'required'::text
            AND rd.organization_id = d.organization_id
        )
    ) AS expired_vehicle_docs
  FROM vehicle_documents vd_1
  JOIN vehicles v2 ON v2.id = vd_1.vehicle_id
  WHERE v2.driver_id = d.id
) vd ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (
      WHERE required_documents.entity_type = 'driver'::text
        AND required_documents.requirement_level = 'required'::text
        AND required_documents.organization_id = d.organization_id
    ) AS driver_required_docs,
    count(*) FILTER (
      WHERE required_documents.entity_type = 'vehicle'::text
        AND required_documents.requirement_level = 'required'::text
        AND required_documents.organization_id = d.organization_id
    ) AS vehicle_required_docs
  FROM required_documents
) req ON true
WHERE d.deleted_at IS NULL;

GRANT SELECT ON driver_compliance_v3 TO authenticated;
GRANT SELECT ON driver_compliance_v3 TO service_role;
