-- Create table for storing AI drawing analysis results
CREATE TABLE IF NOT EXISTS drawing_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  analysis_results JSONB NOT NULL,
  project_type TEXT,
  processing_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_analysis_results_user_id ON drawing_analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_analysis_results_project_id ON drawing_analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_analysis_results_file_name ON drawing_analysis_results(file_name);
CREATE INDEX IF NOT EXISTS idx_drawing_analysis_results_created_at ON drawing_analysis_results(created_at);

-- Add RLS (Row Level Security)
ALTER TABLE drawing_analysis_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own analysis results
CREATE POLICY "Users can view their own analysis results" ON drawing_analysis_results
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own analysis results
CREATE POLICY "Users can insert their own analysis results" ON drawing_analysis_results
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own analysis results
CREATE POLICY "Users can update their own analysis results" ON drawing_analysis_results
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own analysis results
CREATE POLICY "Users can delete their own analysis results" ON drawing_analysis_results
  FOR DELETE USING (auth.uid()::text = user_id);