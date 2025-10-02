-- Supabase Storage setup for contractor documents
-- Run these commands in your Supabase SQL Editor

-- 1. Create storage bucket for contractor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-documents', 'contractor-documents', false);

-- 2. Set up RLS policies for contractor documents bucket

-- Allow contractors to upload their own documents
CREATE POLICY "Contractors can upload own documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'contractor-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Allow contractors to view their own documents
CREATE POLICY "Contractors can view own documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'contractor-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Allow contractors to update their own documents
CREATE POLICY "Contractors can update own documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'contractor-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Allow contractors to delete their own documents
CREATE POLICY "Contractors can delete own documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'contractor-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
  )
);

-- Admin access to all documents (for verification)
CREATE POLICY "Service role has full access to contractor documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'contractor-documents' AND auth.role() = 'service_role');

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;