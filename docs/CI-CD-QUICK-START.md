# CI/CD Quick Start Guide

Get your CI/CD pipeline running in 10 minutes!

## Step 1: Get Vercel Credentials (5 minutes)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Create token
vercel tokens create invero-ci
# → Copy this token

# Link project
cd /path/to/invero
vercel link

# Get IDs
cat .vercel/project.json
# → Copy orgId and projectId
```

## Step 2: Add GitHub Secrets (3 minutes)

Go to: **GitHub repo** → **Settings** → **Secrets and variables** → **Actions**

Click **"New repository secret"** and add these:

| Name | Value | Where to get it |
|------|-------|-----------------|
| `VERCEL_TOKEN` | (token from Step 1) | From `vercel tokens create` |
| `VERCEL_ORG_ID` | (from .vercel/project.json) | `orgId` field |
| `VERCEL_PROJECT_ID` | (from .vercel/project.json) | `projectId` field |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your public key | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk key | Clerk Dashboard → API Keys |

## Step 3: Test It! (2 minutes)

```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make a change
echo "Testing CI/CD" >> README.md

# Push
git add .
git commit -m "test: CI/CD pipeline"
git push origin test/ci-pipeline
```

**Go to GitHub** → **Pull Requests** → **Create PR**

Watch the checks run! 🚀

## That's It!

Your CI/CD is now active. Every PR will automatically:
- ✅ Run tests
- ✅ Check TypeScript
- ✅ Build the project
- ✅ Create a preview deployment

## Next Steps

- Read the [full setup guide](./ci-cd-setup-guide.md)
- Enable branch protection rules
- Configure Slack notifications (optional)

## Need Help?

Check [Troubleshooting](./ci-cd-setup-guide.md#troubleshooting) in the full guide.
