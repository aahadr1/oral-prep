# Vercel Environment Variables Checklist

## Required Environment Variables

Your Vercel project **MUST** have these environment variables set:

### 1. OpenAI API Key (REQUIRED for Oral Features)
```
OPENAI_API_KEY=sk-...
```
- Get from: https://platform.openai.com/api-keys
- Required for: Oral Quiz, Oral Blanc
- Scopes: Production, Preview, Development

### 2. Supabase Configuration (REQUIRED for Auth)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```
- Get from: Supabase Project → Settings → API
- Required for: Authentication, Database
- Scopes: Production, Preview, Development

## How to Set in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Select your project**: `oral-prep`
3. **Go to Settings** → **Environment Variables**
4. **Add each variable**:
   - Key: Variable name (e.g., `OPENAI_API_KEY`)
   - Value: Your actual key
   - Environments: Check all three (Production, Preview, Development)
5. **Click Save**
6. **Redeploy** (or push new commit to trigger deployment)

## Quick Verification Commands

After setting variables and deploying, check logs:

```bash
# View latest deployment logs
vercel logs --follow

# Or check in Vercel dashboard
# Project → Deployments → Latest → View Function Logs
```

## Common Issues

### Issue: "OPENAI_API_KEY not configured"
**Solution**: Add `OPENAI_API_KEY` to Vercel environment variables

### Issue: "Supabase not configured"
**Solution**: Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Issue: "Invalid API key"
**Solution**: Verify your OpenAI API key is correct and active

### Issue: "Authentication failed"
**Solution**: Check Supabase credentials and ensure RLS policies are set up

## Testing After Setup

1. Wait for deployment to complete (1-2 minutes)
2. Visit your production URL
3. Try to:
   - Sign in/Sign up (tests Supabase)
   - Start Oral Quiz (tests OpenAI)
4. Check browser console and Vercel logs for any errors

## Environment Variable Template

Copy this template to set up quickly:

```bash
# OpenAI (Required for Oral features)
OPENAI_API_KEY=sk-proj-...

# Supabase (Required for Auth & Database)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...

# Optional: Skip auth in development
# SKIP_AUTH=true  # DON'T set this in production!
```

## Current Status

✅ Code pushed to GitHub: Commit `ae34fc5`
⏳ Vercel deployment: Check Deployments tab
⚠️ Environment variables: **YOU NEED TO VERIFY THESE**

## Links

- Vercel Dashboard: https://vercel.com
- OpenAI API Keys: https://platform.openai.com/api-keys
- Supabase Dashboard: https://supabase.com/dashboard
