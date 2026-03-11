-- Performance Optimization: Database Indexes
-- This migration adds strategic indexes to improve query performance across critical tables

-- ============================================================================
-- PURCHASE_REQUESTS TABLE
-- ============================================================================

-- Status-based queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status
  ON purchase_requests(status)
  WHERE status IS NOT NULL;

-- Contractor-specific queries
CREATE INDEX IF NOT EXISTS idx_purchase_requests_contractor_id
  ON purchase_requests(contractor_id);

-- Project-specific queries
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project_id
  ON purchase_requests(project_id);

-- Vendor assignment queries
CREATE INDEX IF NOT EXISTS idx_purchase_requests_vendor_id
  ON purchase_requests(vendor_id)
  WHERE vendor_id IS NOT NULL;

-- Time-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at
  ON purchase_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_submitted_at
  ON purchase_requests(submitted_at DESC)
  WHERE submitted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_requests_approved_at
  ON purchase_requests(approved_at DESC)
  WHERE approved_at IS NOT NULL;

-- Delivery tracking queries
CREATE INDEX IF NOT EXISTS idx_purchase_requests_delivery_status
  ON purchase_requests(delivery_status)
  WHERE delivery_status != 'not_dispatched';

CREATE INDEX IF NOT EXISTS idx_purchase_requests_dispatched_at
  ON purchase_requests(dispatched_at DESC)
  WHERE dispatched_at IS NOT NULL;

-- Composite index for common admin dashboard query (status + created_at)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status_created
  ON purchase_requests(status, created_at DESC);

-- Composite index for contractor dashboard (contractor_id + status)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_contractor_status
  ON purchase_requests(contractor_id, status);

-- Composite index for delivery tracking (delivery_status + dispatched_at)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_delivery_tracking
  ON purchase_requests(delivery_status, dispatched_at DESC)
  WHERE delivery_status != 'not_dispatched';

-- Dispute deadline monitoring (for cron jobs)
CREATE INDEX IF NOT EXISTS idx_purchase_requests_dispute_deadline
  ON purchase_requests(dispute_deadline)
  WHERE dispute_deadline IS NOT NULL AND delivery_status = 'dispatched';


-- ============================================================================
-- PURCHASE_REQUEST_ITEMS TABLE
-- ============================================================================

