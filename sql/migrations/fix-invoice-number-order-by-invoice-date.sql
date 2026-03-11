-- Ensure invoice numbers follow invoice_date chronology within each financial year.
-- Format: INV-FY2526-0001

-- 1) Generate next invoice number by supplied invoice date (fallback now()).
CREATE OR REPLACE FUNCTION next_invoice_number(p_invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS VARCHAR AS $$
DECLARE
  v_date TIMESTAMP WITH TIME ZONE := COALESCE(p_invoice_date, NOW());
  fy_start_year INT;
  fy_end_year INT;
  fy_label TEXT;
  next_num INT;
  prefix TEXT;
BEGIN
  IF EXTRACT(MONTH FROM v_date) >= 4 THEN
    fy_start_year := EXTRACT(YEAR FROM v_date)::INT % 100;
    fy_end_year := (EXTRACT(YEAR FROM v_date)::INT + 1) % 100;
  ELSE
    fy_start_year := (EXTRACT(YEAR FROM v_date)::INT - 1) % 100;
    fy_end_year := EXTRACT(YEAR FROM v_date)::INT % 100;
  END IF;

  fy_label := LPAD(fy_start_year::TEXT, 2, '0') || LPAD(fy_end_year::TEXT, 2, '0');
  prefix := 'INV-FY' || fy_label || '-';

  LOCK TABLE invoices IN SHARE ROW EXCLUSIVE MODE;

  SELECT COALESCE(MAX(CAST(RIGHT(invoice_number, 4) AS INT)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number LIKE prefix || '%';

  RETURN prefix || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 2) One-time renumber existing invoices by invoice_date order.
-- Older invoice_date gets lower sequence number in the corresponding FY.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM invoices) THEN
    CREATE TEMP TABLE tmp_invoice_renumber AS
    WITH base AS (
      SELECT
        i.id,
        i.invoice_date,
        CASE
          WHEN EXTRACT(MONTH FROM i.invoice_date) >= 4 THEN
            LPAD((EXTRACT(YEAR FROM i.invoice_date)::INT % 100)::TEXT, 2, '0') ||
            LPAD(((EXTRACT(YEAR FROM i.invoice_date)::INT + 1) % 100)::TEXT, 2, '0')
          ELSE
            LPAD(((EXTRACT(YEAR FROM i.invoice_date)::INT - 1) % 100)::TEXT, 2, '0') ||
            LPAD((EXTRACT(YEAR FROM i.invoice_date)::INT % 100)::TEXT, 2, '0')
        END AS fy_label
      FROM invoices i
      WHERE i.invoice_date IS NOT NULL
    ),
    ranked AS (
      SELECT
        b.id,
        'INV-FY' || b.fy_label || '-' ||
          LPAD(ROW_NUMBER() OVER (
            PARTITION BY b.fy_label
            ORDER BY b.invoice_date ASC, b.id ASC
          )::TEXT, 4, '0') AS new_invoice_number
      FROM base b
    )
    SELECT * FROM ranked;

    -- Avoid unique collisions during renumbering.
    UPDATE invoices i
    SET invoice_number = 'TMP-' || REPLACE(i.id::TEXT, '-', '')
    FROM tmp_invoice_renumber r
    WHERE i.id = r.id;

    UPDATE invoices i
    SET invoice_number = r.new_invoice_number
    FROM tmp_invoice_renumber r
    WHERE i.id = r.id;
  END IF;
END $$;

