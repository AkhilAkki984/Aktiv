# Deploy CORS Fix to Render

## Issue
CORS error: `Access-Control-Allow-Origin` header not present

**Frontend URL**: `https://aktiv-frontend.onrender.com`  
**Backend URL**: `https://aktiv-backend.onrender.com`

The backend wasn't allowing requests from the Render frontend domain.

## Fix Applied
Updated `backend/server.js` to include Render frontend URLs in CORS allowed origins.

## How to Deploy

### Option 1: Via GitHub (Recommended)

1. **Go to your GitHub repository**
   - The one connected to Render backend

2. **Navigate to `backend/server.js`**

3. **Click the pencil icon (Edit file)**

4. **Find line ~46** (the `allowedOrigins` array)

5. **Update it to include these lines:**
   ```javascript
   const allowedOrigins = [
     'http://localhost:5173',
     'http://localhost:3000',
     'https://aktiv-fitness.vercel.app',
     'https://aktiv-frontend.vercel.app',
     'https://aktiv-frontend-git-main-akhilreddy-2004s-projects.vercel.app',
     'https://aktiv-frontend-akhilreddy-2004s-projects.vercel.app',
     'https://aktiv-backend.onrender.com',
     'https://aktiv-frontend.onrender.com', // ADD THIS LINE
     /^\.*\.vercel\.app$/,
     /^https:\/\/aktiv-frontend.*\.onrender\.com$/ // ADD THIS LINE
   ];
   ```

6. **Commit changes**
   - Message: "Fix: Add Render frontend to CORS allowed origins"
   - Click "Commit changes"

7. **Wait for Render to auto-deploy** (2-5 minutes)
   - Go to Render dashboard
   - Watch the "Logs" tab for deployment progress
   - Should see "Deploy succeeded"

### Option 2: Copy Entire File

If you prefer, copy the entire updated `server.js` file:

1. **Copy from**: `c:\Users\AKHIL\Downloads\Aktiv-main\Aktiv-main\backend\server.js`
2. **Paste into**: Your GitHub repo → `backend/server.js`
3. **Commit and push**

## Verify the Fix

After deployment completes:

1. **Check backend logs on Render**
   - Should NOT see "Blocked by CORS: https://aktiv-frontend.onrender.com"

2. **Test login from frontend**
   - Go to `https://aktiv-frontend.onrender.com`
   - Try logging in with: `bunny@gmail.com`
   - CORS error should be gone

3. **If login still fails with "Invalid credentials"**
   - That's the ORIGINAL issue (email normalization)
   - Need to also deploy the auth.js fixes
   - Or use the reset password route

## What Changed

### Before:
```javascript
const allowedOrigins = [
  // ... other origins
  'https://aktiv-backend.onrender.com',
  /^\.*\.vercel\.app$/
];
```

### After:
```javascript
const allowedOrigins = [
  // ... other origins
  'https://aktiv-backend.onrender.com',
  'https://aktiv-frontend.onrender.com', // ← NEW
  /^\.*\.vercel\.app$/,
  /^https:\/\/aktiv-frontend.*\.onrender\.com$/ // ← NEW
];
```

## Next Steps After CORS Fix

Once CORS is fixed, you may still have the login issue. To fix that:

1. **Deploy updated `auth.js`** (email normalization fix)
2. **Or reset password** for existing user
3. **Or register a new account**

## Common Issues

### "Still getting CORS error after deploy"
- Clear browser cache
- Hard refresh (Ctrl + Shift + R)
- Check Render logs to verify deployment succeeded

### "Deploy failed"
- Check Render logs for syntax errors
- Verify the array syntax is correct (commas, brackets)

### "Backend not responding"
- Restart Render service
- Check if MongoDB is connected

## Files Modified

- ✅ `backend/server.js` - Added Render frontend to CORS config

## Files Still Need Deployment (Optional)

- ⏳ `backend/routes/auth.js` - Email normalization fix (for future logins)
- ⏳ `backend/routes/reset-password.js` - Password reset route (if you want this feature)
