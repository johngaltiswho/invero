ALTER TABLE boq_items
  ADD COLUMN IF NOT EXISTS measurement_input_unit VARCHAR(32),
  ADD COLUMN IF NOT EXISTS measurement_conversion_factor DECIMAL(14, 6);

COMMENT ON COLUMN boq_items.measurement_input_unit IS 'Optional site/native unit used for measurement entry before conversion to the BOQ unit';
COMMENT ON COLUMN boq_items.measurement_conversion_factor IS 'Optional factor used to convert the native measured quantity into the BOQ unit';
