-- Audit Trail System for Enterprise-grade Compliance
-- Tracks all critical user actions and changes across the platform

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User information
  user_id VARCHAR NOT NULL,
  user_email VARCHAR,
  user_name VARCHAR,
  user_role VARCHAR,

  -- Action details
  action VARCHAR NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject', 'assign', 'generate', etc.
  entity_type VARCHAR NOT NULL, -- 'purchase_request', 'invoice', 'vendor', 'capital_submission', etc.
  entity_id VARCHAR NOT NULL,

  -- Change tracking
  old_values JSONB, -- Previous state (for updates)
  new_values JSONB, -- New state (for creates/updates)

  -- Context
  description TEXT, -- Human-readable description of the action
  metadata JSONB, -- Additional context (amounts, references, etc.)

  -- Request tracking
  ip_address VARCHAR,
  user_agent TEXT,
  request_id VARCHAR, -- For correlating multiple logs from same request

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_entity ON audit_logs(user_id, entity_type);

-- 3. Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Only service role can write, admins can read
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT
  USING (auth.role() = 'service_role');

-- 5. Create view for recent activity (easier querying)
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT
  al.id,
  al.user_email,
  al.user_name,
  al.user_role,
  al.action,
  al.entity_type,
  al.entity_id,
  al.description,
  al.created_at,
  -- Extract useful metadata
  CASE
    WHEN al.entity_type = 'purchase_request' THEN (al.metadata->>'pr_number')
    WHEN al.entity_type = 'invoice' THEN (al.metadata->>'invoice_number')
    WHEN al.entity_type = 'capital_submission' THEN (al.metadata->>'amount')
    ELSE NULL
  END as reference_number
FROM audit_logs al
ORDER BY al.created_at DESC;

-- 6. Function to get audit trail for specific entity
CREATE OR REPLACE FUNCTION get_entity_audit_trail(
  p_entity_type VARCHAR,
  p_entity_id VARCHAR
)
RETURNS TABLE (
  id UUID,
  user_email VARCHAR,
  user_name VARCHAR,
  action VARCHAR,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.user_email,
    al.user_name,
    al.action,
    al.description,
    al.old_values,
    al.new_values,
    al.created_at
  FROM audit_logs al
  WHERE al.entity_type = p_entity_type
    AND al.entity_id = p_entity_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to clean up old audit logs (optional - for data retention)
-- Run this periodically to keep only last 2 years of logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '2 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all critical user actions in the system';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (approve, reject, create, update, delete, etc.)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being acted upon (purchase_request, invoice, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the specific entity';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous state before the change (for updates)';
COMMENT ON COLUMN audit_logs.new_values IS 'New state after the change (for creates/updates)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like amounts, references, notes';

-- Example usage:
-- SELECT * FROM get_entity_audit_trail('purchase_request', '123e4567-e89b-12d3-a456-426614174000');
-- SELECT * FROM recent_audit_activity LIMIT 50;
