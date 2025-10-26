# Database Migrations

This directory contains SQL migration scripts for the Invero platform database schema.

## Migration Files

### Core Schema
- `supabase-complete-schema.sql` - Complete initial database schema
- `supabase-contractors-only.sql` - Contractor-specific tables and RLS policies
- `supabase-storage-setup.sql` - File storage configuration
- `supabase-fix-rls.sql` - Row Level Security fixes
- `supabase-boq-schedule.sql` - BOQ and schedule management tables

### Materials Management
- `simplified-materials-schema.sql` - Master materials catalog
- `material-mappings-schema.sql` - Material mapping and relationships
- `material-master-update.sql` - Materials master data updates
- `material-request-schema.sql` - Material request workflow
- `add-approval-status-to-materials.sql` - Material approval status tracking
- `project-materials-schema.sql` - Project-specific materials
- `project-materials-purchase-fix.sql` - Purchase tracking for project materials

### Purchase Management
- `vendors-schema.sql` - Vendor management system
- `purchase-requests-schema.sql` - Purchase request workflow
- `purchase-requests-optimized-schema.sql` - Optimized purchase requests
- `vendor-grouped-purchase-orders-schema.sql` - Vendor-grouped purchase orders
- `add-purchase-columns.sql` - Additional purchase tracking columns

### BOQ and Takeoffs
- `boq-takeoffs-schema.sql` - Bill of Quantities takeoff system
- `boq-verification-schema.sql` - BOQ verification workflow
- `drawing-analysis-results-schema.sql` - Drawing analysis results
- `drawing-takeoff-items-schema.sql` - Drawing takeoff line items
- `quantity-takeoff-verification-schema.sql` - Quantity takeoff verification
- `add-verification-to-boq-takeoffs.sql` - Verification tracking

### Project Management
- `project-files-schema.sql` - Project file management

### Utility Scripts
- `fix-vendors-rls.sql` - Vendor RLS policy fixes
- `update-existing-takeoffs.sql` - Update existing takeoff records

## How to Use

1. Run these scripts in your Supabase SQL Editor
2. Scripts are generally ordered by dependency (run core schema first)
3. Some scripts are incremental updates and should be run after the base schema
4. Always backup your database before running migration scripts

## Notes

- All scripts include appropriate RLS policies for multi-tenant security
- Scripts are designed to be idempotent where possible (safe to run multiple times)
- Check script comments for specific prerequisites or dependencies