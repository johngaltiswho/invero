-- Fix vendors RLS policy to allow access to all vendors
-- Since the current vendors don't have verification_status column

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view verified vendors" ON vendors;

-- Create a new policy that allows viewing all vendors
CREATE POLICY "Anyone can view all vendors" ON vendors 
    FOR SELECT USING (true);

-- Keep the service role policy as is
-- CREATE POLICY "Service role has full vendor access" ON vendors 
--     FOR ALL USING (auth.role() = 'service_role');