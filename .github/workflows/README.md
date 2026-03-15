# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Invero platform.

## Workflows Overview

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **CI Pipeline** | Every push/PR | Quality checks, tests, build | ~3-5 min |
| **Deploy Preview** | Pull requests | Preview deployments | ~2-3 min |
| **Deploy Production** | Manual only | Production deployment | ~4-6 min |
| **Health Check** | Every 6 hours | Monitor production | ~30 sec |

## Quick Reference

### Viewing Workflow Runs

1. Go to repository → **Actions** tab
2. Click on any workflow to see runs
3. Click on a run to see detailed logs

### Running Manual Workflows

**Production Deployment**:
1. Actions → "Deploy to Production"
2. Click "Run workflow"
3. Type `deploy` to confirm
4. Click "Run workflow"

**Health Check**:
1. Actions → "Production Health Check"
2. Click "Run workflow"
3. Click "Run workflow"

### Understanding Status Checks

✅ **Green check** = All tests passed, safe to merge
❌ **Red X** = Tests failed, needs fixing
🟡 **Yellow dot** = Running...

## Required Secrets

Configure these in: Settings → Secrets and variables → Actions

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## Documentation

See [docs/ci-cd-setup-guide.md](../../docs/ci-cd-setup-guide.md) for complete setup instructions.

## Support

Questions or issues? Check the troubleshooting section in the setup guide.
