# Database Index Deployment Guide

## Quick Start

### 1. Deploy Indexes to Production

```bash
# Run the migration in Supabase SQL Editor
# File: sql/migrations/add-performance-indexes.sql
```

**Expected Duration**: 2-5 minutes depending on data volume

**Downtime**: None - indexes are created with `IF NOT EXISTS` and don't lock tables

### 2. Verify Indexes Were Created

```sql
-- Check all indexes on purchase_requests table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'purchase_requests'
ORDER BY indexname;

-- Check index count per table
SELECT
  tablename,
  COUNT(*) as index_count,
  pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_index_size
FROM pg_stat_user_indexes
GROUP BY tablename
ORDER BY tablename;
```

### 3. Monitor Initial Performance

```sql
-- Baseline query performance (run BEFORE and AFTER)
EXPLAIN ANALYZE
SELECT * FROM purchase_requests
WHERE status = 'submitted'
ORDER BY created_at DESC
LIMIT 50;
```

**Expected Improvement**:
- Before: "Seq Scan" with execution time 50-100ms
- After: "Index Scan using idx_purchase_requests_status_created" with execution time 2-5ms

## Detailed Verification

### Critical Indexes to Verify

Run these queries to ensure the most important indexes were created:

```sql
-- 1. Authentication indexes (CRITICAL)
SELECT indexname FROM pg_indexes
WHERE tablename IN ('contractors', 'investors')
  AND indexname LIKE '%clerk_user_id%';
-- Expected: 2 rows

-- 2. Purchase request indexes
SELECT COUNT(*) FROM pg_indexes
WHERE tablename = 'purchase_requests';
-- Expected: ~15 indexes

-- 3. Capital transaction indexes
SELECT COUNT(*) FROM pg_indexes
WHERE tablename = 'capital_transactions';
-- Expected: ~10 indexes

-- 4. Foreign key indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'purchase_request_items'
  AND indexname LIKE '%pr_id%';
-- Expected: 1 row
```

### Performance Testing Queries

Test these common queries before and after indexing:

#### Test 1: Admin Dashboard (Purchase Requests)
```sql
-- Should use: idx_purchase_requests_status_created
EXPLAIN ANALYZE
SELECT *
FROM purchase_requests
WHERE status = 'submitted'
ORDER BY created_at DESC
LIMIT 50;
```

#### Test 2: Contractor Dashboard
```sql
-- Should use: idx_purchase_requests_contractor_status
EXPLAIN ANALYZE
SELECT *
FROM purchase_requests
WHERE contractor_id = 'replace-with-actual-id'
  AND status IN ('approved', 'funded')
ORDER BY created_at DESC;
```

#### Test 3: Funding Calculations
```sql
-- Should use: idx_capital_transactions_pr_type_status
EXPLAIN ANALYZE
SELECT
  SUM(amount) as total_deployed
FROM capital_transactions
WHERE purchase_request_id = 'replace-with-actual-id'
  AND transaction_type = 'deployment'
  AND status = 'completed';
```

#### Test 4: Investor Transaction History
```sql
-- Should use: idx_capital_transactions_investor_date
EXPLAIN ANALYZE
SELECT *
FROM capital_transactions
WHERE investor_id = 'replace-with-actual-id'
ORDER BY created_at DESC
LIMIT 50;
```

#### Test 5: Delivery Tracking
```sql
-- Should use: idx_purchase_requests_delivery_tracking
EXPLAIN ANALYZE
SELECT *
FROM purchase_requests
WHERE delivery_status = 'dispatched'
ORDER BY dispatched_at DESC;
```

## Interpreting EXPLAIN ANALYZE Results

### Good Signs ✅
- `Index Scan using idx_...` - Index is being used
- `Index Only Scan` - Even better! All data from index
- Execution time < 10ms for single-row lookups
- Execution time < 50ms for list queries with LIMIT

### Warning Signs ⚠️
- `Seq Scan` on large tables (>1000 rows) - Missing or unused index
- `Bitmap Heap Scan` - Acceptable but could be better
- Execution time > 100ms - Needs optimization

### Example Good Result
```
Index Scan using idx_purchase_requests_status_created on purchase_requests
  (cost=0.29..123.45 rows=50 width=1234) (actual time=0.123..2.345 rows=50 loops=1)
  Index Cond: (status = 'submitted')
Planning Time: 0.234 ms
Execution Time: 2.456 ms
```

### Example Bad Result (Needs Attention)
```
Seq Scan on purchase_requests
  (cost=0.00..12345.67 rows=50 width=1234) (actual time=12.345..67.890 rows=50 loops=1)
  Filter: (status = 'submitted')
  Rows Removed by Filter: 9950
Planning Time: 0.123 ms
Execution Time: 68.012 ms
```

## Monitoring Ongoing Performance

### Daily Checks (Automated)
Set up monitoring alerts for:
- Average query time > 100ms
- Index scans vs sequential scans ratio
- Database CPU usage spikes

### Weekly Manual Review
```sql
-- Most used indexes (should see your new indexes here)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
```

### Monthly Audit
```sql
-- Find slow queries (requires pg_stat_statements extension)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Rollback Plan

If you need to remove an index:

```sql
-- Drop a specific index
DROP INDEX IF EXISTS idx_purchase_requests_status_created;

-- To remove all indexes from this migration (DESTRUCTIVE - use with caution)
-- Copy index names from the migration file and drop individually
```

**Note**: Generally don't need to rollback indexes - they only improve performance.

## Troubleshooting

### Issue: Index not being used

**Cause**: Statistics out of date or query planner choosing different plan

**Solution**:
```sql
-- Update table statistics
ANALYZE purchase_requests;

-- Force index usage (for testing only)
SET enable_seqscan = off;
-- Run your query
SET enable_seqscan = on;
```

### Issue: Slow index creation

**Cause**: Large table with many rows

**Solution**: Indexes are created with `IF NOT EXISTS` so you can safely re-run the migration. They build in the background without locking.

### Issue: Higher disk usage

**Cause**: Indexes consume storage (expected)

**Solution**: Indexes typically add 20-30% to table size. Monitor with:
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size,
  pg_size_pretty(pg_total_relation_size(tablename::regclass) - pg_relation_size(tablename::regclass)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

## Success Metrics

After deployment, you should see:

1. **Query Performance**
   - Admin dashboard load time: < 1 second
   - Contractor PR list: < 500ms
   - Investor transaction history: < 500ms
   - PR funding calculations: < 100ms

2. **Database Metrics**
   - Index scan ratio: > 90%
   - Sequential scan ratio: < 10%
   - Average query time: < 50ms

3. **User Experience**
   - Faster page loads
   - No timeout errors
   - Smooth pagination

## Next Steps After Deployment

1. **Week 1**: Monitor index usage daily
2. **Week 2**: Review slow query log for any remaining issues
3. **Month 1**: Audit for unused indexes
4. **Quarter 1**: Consider partitioning if tables exceed 1M rows

## Questions?

- Check execution plans with `EXPLAIN ANALYZE`
- Review index usage with `pg_stat_user_indexes`
- Monitor query performance with `pg_stat_statements`
