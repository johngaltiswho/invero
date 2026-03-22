-- Measurement sheet rows linked to existing BOQ items

CREATE TABLE IF NOT EXISTS boq_measurement_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  boq_item_id UUID NOT NULL REFERENCES boq_items(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_description TEXT,
  remarks TEXT,
  measurement_mode VARCHAR(32) NOT NULL
    CHECK (measurement_mode IN ('direct_qty', 'nos_x_l', 'nos_x_l_x_b', 'nos_x_l_x_b_x_h')),
  nos DECIMAL(12, 3),
  length DECIMAL(12, 3),
  breadth DECIMAL(12, 3),
  height DECIMAL(12, 3),
  direct_qty DECIMAL(14, 3),
  computed_qty DECIMAL(14, 3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boq_measurement_rows_project_id
  ON boq_measurement_rows(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_measurement_rows_boq_item_id
  ON boq_measurement_rows(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_boq_measurement_rows_measurement_date
  ON boq_measurement_rows(measurement_date DESC);

ALTER TABLE boq_measurement_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own measurement rows" ON boq_measurement_rows
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can insert own measurement rows" ON boq_measurement_rows
  FOR INSERT WITH CHECK (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can update own measurement rows" ON boq_measurement_rows
  FOR UPDATE USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Contractors can delete own measurement rows" ON boq_measurement_rows
  FOR DELETE USING (
    contractor_id IN (
      SELECT id FROM contractors WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role full access on measurement rows" ON boq_measurement_rows
  FOR ALL USING (true);

CREATE OR REPLACE FUNCTION set_boq_measurement_computed_qty()
RETURNS TRIGGER AS $fn$
DECLARE
  v_nos DECIMAL(14, 3) := COALESCE(NEW.nos, 1);
  v_length DECIMAL(14, 3) := COALESCE(NEW.length, 0);
  v_breadth DECIMAL(14, 3) := COALESCE(NEW.breadth, 0);
  v_height DECIMAL(14, 3) := COALESCE(NEW.height, 0);
BEGIN
  NEW.computed_qty := CASE NEW.measurement_mode
    WHEN 'direct_qty' THEN COALESCE(NEW.direct_qty, 0)
    WHEN 'nos_x_l' THEN v_nos * v_length
    WHEN 'nos_x_l_x_b' THEN v_nos * v_length * v_breadth
    WHEN 'nos_x_l_x_b_x_h' THEN v_nos * v_length * v_breadth * v_height
    ELSE 0
  END;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_boq_measurement_computed_qty ON boq_measurement_rows;
CREATE TRIGGER trigger_set_boq_measurement_computed_qty
  BEFORE INSERT OR UPDATE ON boq_measurement_rows
  FOR EACH ROW
  EXECUTE FUNCTION set_boq_measurement_computed_qty();

DROP TRIGGER IF EXISTS update_boq_measurement_rows_updated_at ON boq_measurement_rows;
CREATE TRIGGER update_boq_measurement_rows_updated_at
  BEFORE UPDATE ON boq_measurement_rows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE boq_measurement_rows IS 'Dimension-based measurement rows linked to BOQ items for project execution tracking';
COMMENT ON COLUMN boq_measurement_rows.location_description IS 'Free-form location, area, or spec descriptor for the measured work';
COMMENT ON COLUMN boq_measurement_rows.computed_qty IS 'System-computed quantity derived from the selected measurement mode and dimensions';
