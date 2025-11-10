# Browser Cache Issue - Fix for Your Friend's PC

## The Problem

The CORS error your friend is seeing on their PC is because their browser has **cached the old version** of the JavaScript code that was making direct calls to OpenAI's API.

### Why it works on your Mac:
- Your browser might have automatically refreshed
- Or you've been developing/testing and clearing cache regularly
- Or Safari handles cache differently than their browser

### Why it doesn't work on your friend's PC:
- Their browser (likely Chrome/Edge on Windows) has cached the old JavaScript
- The old code tries to call OpenAI directly → CORS error
- They need to force the browser to download the new code

## The Fix: Hard Refresh

Your friend needs to do a **hard refresh** to clear the cached JavaScript and download the new version:

### Windows (Chrome/Edge/Firefox):
```
Ctrl + Shift + R
```
or
```
Ctrl + F5
```

### Alternative: Clear Cache Manually

1. **Chrome/Edge:**
   - Press `F12` to open DevTools
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

2. **Firefox:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached Web Content"
   - Click "Clear Now"
   - Then refresh the page

### Mac (for reference):
```
Cmd + Shift + R
```
or
```
Cmd + Option + R
```

## Verification Steps

After the hard refresh, your friend should:

1. Open browser DevTools (`F12`)
2. Go to the **Network** tab
3. Reload the page
4. Look for requests to `/api/oral-quiz/webrtc` or `/api/oral-blanc/webrtc`
5. **Should NOT see** any requests to `api.openai.com` from the browser

### What to Look For:

**✅ CORRECT (New Code):**
```
Request to: https://orally.live/api/oral-quiz/webrtc
Status: 200 OK
```

**❌ WRONG (Old Cached Code):**
```
Request to: https://api.openai.com/v1/realtime?model=...
Status: (failed) CORS error
```

## Why This Happens

When we deployed the fix, Vercel updated the server code immediately, but browsers cache JavaScript files to improve performance. Your friend's browser is still using the old JavaScript that contains the direct OpenAI call.

## Additional Debugging

If hard refresh doesn't work, ask your friend to:

### 1. Check the Console for Version Info

Add this to the browser console:
```javascript
console.log('JavaScript loaded at:', new Date().toISOString());
```

### 2. Check if Service Worker is Interfering

In DevTools → Application → Service Workers:
- If any are registered, click "Unregister"
- Then hard refresh again

### 3. Clear All Site Data

In Chrome/Edge:
1. Click the padlock icon in the address bar
2. Click "Site Settings"
3. Click "Clear data"
4. Reload the page

## Next.js Cache Headers

To prevent this in the future, we can add cache-busting headers. But for now, a hard refresh should fix it.

## Timeline of Fixes

1. **Commit ae34fc5** - Initial session error fixes (had old code with direct OpenAI calls)
2. **Commit d85ea9a** - **CORS FIX** - Added proxy endpoints (NEW CODE)
3. **Commit 4d44eb9** - Documentation

Your friend's browser is probably still running code from **before commit d85ea9a**.

## Confirmation

After hard refresh, the error message should change from:
```
❌ CORS policy: No 'Access-Control-Allow-Origin' header
```

To either:
```
✅ Connected successfully
```

Or a different, more specific error that we can then debug.

## Testing on Different Browsers

Ask your friend to try:
1. **Incognito/Private Window** (no cache)
   - Chrome: `Ctrl + Shift + N`
   - Edge: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`

2. If it works in incognito → confirms it's a cache issue

## Long-term Solution

Consider adding version query params to force cache updates:
```javascript
fetch(`/api/oral-quiz/webrtc?v=${Date.now()}`)
```

Or configure Next.js to set proper cache headers for JavaScript files.

---

## Quick Action for Your Friend

**Just tell them to do this:**

1. Go to `https://orally.live`
2. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
3. Wait for page to fully reload
4. Try starting a quiz again

That should fix it! 🎉

