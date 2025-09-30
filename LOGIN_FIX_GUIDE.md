# Login Issue Fix Guide

## Problem
User registered successfully but cannot login. Error: `400 Bad Request - Invalid credentials`

## Root Causes Identified

### 1. Email Normalization Mismatch
- **Registration**: Was not normalizing email (no `.toLowerCase()` or `.trim()`)
- **Login**: Was normalizing email (applying `.toLowerCase()` and `.trim()`)
- **Result**: Mismatch when searching for users

### 2. Possible Issues with Existing User
Your user "Bunny" (bunny@gmail.com) might have:
- Email stored with different casing
- Password hashing issue
- Missing password field

## Solutions Applied

### ✅ Backend Changes Made

I've updated `backend/routes/auth.js` with:

1. **Consistent email normalization** in both register and login
2. **Enhanced logging** to debug the exact issue
3. **Case-insensitive fallback** search
4. **Debug route** to test credentials

### 🔧 How to Deploy the Fix

#### Option 1: Deploy to Render (Production)

1. **Commit the changes:**
   ```bash
   cd backend
   git add routes/auth.js
   git commit -m "Fix: Normalize email in login and registration"
   git push origin main
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)
   - Or manually trigger a deploy from Render dashboard

3. **Wait for deployment** (takes 2-5 minutes)

#### Option 2: Test Locally First

1. **Start backend locally:**
   ```bash
   cd backend
   npm start
   ```

2. **Test the debug route:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/debug-login \
     -H "Content-Type: application/json" \
     -d '{"email":"bunny@gmail.com","password":"YOUR_PASSWORD"}'
   ```

3. **Check the response:**
   - `found: true` - User exists
   - `passwordMatch: true/false` - Password is correct or not
   - `hasPassword: true/false` - Password field exists

## Testing Steps

### 1. Test with Debug Route (Recommended)

Use this to diagnose the exact issue:

```bash
# Replace with your actual credentials
curl -X POST https://aktiv-backend.onrender.com/api/auth/debug-login \
  -H "Content-Type: application/json" \
  -d '{"email":"bunny@gmail.com","password":"YOUR_ACTUAL_PASSWORD"}'
```

**Possible Responses:**

#### Scenario A: User Not Found
```json
{
  "found": false,
  "message": "User not found",
  "searchedEmail": "bunny@gmail.com"
}
```
**Fix**: Email was stored with different casing. Use the reset password route.

#### Scenario B: Password Mismatch
```json
{
  "found": true,
  "email": "bunny@gmail.com",
  "username": "Bunny",
  "hasPassword": true,
  "passwordMatch": false
}
```
**Fix**: Password is incorrect. Use the reset password route or try registering again.

#### Scenario C: Password Match
```json
{
  "found": true,
  "email": "bunny@gmail.com",
  "username": "Bunny",
  "hasPassword": true,
  "passwordMatch": true
}
```
**Issue**: The regular login should work. Check frontend form data.

### 2. Reset Password (If Needed)

If the password is incorrect or you forgot it:

```bash
# Visit this URL in your browser (replace with your email and new password)
https://aktiv-backend.onrender.com/api/reset-password/bunny@gmail.com/newpassword123
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "email": "bunny@gmail.com"
}
```

Then try logging in with the new password.

### 3. Test Regular Login

After fixing the issue, test the regular login:

```bash
curl -X POST https://aktiv-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bunny@gmail.com","password":"YOUR_PASSWORD"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "68db6a45851d2ef17be31a6b",
    "email": "bunny@gmail.com",
    "username": "Bunny",
    "onboarded": true
  }
}
```

## Quick Fix for Your Current Situation

Since you're using the production backend and can't immediately redeploy, here's the fastest solution:

### Option A: Reset Your Password

1. Visit this URL (replace `newpassword` with your desired password):
   ```
   https://aktiv-backend.onrender.com/api/reset-password/bunny@gmail.com/newpassword
   ```

2. Wait for success response

3. Try logging in with the new password

### Option B: Register a New Account

1. Use a different email (e.g., bunny2@gmail.com)
2. Register successfully
3. This will work because the updated code normalizes emails

## Monitoring

Check backend logs on Render:
1. Go to Render dashboard
2. Select your backend service
3. Click "Logs" tab
4. Look for these log messages:
   - `Login request received`
   - `Normalized email`
   - `User found` or `User not found`
   - `Password comparison result`

## Security Note

**IMPORTANT**: After resolving the issue, remove the debug route:

```javascript
// Delete this entire route from backend/routes/auth.js
router.post('/debug-login', async (req, res) => {
  // ... debug code
});
```

This route exposes sensitive information and should NOT be in production.

## Summary

The issue is caused by inconsistent email normalization between registration and login. The fixes ensure both processes normalize emails the same way. For your existing user, use the reset password route or register a new account to proceed.
