-- Ensure hire_agreement is optional for compliance (does not block driver approval)
UPDATE required_documents
SET requirement_level = 'optional'
WHERE entity_type = 'vehicle'
  AND document_type = 'hire_agreement'
  AND requirement_level <> 'optional';

-- Seed optional hire_agreement for orgs that have vehicle requirements but no row yet
INSERT INTO required_documents (organization_id, entity_type, document_type, requirement_level)
SELECT o.id, 'vehicle', 'hire_agreement', 'optional'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1
  FROM required_documents rd
  WHERE rd.organization_id = o.id
    AND rd.entity_type = 'vehicle'
    AND rd.document_type = 'hire_agreement'
);