-- FK join optimization
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_pr_id
  ON purchase_request_items(purchase_request_id);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_material_id
  ON purchase_request_items(project_material_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_status
  ON purchase_request_items(status);

-- Composite for fetching items by PR with ordering
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_pr_created
  ON purchase_request_items(purchase_request_id, created_at);


-- ============================================================================
-- CAPITAL_TRANSACTIONS TABLE
-- ============================================================================

-- Investor-specific queries
CREATE INDEX IF NOT EXISTS idx_capital_transactions_investor_id
  ON capital_transactions(investor_id)
  WHERE investor_id IS NOT NULL;

-- Purchase request funding queries
CREATE INDEX IF NOT EXISTS idx_capital_transactions_pr_id
  ON capital_transactions(purchase_request_id)
  WHERE purchase_request_id IS NOT NULL;

-- Transaction type filtering
CREATE INDEX IF NOT EXISTS idx_capital_transactions_type
  ON capital_transactions(transaction_type);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_capital_transactions_status
  ON capital_transactions(status);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_capital_transactions_created_at
  ON capital_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_capital_transactions_transaction_date
  ON capital_transactions(transaction_date DESC)
  WHERE transaction_date IS NOT NULL;

-- Composite for completed transactions by type (very common query)
CREATE INDEX IF NOT EXISTS idx_capital_transactions_status_type
  ON capital_transactions(status, transaction_type)
  WHERE status = 'completed';

-- Composite for investor transaction history
CREATE INDEX IF NOT EXISTS idx_capital_transactions_investor_date
  ON capital_transactions(investor_id, created_at DESC)
  WHERE investor_id IS NOT NULL;

-- Composite for PR funding queries (deployment + return calculations)
CREATE INDEX IF NOT EXISTS idx_capital_transactions_pr_type_status
  ON capital_transactions(purchase_request_id, transaction_type, status)
  WHERE purchase_request_id IS NOT NULL AND status = 'completed';


-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

-- Contractor-specific queries
CREATE INDEX IF NOT EXISTS idx_invoices_contractor_id
  ON invoices(contractor_id);

-- Purchase request lookup
CREATE INDEX IF NOT EXISTS idx_invoices_pr_id
  ON invoices(purchase_request_id)
  WHERE purchase_request_id IS NOT NULL;

-- Project-specific queries
CREATE INDEX IF NOT EXISTS idx_invoices_project_id
  ON invoices(project_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date
  ON invoices(invoice_date DESC);

-- Composite for contractor invoice list (contractor + date)
CREATE INDEX IF NOT EXISTS idx_invoices_contractor_date
  ON invoices(contractor_id, created_at DESC);


-- ============================================================================
-- CONTRACTORS TABLE
-- ============================================================================

-- Authentication lookup (critical for fast auth)
CREATE INDEX IF NOT EXISTS idx_contractors_clerk_user_id
  ON contractors(clerk_user_id);

-- Verification status filtering
CREATE INDEX IF NOT EXISTS idx_contractors_verification_status
  ON contractors(verification_status);

-- Active status filtering
CREATE INDEX IF NOT EXISTS idx_contractors_status
  ON contractors(status);

-- Email lookup (for notifications)
CREATE INDEX IF NOT EXISTS idx_contractors_email
  ON contractors(email);

-- Composite for admin verification dashboard
CREATE INDEX IF NOT EXISTS idx_contractors_verification_created
  ON contractors(verification_status, created_at DESC);


-- ============================================================================
-- INVESTORS TABLE
-- ============================================================================

-- Authentication lookup (critical for fast auth)
CREATE INDEX IF NOT EXISTS idx_investors_clerk_user_id
  ON investors(clerk_user_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_investors_status
  ON investors(status);

-- Email lookup (for notifications)
CREATE INDEX IF NOT EXISTS idx_investors_email
  ON investors(email);

-- Created date for admin lists
CREATE INDEX IF NOT EXISTS idx_investors_created_at
  ON investors(created_at DESC);


-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

-- Name search (for vendor assignment dropdowns)
CREATE INDEX IF NOT EXISTS idx_vendors_name
  ON vendors(name);

-- GST number lookup
CREATE INDEX IF NOT EXISTS idx_vendors_gst_number
  ON vendors(gst_number)
  WHERE gst_number IS NOT NULL;


-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

-- Project name search
CREATE INDEX IF NOT EXISTS idx_projects_project_name
  ON projects(project_name);

-- Status filtering (if you add this column in future)
-- CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);


-- ============================================================================
-- PROJECT_MATERIALS TABLE
-- ============================================================================

-- Project lookup
CREATE INDEX IF NOT EXISTS idx_project_materials_project_id
  ON project_materials(project_id);

-- Material lookup
CREATE INDEX IF NOT EXISTS idx_project_materials_material_id
  ON project_materials(material_id);

-- Composite for fetching project materials
CREATE INDEX IF NOT EXISTS idx_project_materials_project_material
  ON project_materials(project_id, material_id);


-- ============================================================================
-- MATERIALS TABLE (Master Data)
-- ============================================================================

-- Name search (for material selection)
CREATE INDEX IF NOT EXISTS idx_materials_name
  ON materials(name);

-- HSN code lookup
CREATE INDEX IF NOT EXISTS idx_materials_hsn_code
  ON materials(hsn_code)
  WHERE hsn_code IS NOT NULL;

-- Category filtering (if you add this column)
-- CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);


-- ============================================================================
-- CAPITAL_SUBMISSIONS TABLE (Investor Portal)
-- ============================================================================

-- Investor-specific queries
CREATE INDEX IF NOT EXISTS idx_capital_submissions_investor_id
  ON capital_submissions(investor_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_capital_submissions_status
  ON capital_submissions(status);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_capital_submissions_created_at
  ON capital_submissions(created_at DESC);

-- Composite for investor submission history
CREATE INDEX IF NOT EXISTS idx_capital_submissions_investor_date
  ON capital_submissions(investor_id, created_at DESC);


-- ============================================================================
-- ANALYSIS AND MONITORING
-- ============================================================================

-- To analyze index usage after deployment, run:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- To find unused indexes:
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_toast%'
-- ORDER BY schemaname, tablename;

-- To check index sizes:
-- SELECT tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. Partial indexes (with WHERE clauses) save space and improve performance
--    by indexing only relevant rows
--
-- 2. Composite indexes follow the "leftmost prefix" rule - they can be used
--    for queries that filter on the leftmost columns
--
-- 3. Descending indexes (DESC) optimize ORDER BY ... DESC queries
--
-- 4. These indexes are designed based on current query patterns. Monitor
--    actual usage with pg_stat_user_indexes and adjust as needed
--
-- 5. Index maintenance: PostgreSQL automatically maintains indexes, but
--    consider REINDEX or VACUUM ANALYZE for heavily updated tables
--
-- 6. Trade-off: Indexes speed up reads but slow down writes slightly.
--    These indexes target read-heavy tables and common query patterns
