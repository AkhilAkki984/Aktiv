import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";

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

// Log directory info for debugging
console.log('Upload directory:', uploadsDir);

// Configure multer for file uploads (simplified version)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `chat_media_${uniqueSuffix}_${file.originalname}`);
  }
});

// Convert HEIC/HEIF to jpeg for iOS compatibility
const convertHeicToJpg = (buffer) => {
  // This is a placeholder - in production, you'd want to use a library like 'heic-convert'
  return buffer; // Return as is if conversion is not possible
};

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for all files
    files: 1
  },
  fileFilter: (req, file, cb) => {
    try {
      // Normalize file extension and mime type
      const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
      const mimeType = file.mimetype.toLowerCase();
      
      // Allowed types
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
      const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm', 'heic', 'heif'];

      // Check if file extension is allowed
      const isExtensionValid = allowedExtensions.includes(fileExt);
      
      // Check if mime type is allowed
      const isMimeTypeValid = [...allowedImageTypes, ...allowedVideoTypes].includes(mimeType);
      
      if (!isExtensionValid || !isMimeTypeValid) {
        return cb(new Error(`Invalid file type. Only images (jpg, png, gif) and videos (mp4, mov, avi, webm) are allowed.`));
      }
      
      // Check file size based on type
      const isVideo = mimeType.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      
      if (req.headers['content-length'] > maxSize) {
        return cb(new Error(`File too large. Max size: ${isVideo ? '50MB' : '10MB'}`));
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
router.post("/media", auth, (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
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
        // An unknown error occurred
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

    // Handle HEIC/HEIF files
    let fileBuffer = req.file.buffer;
    if (['image/heic', 'image/heif'].includes(req.file.mimetype.toLowerCase())) {
      try {
        fileBuffer = await convertHeicToJpg(fileBuffer);
        req.file.mimetype = 'image/jpeg';
        req.file.originalname = req.file.originalname.replace(/\.(heic|heif)$/i, '.jpg');
        req.file.filename = req.file.filename.replace(/\.(heic|heif)$/i, '.jpg');
      } catch (conversionErr) {
        console.error('HEIC conversion error:', conversionErr);
        return res.status(400).json({
          success: false,
          error: 'Failed to process HEIC/HEIF image. Please convert to JPEG/PNG and try again.'
        });
      }
    }

    const fileType = req.file.mimetype.split('/')[0];
    const mediaType = fileType === 'image' ? 'image' : 'video';
    
      // Return file information
      res.json({
        success: true,
        file: {
          id: req.file.filename,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          mediaType: mediaType,
          url: `/api/upload/media/${req.file.filename}`,
          uploadedAt: new Date()
        }
      });
    } catch (err) {
      console.error("Error in upload handler:", err);
      res.status(500).json({ 
        success: false, 
        error: 'An unexpected error occurred while processing your file' 
      });
    }
  }); // End of upload callback
});

/**
 * ✅ Serve media files
 */
router.get("/media/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('Requested file:', filename);
    console.log('Looking for file at path:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ 
        success: false,
        error: `Media file not found: ${filename}`,
        path: filePath
      });
    }
    
    // Set appropriate headers for media files
    const ext = path.extname(filename).toLowerCase();
    if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    }
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Send the file
    console.log('Serving file:', filePath);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            error: 'Error sending file',
            details: err.message 
          });
        }
      }
    });
  } catch (err) {
    console.error("Error serving media:", err);
    res.status(404).json({ msg: "Media file not found" });
  }
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
