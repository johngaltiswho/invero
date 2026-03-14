-- Fix RLS policies for audit_logs table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

-- Allow service role to insert (for server-side logging)
CREATE POLICY "Service role can insert audit logs"
ON audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow service role to read (for API endpoints using service role key)
CREATE POLICY "Service role can read audit logs"
ON audit_logs
FOR SELECT
TO service_role
USING (true);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to service role
GRANT ALL ON audit_logs TO service_role;
