# Debug Instructions

## Common Issues and Solutions

### 1. **Emoji Picker Error**
If you're getting an error with the emoji picker:

**Error**: `Module not found: Can't resolve 'emoji-picker-react'`

**Solution**: Install the dependency:
```bash
cd frontend
npm install emoji-picker-react
```

### 2. **Upload Route Error**
If you're getting an error with the upload route:

**Error**: `Cannot find module 'multer-gridfs-storage'`

**Solution**: The upload route has been simplified to use regular file storage instead of GridFS. The files will be stored in `backend/uploads/chat_media/` directory.

### 3. **Import Errors**
If you're getting import errors:

**Check**: Make sure all imports are correct:
- `EmojiPicker` from 'emoji-picker-react'
- `uploadAPI` from '../utils/api'

### 4. **File Upload Error**
If file upload is not working:

**Check**: 
1. Make sure the `uploads` directory exists in the backend
2. Check file permissions
3. Verify file size limits (10MB for images, 50MB for videos)

### 5. **Media Display Error**
If media is not displaying:

**Check**:
1. File upload was successful
2. File URL is correct
3. File exists in the uploads directory

## Testing Steps

### 1. **Test Backend**
```bash
cd backend
npm start
```
Should start without errors.

### 2. **Test Frontend**
```bash
cd frontend
npm run dev
```
Should start without errors.

### 3. **Test Chat Features**
1. Open the chat page
2. Try sending a text message
3. Try uploading an image
4. Try using the emoji picker

## Error Reporting

If you're still getting errors, please provide:

1. **Exact error message**
2. **Where the error occurs** (browser console, terminal, etc.)
3. **Steps to reproduce**
4. **Screenshot if possible**

## Quick Fixes

### Remove Emoji Picker (if causing issues)
If the emoji picker is causing problems, you can temporarily remove it:

1. Comment out the emoji picker import
2. Comment out the emoji picker button
3. Comment out the emoji picker JSX

### Use Simple File Upload (if GridFS is causing issues)
The upload route has been simplified to use regular file storage instead of GridFS for better compatibility.
