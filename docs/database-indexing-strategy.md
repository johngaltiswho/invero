# Database Indexing Strategy

## Overview

This document explains the database indexing strategy implemented to optimize query performance across the Invero platform. The indexes are designed based on actual query patterns observed in the API endpoints.

## Index Categories

### 1. Authentication Indexes (Critical - Sub-millisecond Performance)
These indexes are essential for fast user authentication and authorization:

- `idx_contractors_clerk_user_id` - Contractor authentication lookup
- `idx_investors_clerk_user_id` - Investor authentication lookup

**Impact**: Direct impact on every API request requiring authentication.

### 2. Foreign Key Indexes
Optimize JOIN operations between related tables:

- `idx_purchase_request_items_pr_id` - Items → Purchase Requests
- `idx_purchase_request_items_material_id` - Items → Materials
- `idx_project_materials_project_id` - Project Materials → Projects
- `idx_project_materials_material_id` - Project Materials → Materials

**Impact**: 10-100x faster JOIN queries, especially for purchase request detail views.

### 3. Status Filter Indexes
Enable fast filtering by status columns (most common query pattern):

- `idx_purchase_requests_status` - PR status filtering
- `idx_capital_transactions_status` - Transaction status filtering
- `idx_invoices_status` - Invoice status filtering
- `idx_contractors_verification_status` - Contractor verification filtering
- `idx_investors_status` - Investor status filtering

**Impact**: Admin dashboards and filtered lists load instantly instead of scanning full tables.

### 4. Time-Based Indexes
Optimize chronological sorting and date-range queries:

- `idx_purchase_requests_created_at` - PR creation order
- `idx_capital_transactions_created_at` - Transaction history
- `idx_invoices_invoice_date` - Invoice chronological order
- `idx_purchase_requests_dispute_deadline` - Dispute monitoring (for cron)

**Impact**: Fast pagination, transaction histories, and time-based reporting.

### 5. Composite Indexes
Optimize queries with multiple filter conditions:

#### Purchase Requests
- `idx_purchase_requests_status_created` - Status + date sorting (admin dashboard)
- `idx_purchase_requests_contractor_status` - Contractor's PRs by status
- `idx_purchase_requests_delivery_tracking` - Delivery status + dispatch date

#### Capital Transactions
- `idx_capital_transactions_status_type` - Completed transactions by type
- `idx_capital_transactions_pr_type_status` - PR funding calculations
- `idx_capital_transactions_investor_date` - Investor transaction history

#### Invoices
- `idx_invoices_contractor_date` - Contractor invoice list

**Impact**: 100-1000x faster for complex queries with multiple filters.

### 6. Partial Indexes
Index only relevant subsets of data to save space and improve performance:

```sql
-- Only index non-null vendor assignments
CREATE INDEX idx_purchase_requests_vendor_id
  ON purchase_requests(vendor_id)
  WHERE vendor_id IS NOT NULL;

-- Only index dispatched/disputed deliveries
CREATE INDEX idx_purchase_requests_delivery_status
  ON purchase_requests(delivery_status)
  WHERE delivery_status != 'not_dispatched';

-- Only index completed transactions
CREATE INDEX idx_capital_transactions_status_type
  ON capital_transactions(status, transaction_type)
  WHERE status = 'completed';
```

**Impact**: 50-70% smaller index size while maintaining performance for relevant queries.

## Query Pattern Analysis

### Most Common Queries

1. **Admin Purchase Request Dashboard**
   ```sql
   SELECT * FROM purchase_requests
   WHERE status = 'submitted'
   ORDER BY created_at DESC
   LIMIT 50;
   ```
   **Indexes used**: `idx_purchase_requests_status_created`

2. **Contractor PR List**
   ```sql
   SELECT * FROM purchase_requests
   WHERE contractor_id = 'xxx'
   AND status IN ('approved', 'funded')
   ORDER BY created_at DESC;
   ```
   **Indexes used**: `idx_purchase_requests_contractor_status`

3. **PR Funding Calculations**
   ```sql
   SELECT SUM(amount) FROM capital_transactions
   WHERE purchase_request_id = 'xxx'
   AND transaction_type = 'deployment'
   AND status = 'completed';
   ```
   **Indexes used**: `idx_capital_transactions_pr_type_status`

