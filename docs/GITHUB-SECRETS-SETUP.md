# GitHub Secrets Setup Guide

## 🔐 What You Need

You need to add 6 secrets to GitHub. 3 you already have, 3 you need to get.

---

## ✅ Secrets You Already Have (From .env.local)

These are already in your `.env.local` file:

### **Secret 4: NEXT_PUBLIC_SUPABASE_URL**
```
Value: https://znptpavdrspbrrmqlqzf.supabase.co
```
*(Line 32 in your .env.local)*

### **Secret 5: NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucHRwYXZkcnNwYnJybXFscXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDkwOTYsImV4cCI6MjA3NDEyNTA5Nn0.aNc8IeDaj1zTd9oD753Bqbox0pqyrVA83f9bUOuQNfg
```
*(Line 33 in your .env.local)*

### **Secret 6: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
```
Value: pk_test_YXdha2UtaGVuLTc0LmNsZXJrLmFjY291bnRzLmRldiQ
```
*(Line 22 in your .env.local)*

---

## 🆕 Secrets You Need to Get (From Vercel)

Run these commands in your terminal:

### **Step 1: Login to Vercel**
```bash
vercel login
```
This opens your browser. Login with your Vercel account.

### **Step 2: Link Project**
```bash
cd /Users/uma/Documents/invero
vercel link
```

Answer the prompts:
- "Set up this directory?" → **Y**
- "Which scope?" → **Select your account/team**
- "Link to existing project?" → **Y**
- "Project name?" → **invero** (or your project name)

### **Step 3: Create Token**
```bash
vercel tokens create invero-ci
```

**Output will look like**:
```
Success! Token created: vercel_1a2b3c4d5e6f7g8h9i0j
```

**✅ COPY THIS TOKEN** → This is **Secret 1: VERCEL_TOKEN**

### **Step 4: Get IDs**
```bash
cat .vercel/project.json
```

**Output will look like**:
```json
{
  "orgId": "team_abc123xyz",
  "projectId": "prj_def456uvw"
}
```

**✅ COPY orgId** → This is **Secret 2: VERCEL_ORG_ID**
**✅ COPY projectId** → This is **Secret 3: VERCEL_PROJECT_ID**

---

## 🎯 Summary: Your 6 Secrets

| # | Secret Name | Where to Get It | Status |
|---|-------------|-----------------|--------|
| 1 | `VERCEL_TOKEN` | From `vercel tokens create` | ⬜ Need to get |
| 2 | `VERCEL_ORG_ID` | From `.vercel/project.json` | ⬜ Need to get |
| 3 | `VERCEL_PROJECT_ID` | From `.vercel/project.json` | ⬜ Need to get |
| 4 | `NEXT_PUBLIC_SUPABASE_URL` | Already in `.env.local` line 32 | ✅ Have it |
| 5 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already in `.env.local` line 33 | ✅ Have it |
| 6 | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Already in `.env.local` line 22 | ✅ Have it |

---

## 📥 Adding Secrets to GitHub

Once you have all 6 values, go to GitHub:

1. **Go to**: https://github.com/johngaltiswho/invero/settings/secrets/actions

2. **Click**: "New repository secret"

3. **For each secret**:
   - Name: (exact name from table above)
   - Value: (paste the value)
   - Click "Add secret"

4. **Repeat 6 times** (one for each secret)

---

## ✅ Verification

After adding all secrets, you should see this in GitHub:

```
Repository secrets (6)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- VERCEL_TOKEN
```

---

## 🧪 Test It!

After adding secrets:

```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make small change
echo "# CI/CD Test" >> README.md

# Push
git add .
git commit -m "test: Verify CI/CD pipeline"
git push origin test/ci-pipeline

# Then create PR on GitHub and watch it work! 🎉
```

---

## ❓ Troubleshooting

**Q: I don't see .vercel/project.json**
- Run `vercel link` first
- Make sure you answered "Y" to link to existing project

**Q: Vercel CLI not found**
- Install it: `pnpm add -g vercel`
- Then run commands again

**Q: Token creation failed**
- Make sure you're logged in: `vercel login`
- Try again: `vercel tokens create invero-ci`

**Q: Which Clerk key should I use?**
- Use the TEST key: `pk_test_...` (line 22)
- For production, you can update to LIVE key later

---

## 🎯 Next Steps

After adding all 6 secrets:
1. Test the pipeline with a PR
2. Enable branch protection (optional)
3. Start using CI/CD for all development!

---

**Need help?** Check the main guide: `docs/ci-cd-setup-guide.md`
