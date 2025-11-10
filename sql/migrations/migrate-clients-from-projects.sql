-- Migrate clients from existing projects to the clients table
-- This script extracts unique client_name values from projects and creates client records
-- Run this after the clients table has been created

-- 1. Insert unique clients from existing projects
INSERT INTO clients (contractor_id, name, status, created_at, updated_at)
SELECT DISTINCT 
    p.contractor_id,
    p.client_name as name,
    'active' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM projects p
WHERE p.client_name IS NOT NULL 
    AND p.client_name != ''
    AND NOT EXISTS (
        -- Avoid duplicates if script is run multiple times
        SELECT 1 FROM clients c 
        WHERE c.contractor_id = p.contractor_id 
        AND LOWER(TRIM(c.name)) = LOWER(TRIM(p.client_name))
    );

-- 2. Show results
SELECT 
    c.name as "Client Name",
    cont.company_name as "Contractor",
    COUNT(p.id) as "Project Count",
    MIN(p.created_at) as "First Project",
    MAX(p.created_at) as "Latest Project"
FROM clients c
JOIN contractors cont ON c.contractor_id = cont.id
LEFT JOIN projects p ON p.contractor_id = c.contractor_id 
    AND LOWER(TRIM(p.client_name)) = LOWER(TRIM(c.name))
GROUP BY c.id, c.name, cont.company_name
ORDER BY cont.company_name, "Project Count" DESC;

-- 3. Add comment for future reference
COMMENT ON TABLE clients IS 'Client management for contractors - populated from existing project data and new client creation';