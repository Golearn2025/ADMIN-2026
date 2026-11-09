-- Mercedes EQS catalog model (used by driver/admin vehicle create/edit)
INSERT INTO vehicle_model_catalog (id, label, category_id)
VALUES ('mercedes-eqs', 'Mercedes EQS', 'luxury')
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    category_id = EXCLUDED.category_id;
