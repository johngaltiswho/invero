-- Simple Supabase schema for BOQ and Schedule only

-- Create project_boqs table
CREATE TABLE project_boqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id VARCHAR NOT NULL,
    contractor_id VARCHAR NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount BIGINT NOT NULL,
    file_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create boq_items table
CREATE TABLE boq_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    boq_id UUID REFERENCES project_boqs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit VARCHAR NOT NULL,
    quantity_text VARCHAR NOT NULL, -- Can store "QRO", "LS", or numeric values as text
    quantity_numeric DECIMAL(10,2), -- Numeric value when applicable, NULL for QRO/LS
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR
);

-- Create project_schedules table  
CREATE TABLE project_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id VARCHAR NOT NULL,
    contractor_id VARCHAR NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_duration INTEGER NOT NULL,
    file_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule_tasks table
CREATE TABLE schedule_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES project_schedules(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration INTEGER NOT NULL,
    progress DECIMAL(5,2) DEFAULT 0,
    responsible VARCHAR,
    dependencies TEXT
);

-- Create indexes
CREATE INDEX idx_boq_items_boq_id ON boq_items(boq_id);
CREATE INDEX idx_schedule_tasks_schedule_id ON schedule_tasks(schedule_id);
CREATE INDEX idx_project_boqs_project_id ON project_boqs(project_id);
CREATE INDEX idx_project_schedules_project_id ON project_schedules(project_id);

-- Enable Row Level Security
ALTER TABLE project_boqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON project_boqs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON boq_items FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON project_schedules FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON schedule_tasks FOR SELECT USING (true);

-- Create policies for insert (anyone can insert for now)
CREATE POLICY "Enable insert for all users" ON project_boqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON boq_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON project_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON schedule_tasks FOR INSERT WITH CHECK (true);
