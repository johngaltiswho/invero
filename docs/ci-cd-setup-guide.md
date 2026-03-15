# CI/CD Pipeline Setup Guide

## Overview

Your Invero platform now has a complete CI/CD pipeline that automatically:
- ✅ Tests every code change
- ✅ Prevents broken code from being merged
- ✅ Deploys preview environments for pull requests
- ✅ Safely deploys to production
- ✅ Monitors production health

## Pipeline Architecture

```
Code Push
    ↓
┌─────────────────┐
│  CI Pipeline    │ ← Runs on every push
│  - Tests        │
│  - Type checks  │
│  - Build        │
│  - Security     │
└─────────────────┘
    ↓
┌─────────────────┐
│ Preview Deploy  │ ← Automatic for PRs
│  (Vercel)       │
└─────────────────┘
    ↓
┌─────────────────┐
│ Production      │ ← Manual approval
│  Deploy         │
└─────────────────┘
    ↓
┌─────────────────┐
│ Health Checks   │ ← Every 6 hours
└─────────────────┘
```

## Setup Instructions

### Step 1: Configure GitHub Secrets

Go to your GitHub repository: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add these secrets:

#### Required Secrets

| Secret Name | Where to Find It | Purpose |
|------------|------------------|---------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens | Deploy to Vercel |
| `VERCEL_ORG_ID` | Vercel Project → Settings → General | Your Vercel organization |
| `VERCEL_PROJECT_ID` | Vercel Project → Settings → General | Your Invero project |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Supabase connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public Supabase key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | Clerk authentication |

#### Optional Secrets (for enhanced features)

| Secret Name | Purpose |
|------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase operations |
| `CLERK_SECRET_KEY` | Server-side Clerk operations |
| `SENTRY_AUTH_TOKEN` | Upload source maps to Sentry |

### Step 2: Get Vercel Credentials

1. **Get Vercel Token**:
   ```bash
   # Install Vercel CLI
   pnpm add -g vercel

   # Login to Vercel
   vercel login

   # Create a token
   vercel tokens create invero-ci
   ```
   Copy the token → Add as `VERCEL_TOKEN` secret

2. **Get Org ID and Project ID**:
   ```bash
   # Link your project
   cd /path/to/invero
   vercel link

   # This creates .vercel/project.json
   cat .vercel/project.json
   ```
   Copy `orgId` → Add as `VERCEL_ORG_ID`
   Copy `projectId` → Add as `VERCEL_PROJECT_ID`

### Step 3: Enable GitHub Actions

GitHub Actions should be enabled by default. Verify:

1. Go to your repo → `Settings` → `Actions` → `General`
2. Ensure "Allow all actions and reusable workflows" is selected
3. Set "Workflow permissions" to "Read and write permissions"

### Step 4: Test the Pipeline

1. **Create a test branch**:
   ```bash
   git checkout -b test/ci-pipeline
   ```

2. **Make a small change**:
   ```bash
   echo "# CI/CD Test" >> README.md
   git add README.md
   git commit -m "Test: Verify CI/CD pipeline"
   git push origin test/ci-pipeline
   ```

3. **Create a Pull Request** on GitHub

4. **Watch the magic happen!** 🎉
   - Go to your PR → You'll see checks running
   - CI pipeline will run automatically
   - Preview deployment will be created
   - You'll get a comment with the preview URL

## How to Use the Pipeline

### Daily Development Workflow

```bash
# 1. Create a feature branch
git checkout -b feat/new-dashboard

# 2. Make your changes
# ... code ...

# 3. Commit and push
git add .
git commit -m "Add new admin dashboard"
git push origin feat/new-dashboard

# 4. Create Pull Request on GitHub
# → CI automatically runs tests ✓
# → Preview deployment created ✓
# → Review preview URL in PR comment ✓

# 5. After code review, merge PR
# → Main branch gets updated
# → CI runs again on main
```

### Deploying to Production

**Option 1: Via GitHub UI** (Recommended)

1. Go to your repo → `Actions` tab
2. Click "Deploy to Production" workflow
3. Click "Run workflow"
4. Type `deploy` in the confirmation field
5. Click "Run workflow"
6. Watch it deploy! ✅

**Option 2: After successful merge to main**

Production deployment requires manual approval for safety.

### What Each Workflow Does

#### 1. **CI Pipeline** (`ci.yml`)

**Triggers**: Every push, every PR

**What it does**:
- ✅ Installs dependencies
- ✅ Runs ESLint (linting)
- ✅ Checks TypeScript types
- ✅ Runs all tests
- ✅ Builds production bundle
- ✅ Scans for security vulnerabilities
- ✅ Validates database migrations