4. **Investor Transaction History**
   ```sql
   SELECT * FROM capital_transactions
   WHERE investor_id = 'xxx'
   ORDER BY created_at DESC;
   ```
   **Indexes used**: `idx_capital_transactions_investor_date`

5. **Delivery Tracking Dashboard**
   ```sql
   SELECT * FROM purchase_requests
   WHERE delivery_status = 'dispatched'
   ORDER BY dispatched_at DESC;
   ```
   **Indexes used**: `idx_purchase_requests_delivery_tracking`

## Performance Impact Estimates

Based on typical data volumes:

| Table | Rows | Query Type | Before Index | After Index | Improvement |
|-------|------|------------|--------------|-------------|-------------|
| purchase_requests | 10,000 | Status filter | 50ms | 2ms | 25x |
| purchase_requests | 10,000 | Status + date sort | 80ms | 3ms | 27x |
| capital_transactions | 50,000 | Investor history | 120ms | 5ms | 24x |
| capital_transactions | 50,000 | PR funding calc | 100ms | 3ms | 33x |
| purchase_request_items | 100,000 | PR items JOIN | 200ms | 8ms | 25x |
| contractors | 1,000 | Auth lookup | 10ms | 0.5ms | 20x |

## Monitoring Index Performance

### Check Index Usage
```sql
-- View index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Find Unused Indexes
```sql
-- Identify indexes that are never used
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_toast%'
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Index Sizes
```sql
-- View index storage sizes
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;
```

### Query Plan Analysis
```sql
-- Analyze specific query performance
EXPLAIN ANALYZE
SELECT * FROM purchase_requests
WHERE status = 'submitted'
ORDER BY created_at DESC
LIMIT 50;
```

Look for:
- **"Index Scan"** or **"Index Only Scan"** - Good! Using index.
- **"Seq Scan"** - Bad! Full table scan, needs index.
- **"Bitmap Index Scan"** - Acceptable for medium selectivity.

## Maintenance

### Regular Maintenance Tasks

1. **Analyze Statistics (Weekly)**
   ```sql
   ANALYZE purchase_requests;
   ANALYZE capital_transactions;
   ANALYZE invoices;
   ```

2. **Vacuum (Handled by PostgreSQL autovacuum)**
   - Autovacuum should handle this automatically
   - Monitor with: `SELECT * FROM pg_stat_user_tables;`

3. **Reindex (Only if needed after major data changes)**
   ```sql
   REINDEX TABLE purchase_requests;
   ```

### Index Health Checks

Monitor these metrics monthly:

1. **Index Bloat** - Indexes growing too large
2. **Unused Indexes** - Indexes with 0 scans after 30 days
3. **Missing Indexes** - Queries with sequential scans on large tables
4. **Duplicate Indexes** - Redundant indexes on same columns

## Trade-offs

### Benefits
- ✅ 20-100x faster read queries
- ✅ Sub-second dashboard load times
- ✅ Better user experience
- ✅ Lower database CPU usage for reads
- ✅ Scalability for growth

### Costs
- ❌ ~5-10% slower INSERT/UPDATE operations
- ❌ Additional storage (estimated +20-30% of table size)
- ❌ More VACUUM overhead

**Verdict**: Benefits far outweigh costs for a read-heavy OLTP application.

## Best Practices

1. **Don't Over-Index**
   - Only index columns used in WHERE, JOIN, ORDER BY
   - Avoid indexing low-cardinality columns (e.g., boolean flags)
   - Use partial indexes for sparse data

2. **Composite Index Order Matters**
   - Put high-selectivity columns first
   - Order by filter frequency (most common first)

3. **Monitor and Adjust**
   - Review index usage quarterly
   - Drop unused indexes
   - Add indexes for new query patterns

4. **Test Before Production**
   - Test indexes on staging with production-like data
   - Use EXPLAIN ANALYZE to verify improvements
   - Measure actual query times

## Future Optimizations

Consider these when data volumes grow:

1. **Table Partitioning** (for tables > 1M rows)
   - Partition purchase_requests by created_at (monthly/yearly)
   - Partition capital_transactions by transaction_date

2. **Materialized Views** (for complex reports)
   - Dashboard statistics
   - Financial summaries

3. **Read Replicas** (for scaling reads)
   - Separate read/write traffic
   - Point reporting queries to replicas

4. **Connection Pooling** (PgBouncer)
   - Reduce connection overhead
   - Better resource utilization

## References

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
