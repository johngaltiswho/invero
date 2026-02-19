-- Update invoice numbering to FY format: INV-FY2526-0001
-- Replaces next_invoice_number() to generate numbers per financial year (Apr-Mar)

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  fy_start_year INT;
  fy_end_year INT;
  fy_label TEXT;
  next_num INT;
  prefix TEXT;
BEGIN
  IF EXTRACT(MONTH FROM NOW()) >= 4 THEN
    fy_start_year := EXTRACT(YEAR FROM NOW())::INT % 100;
    fy_end_year := (EXTRACT(YEAR FROM NOW())::INT + 1) % 100;
  ELSE
    fy_start_year := (EXTRACT(YEAR FROM NOW())::INT - 1) % 100;
    fy_end_year := EXTRACT(YEAR FROM NOW())::INT % 100;
  END IF;

  fy_label := LPAD(fy_start_year::TEXT, 2, '0') || LPAD(fy_end_year::TEXT, 2, '0');
  prefix := 'INV-FY' || fy_label || '-';

  -- Prevent duplicates under concurrent invoice generation
  LOCK TABLE invoices IN SHARE ROW EXCLUSIVE MODE;

  SELECT COALESCE(
    MAX(CAST(RIGHT(invoice_number, 4) AS INT)),
    0
  ) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
