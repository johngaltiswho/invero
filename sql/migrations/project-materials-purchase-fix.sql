-- Fix Purchase Orders to work with Project Materials instead of Master Materials
-- Run this script in your Supabase SQL editor

-- 1. Update purchase_order_items to reference project_materials instead of materials
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_material_id_fkey;
ALTER TABLE purchase_order_items RENAME COLUMN material_id TO project_material_id;
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_project_material_id_fkey 
    FOREIGN KEY (project_material_id) REFERENCES project_materials(id);

-- 2. Add purchase tracking columns to project_materials table
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS total_requested_qty DECIMAL(10,2) DEFAULT 0;
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS remaining_qty DECIMAL(10,2);
ALTER TABLE project_materials ADD COLUMN IF NOT EXISTS purchase_status VARCHAR DEFAULT 'none' CHECK (purchase_status IN (
    'none',                  -- Not requested for purchase yet
    'requested',             -- Requested in purchase order
    'approved',              -- Purchase approved by admin
    'completed',             -- Purchase completed
    'cancelled'              -- Purchase cancelled
));

-- 3. Initialize remaining_qty for existing project materials
UPDATE project_materials 
SET remaining_qty = quantity - COALESCE(total_requested_qty, 0)
WHERE remaining_qty IS NULL;

-- 4. Create function to update project material quantities when purchase order items change
CREATE OR REPLACE FUNCTION update_project_material_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_requested_qty and remaining_qty for the project material
    UPDATE project_materials SET 
        total_requested_qty = COALESCE((
            SELECT SUM(poi.requested_quantity)
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            WHERE poi.project_material_id = COALESCE(NEW.project_material_id, OLD.project_material_id)
            AND po.status != 'cancelled'
        ), 0),
        purchase_status = CASE 
            WHEN (
                SELECT COUNT(*)
                FROM purchase_order_items poi
                JOIN purchase_orders po ON poi.purchase_order_id = po.id
                WHERE poi.project_material_id = COALESCE(NEW.project_material_id, OLD.project_material_id)
                AND po.status != 'cancelled'
            ) > 0 THEN 'requested'
            ELSE 'none'
        END
    WHERE id = COALESCE(NEW.project_material_id, OLD.project_material_id);
    
    -- Update remaining_qty
    UPDATE project_materials 
    SET remaining_qty = quantity - COALESCE(total_requested_qty, 0)
    WHERE id = COALESCE(NEW.project_material_id, OLD.project_material_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for project material quantity updates
DROP TRIGGER IF EXISTS update_project_material_qty_on_insert ON purchase_order_items;
DROP TRIGGER IF EXISTS update_project_material_qty_on_update ON purchase_order_items;
DROP TRIGGER IF EXISTS update_project_material_qty_on_delete ON purchase_order_items;

CREATE TRIGGER update_project_material_qty_on_insert
    AFTER INSERT ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_project_material_quantities();

CREATE TRIGGER update_project_material_qty_on_update
    AFTER UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_project_material_quantities();

CREATE TRIGGER update_project_material_qty_on_delete
    AFTER DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_project_material_quantities();

-- 6. Add indexes for project materials purchase tracking
CREATE INDEX IF NOT EXISTS idx_project_materials_purchase_status ON project_materials(purchase_status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_project_material ON purchase_order_items(project_material_id);

-- 7. Update RLS policies for project_materials if needed
-- (project_materials should already have proper RLS policies)

-- 8. Clean up old data (optional - removes any existing purchase_order_items that reference materials)
-- DELETE FROM purchase_order_items WHERE project_material_id NOT IN (SELECT id FROM project_materials);
-- DELETE FROM purchase_orders WHERE id NOT IN (SELECT DISTINCT purchase_order_id FROM purchase_order_items);

-- Note: After running this script, you'll need to update the API to work with project_material_id instead of material_id