**Duration**: ~3-5 minutes

**Result**: Green checkmark ✅ or red X ❌ on your PR

#### 2. **Deploy Preview** (`deploy-preview.yml`)

**Triggers**: When you open/update a PR

**What it does**:
- ✅ Deploys to Vercel preview environment
- ✅ Comments on PR with preview URL
- ✅ Auto-updates when you push new commits

**Duration**: ~2-3 minutes

**Result**: Preview URL like `invero-abc123.vercel.app`

#### 3. **Deploy Production** (`deploy-production.yml`)

**Triggers**: Manual only (for safety)

**What it does**:
- ✅ Runs full test suite
- ✅ Verifies build succeeds
- ✅ Deploys to production
- ✅ Runs health checks
- ✅ Creates deployment tag
- ✅ Auto-rollback if health checks fail

**Duration**: ~4-6 minutes

**Result**: Production deployment ✅

#### 4. **Health Checks** (`cron-health-check.yml`)

**Triggers**: Every 6 hours + manual

**What it does**:
- ✅ Checks if site is up
- ✅ Verifies API responds
- ✅ Alerts if anything is down

**Duration**: ~30 seconds

## Interpreting Results

### ✅ All Checks Passed

```
CI Pipeline / Quality Checks ✅
CI Pipeline / Database Checks ✅
CI Pipeline / Security Scan ✅
Deploy Preview / deploy-preview ✅
```

**Meaning**: Safe to merge! 🎉

### ❌ Checks Failed

Click on the failed check to see details:

```
CI Pipeline / Quality Checks ❌
  └─ TypeScript type checking ❌
      Error: Property 'foo' does not exist
```

**Action**: Fix the error, commit, push again

### 🟡 Some Checks Skipped

Some checks (like security scans) are allowed to fail without blocking merges.

## Monitoring Deployments

### View Build Status

1. Go to your repo → `Actions` tab
2. See all workflow runs
3. Click any run to see detailed logs

### Check Production Health

1. Manually trigger health check:
   - `Actions` → `Production Health Check` → `Run workflow`

2. View automated health check results:
   - `Actions` → Filter by `cron-health-check`

### Rollback if Needed

If production deployment causes issues:

```bash
# 1. Find the last working deployment tag
git tag | grep production-

# 2. Create a rollback PR
git checkout -b rollback/fix-production
git revert <bad-commit-sha>
git push origin rollback/fix-production

# 3. Merge PR and deploy again
```

## Troubleshooting

### "Vercel deployment failed"

**Check**:
- Verify `VERCEL_TOKEN` is valid
- Check `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Ensure Vercel project is linked correctly

**Fix**:
```bash
vercel login
vercel link
# Update GitHub secrets with new IDs
```

### "Tests failed"

**Check**:
- Run tests locally: `pnpm test`
- Check test output in GitHub Actions logs

**Fix**: Fix the failing tests before merging

### "Build failed in CI but works locally"

**Possible causes**:
- Missing environment variables in CI
- Different Node.js versions
- Cached dependencies

**Fix**:
1. Check environment variables in GitHub secrets
2. Clear cache: Delete branch and recreate

### "Health check failed after deployment"

**Check**:
- Visit the production URL manually
- Check Vercel deployment logs
- Check Sentry for errors

**Fix**:
- Rollback to previous version
- Fix the issue
- Deploy again

## Best Practices

### ✅ DO

- ✅ Always create PRs for code changes
- ✅ Wait for CI to pass before merging
- ✅ Test preview deployments before production
- ✅ Review deployment logs after production deploy
- ✅ Monitor Sentry after deployments

### ❌ DON'T

- ❌ Push directly to main branch
- ❌ Merge PRs with failing tests
- ❌ Skip code review
- ❌ Deploy to production on Friday afternoon (classic mistake!)
- ❌ Ignore health check failures

## Next Steps

1. **Set up all GitHub secrets** (see Step 1)
2. **Test the pipeline** with a dummy PR
3. **Enable branch protection**:
   - Go to repo → Settings → Branches → Add rule
   - Branch name pattern: `main`
   - Enable "Require status checks to pass before merging"
   - Select: `Quality Checks`, `Database Checks`
4. **Configure notifications** (optional):
   - GitHub → Settings → Notifications
   - Enable email alerts for failed builds

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [Your Workflows Directory](.github/workflows/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs for detailed errors
3. Check Vercel deployment logs
4. Review this documentation

---

**Congratulations!** 🎉 You now have enterprise-grade CI/CD for Invero!
