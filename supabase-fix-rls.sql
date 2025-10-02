-- Simple RLS policies - Service role for API, no complex JWT integration needed

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Contractors can view own data" ON contractors;
DROP POLICY IF EXISTS "Contractors can update own data" ON contractors;
DROP POLICY IF EXISTS "Service role has full access" ON contractors;
DROP POLICY IF EXISTS "Anyone can apply" ON contractors;
DROP POLICY IF EXISTS "Anonymous can apply" ON contractors;
DROP POLICY IF EXISTS "Users can create own contractor" ON contractors;

-- Service role has full access (API routes use this)
CREATE POLICY "Service role has full access" ON contractors 
    FOR ALL USING (auth.role() = 'service_role');

-- For future frontend access (if needed), but not required for contractor applications
-- CREATE POLICY "Contractors can view own data" ON contractors 
--     FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');