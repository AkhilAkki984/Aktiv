# Production Deployment Guide

## 🌐 Your Production URLs
- **Frontend**: https://aktiv-frontend.onrender.com
- **Backend**: https://aktiv-backend.onrender.com

## ✅ Files Updated for Production

### Backend Files Modified:
1. ✅ **`backend/server.js`** - CORS configuration
2. ✅ **`backend/routes/auth.js`** - Social login redirects
3. ✅ **`backend/routes/posts.js`** - Media upload URL

### Changes Made:

#### 1. CORS Configuration (`server.js`)
- Added `https://aktiv-frontend.onrender.com` to allowed origins
- Added regex pattern for Render preview deployments
- Keeps localhost for local development

#### 2. Social Login Redirects (`auth.js`)
- Changed from `http://localhost:5173` to `https://aktiv-frontend.onrender.com`
- Uses `process.env.FRONTEND_URL` for flexibility
- Fallback to production URL

#### 3. Media Upload URLs (`posts.js`)
- Changed from `http://localhost:5000` to `https://aktiv-backend.onrender.com`
- Uses `process.env.BASE_URL` for flexibility

## 📋 Deployment Checklist

### Step 1: Update Backend Environment Variables

Go to **Render Dashboard** → Your Backend Service → **Environment** tab

Add these variables (if not present):

```bash
# Required
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000

# Optional (recommended)
FRONTEND_URL=https://aktiv-frontend.onrender.com
BASE_URL=https://aktiv-backend.onrender.com
NODE_ENV=production

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Step 2: Deploy Backend Files to GitHub

**Files to commit:**
1. `backend/server.js`
2. `backend/routes/auth.js`
3. `backend/routes/posts.js`

**Commit commands:**
```bash
cd c:\Users\AKHIL\Downloads\Aktiv-main\Aktiv-main

# If not a git repo yet, initialize
git init
git remote add origin YOUR_GITHUB_REPO_URL

# Add and commit files
git add backend/server.js backend/routes/auth.js backend/routes/posts.js
git commit -m "Fix: Update URLs for production deployment"
git push origin main
```

**Or manually via GitHub:**
1. Go to your GitHub repository
2. Navigate to each file
3. Click "Edit" (pencil icon)
4. Copy content from local file
5. Paste and commit

### Step 3: Verify Deployment

#### Check Backend:
1. Go to Render Dashboard → Backend Service
2. Watch the "Logs" tab
3. Wait for "Deploy succeeded" message
4. Visit: https://aktiv-backend.onrender.com/
5. Should see: `{"message": "Aktiv API is running"}`

#### Check CORS:
1. Open browser console on your frontend
2. Try making a request
3. Should NOT see CORS errors anymore

### Step 4: Test the Application

#### From Your Device:
1. Visit: https://aktiv-frontend.onrender.com
2. Try to register a new account
3. Try to login

#### From Another Device/Location:
1. Open: https://aktiv-frontend.onrender.com
2. Should work without issues
3. No localhost references anywhere

## 🔍 Verification Tests

### Test 1: CORS Working
```javascript
// Open browser console on https://aktiv-frontend.onrender.com
fetch('https://aktiv-backend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'test' })
}).then(r => console.log('CORS OK:', r.status))
```

### Test 2: Registration Works
1. Go to frontend
2. Click "Register"
3. Fill form and submit
4. Should register successfully

### Test 3: Access from Other Device
1. Open frontend URL on phone/tablet
2. Should load properly
3. Can register/login

## 🐛 Common Issues & Fixes

### Issue 1: CORS Error Still Appears
**Fix:**
- Clear browser cache
- Hard refresh (Ctrl + Shift + R)
- Wait 2 minutes for deployment
- Check Render logs for deployment status

### Issue 2: "Invalid credentials" on Login
**Fix:**
- This is the email normalization issue
- Register a new account (will work)
- Or deploy auth.js with normalization fixes

### Issue 3: Media Upload Fails
**Fix:**
- Ensure Cloudinary env vars are set
- Or check local uploads directory exists
- Check Render logs for errors

### Issue 4: Social Login Redirects to Localhost
**Fix:**
- Set `FRONTEND_URL` environment variable in Render
- Or update auth.js with correct URLs
- Redeploy backend

### Issue 5: Backend Sleeps (Free Tier)
**Fix:**
- Render free tier sleeps after 15 minutes
- First request will be slow (30-60 seconds)
- Consider keeping alive service
- Or upgrade to paid plan

## 📊 Environment Variables Summary

### Backend (Render)
```bash
# Critical
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
NODE_ENV=production

# URLs
FRONTEND_URL=https://aktiv-frontend.onrender.com
BASE_URL=https://aktiv-backend.onrender.com

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Social Auth (if using)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

### Frontend (Render)
Usually set in build settings:
```bash
# May not need any env vars since we're using production URLs
```

## 🎯 Files Still Referencing localhost (Safe)

These are OK to keep localhost references:

1. **`backend/server.js`** lines 47-48:
   ```javascript
   'http://localhost:5173',  // For local development
   'http://localhost:3000',  // For local development
   ```
   ✅ These are for when you develop locally

2. **`backend/config/db.js`** line 9:
   ```javascript
   || 'mongodb://localhost:27017/aktiv'
   ```
   ✅ Fallback for local development, won't be used in production

## 🚀 Post-Deployment Steps

1. ✅ Test registration from frontend
2. ✅ Test login (may need new account)
3. ✅ Test from mobile device
4. ✅ Share link with friend to test from different location
5. ✅ Monitor Render logs for any errors
6. ✅ Set up custom domain (optional)

## 📝 Next Steps

After successful deployment:
1. **Fix login for existing users** - Deploy email normalization fix
2. **Set up monitoring** - Use Render metrics
3. **Configure custom domain** - If you have one
4. **Set up HTTPS** - Already enabled by Render
5. **Consider paid plan** - To avoid sleep mode

## 🔐 Security Reminders

- ✅ Never commit `.env` files
- ✅ Keep JWT_SECRET secure
- ✅ Use strong MongoDB passwords
- ✅ Enable MongoDB IP whitelist
- ✅ Keep dependencies updated
- ✅ Remove debug routes in production

## 📞 Support

If issues persist:
1. Check Render logs (Backend & Frontend)
2. Check MongoDB Atlas logs
3. Check browser console for errors
4. Verify all environment variables are set
5. Restart both services on Render
