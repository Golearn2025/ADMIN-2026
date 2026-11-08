-- Vehicle photos optional until driver app supports reliable upload
UPDATE required_documents
SET requirement_level = 'optional'
WHERE entity_type = 'vehicle'
  AND document_type IN (
    'vehicle_photo_exterior_front',
    'vehicle_photo_exterior_rear',
    'vehicle_photo_interior_front',
    'vehicle_photo_interior_rear'
  )
  AND requirement_level <> 'optional';
