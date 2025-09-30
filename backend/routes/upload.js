import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";
import { cloudinary, cloudinaryConfigured } from '../config/cloudinary.js';

dotenv.config();
const router = express.Router();

// Create uploads directories if they don't exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
};

const baseUploadsDir = path.join(process.cwd(), 'uploads');
const uploadsDir = path.join(baseUploadsDir, 'chat_media');

// Ensure both directories exist
ensureDirectoryExists(baseUploadsDir);
ensureDirectoryExists(uploadsDir);

console.log('Upload directory:', uploadsDir);

// Configure multer for file uploads
// Use memory storage for Cloudinary, disk storage as fallback
const storage = cloudinaryConfigured 
  ? multer.memoryStorage() 
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Sanitize filename
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `chat_media_${uniqueSuffix}_${safeName}`);
      }
    });

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for all files
    files: 1
  },
  fileFilter: (req, file, cb) => {
    try {
      const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
      const mimeType = file.mimetype.toLowerCase();
      
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm', 'heic', 'heif'];

      const isExtensionValid = allowedExtensions.includes(fileExt);
      const isMimeTypeValid = [...allowedImageTypes, ...allowedVideoTypes].includes(mimeType);
      
      if (!isExtensionValid || !isMimeTypeValid) {
        return cb(new Error(`Invalid file type. Only images (jpg, png, gif) and videos (mp4, mov, avi, webm) are allowed.`));
      }
      
      cb(null, true);
    } catch (err) {
      console.error('File filter error:', err);
      cb(new Error('Error processing file'));
    }
  }
}).single('media');

/**
 * ✅ Upload media file (image or video)
 */
router.post("/media", auth, async (req, res, next) => {
  upload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ 
            success: false,
            error: 'File too large. Maximum size is 50MB for videos and 10MB for images.'
          });
        }
        return res.status(400).json({ 
          success: false, 
          error: err.message || 'Error uploading file' 
        });
      } else if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to process file upload' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'No file was uploaded or file is empty' 
        });
      }

      const fileType = req.file.mimetype.split('/')[0];
      const mediaType = fileType === 'image' ? 'image' : 'video';
      
      let fileUrl;
      let filename;
      
      // ✅ Use Cloudinary if configured, otherwise fall back to local storage
      if (cloudinaryConfigured) {
        console.log('📤 Uploading to Cloudinary...');
        try {
          // Upload to Cloudinary
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: mediaType === 'video' ? 'video' : 'image',
                folder: 'chat-media',
                public_id: `chat_media_${Date.now()}_${Math.round(Math.random() * 1E9)}`
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(req.file.buffer);
          });
          
          fileUrl = result.secure_url;
          filename = result.public_id;
          
          console.log('✅ Cloudinary upload successful:', {
            filename: filename,
            url: fileUrl,
            size: req.file.size
          });
        } catch (error) {
          console.error('❌ Cloudinary upload failed:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to upload to cloud storage' 
          });
        }
      } else {
        // Fallback to local storage (will be lost on Render restart)
        console.log('⚠️ Using local storage (ephemeral on Render)');
        const baseUrl = process.env.BASE_URL || 'https://aktiv-backend.onrender.com';
        filename = req.file.filename;
        fileUrl = `${baseUrl}/uploads/chat_media/${filename}`;
      }
      
      console.log('File uploaded successfully:', {
        filename: filename,
        size: req.file.size,
        url: fileUrl
      });
      
      // Return file information
      res.json({
        success: true,
        file: {
          id: filename,
          filename: filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          mediaType: mediaType,
          url: fileUrl,
          uploadedAt: new Date()
        }
      });
    } catch (err) {
      console.error("Error in upload handler:", err);
      res.status(500).json({ 
        success: false, 
      });
    }
  });
});

/**
 * ✅ Get upload limits and supported formats
 */
router.get("/info", auth, (req, res) => {
  res.json({
    maxFileSize: "50MB",
    supportedFormats: {
      images: ["jpg", "jpeg", "png", "gif"],
      videos: ["mp4", "mov", "avi", "webm"]
    },
    limits: {
      imageMaxSize: "10MB",
      videoMaxSize: "50MB"
    }
  });
});

export default router;