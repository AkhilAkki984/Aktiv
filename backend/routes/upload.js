import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";

dotenv.config();
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'chat_media');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos, 10MB for images
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (jpg, png, gif) and videos (mp4, mov, avi, webm) are allowed.'));
    }
  }
});

/**
 * ✅ Upload media file (image or video)
 */
router.post("/media", auth, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const fileType = req.file.mimetype.split('/')[0];
    const mediaType = fileType === 'image' ? 'image' : 'video';
    
    // Return file information
    res.json({
      success: true,
      file: {
        id: req.file.filename, // Use filename as ID for now
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
    console.error("Error uploading media:", err);
    res.status(500).json({ msg: "File upload failed" });
  }
});

/**
 * ✅ Serve media files
 */
router.get("/media/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ msg: "Media file not found" });
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
    res.sendFile(filePath);
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
