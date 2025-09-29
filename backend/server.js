import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Ensure mongoose is imported
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import './config/cloudinary.js'; // Import to initialize Cloudinary
import { initializeChatSocket } from "./socket/chatSocket.js";
import { initializeFeedSocket } from "./socket/feedSocket.js";
import passport from "passport";
import User from "./models/User.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chat.js";
import groupRoutes from "./routes/groups.js";
import uploadRoutes from "./routes/upload.js";
import feedRoutes from "./routes/feed.js";
import matchRoutes from "./routes/matches.js";
import partnerRoutes from "./routes/partners.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import dashboardRoutes from "./routes/dashboard.js";
import goalsRoutes from "./routes/goals.js";
import postsRoutes from "./routes/posts.js";
import aiCoachRoutes from "./routes/aiCoach.js";

// Ensure uploads directory exists
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('Created uploads directory at:', uploadsPath);
}
dotenv.config();

const app = express();
const server = http.createServer(app);

// Basic middleware setup
app.use(express.json());
app.use(passport.initialize());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://aktiv-frontend.onrender.com',
      /^https:\/\/aktiv-frontend-.*\.onrender\.com$/,
      /^https:\/\/.*\.onrender\.com$/
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      } else if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    })) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Disposition"],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self';" +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://aktiv-frontend.onrender.com;" +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;" +
    "font-src 'self' https://fonts.gstatic.com data:;" +
    "img-src 'self' data: https:;" +
    "connect-src 'self' https://api.cloudinary.com;" +
    "media-src 'self' data: https:;" +
    "frame-src 'self' https://www.youtube.com;"
  );
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Aktiv API is running' });
});

// Serve static files with cache control
app.use('/uploads', express.static(uploadsPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set appropriate cache headers for different file types
    if (/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
  }
}));

// Log available files in uploads directory (for debugging)
console.log('Serving static files from:', uploadsPath);
try {
  const files = fs.readdirSync(uploadsPath);
  console.log(`Found ${files.length} files in uploads directory`);
  if (files.length > 0) {
    console.log('First few files:', files.slice(0, 5));
  }
} catch (err) {
  console.error('Error reading uploads directory:', err);
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/ai-coach", aiCoachRoutes);
app.use("/api/upload", uploadRoutes);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedSocketOrigins = [
        'http://localhost:5173',
        'https://aktiv-frontend.onrender.com',
        /https:\/\/aktiv-frontend-.*\.onrender\.com$/
      ];
      
      if (allowedSocketOrigins.some(pattern => {
        if (typeof pattern === 'string') {
          return origin === pattern;
        } else if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return false;
      })) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    console.log('Socket connection attempt:', {
      id: socket.id,
      auth: socket.handshake.auth,
      headers: socket.handshake.headers
    });
    
    // Get token from auth object or headers
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('Socket connection rejected: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded:', decoded);
    
    // Find user in database (JWT structure: { user: { id: user.id } })
    if (!decoded.user || !decoded.user.id) {
      console.log('Socket connection rejected: Invalid JWT structure');
      return next(new Error('Authentication error: Invalid token structure'));
    }
    
    const user = await User.findById(decoded.user.id).select('-password');
    console.log('User found:', user ? `${user.username} (${user._id})` : 'null');
    
    if (!user) {
      console.log('Socket connection rejected: User not found for ID:', decoded.user.id);
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    console.log(`Socket authenticated for user: ${user.username} (${user._id})`);
    next();
    
  } catch (error) {
    console.log('Socket connection rejected:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    } else {
      return next(new Error('Authentication error: Token verification failed'));
    }
  }
});

// Initialize socket events
initializeChatSocket(io);
initializeFeedSocket(io);

// Initialize GridFS and image-serving route after MongoDB connection
let gfs;
mongoose.connection.once("open", () => {
  console.log("MongoDB connection established");
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "Uploads",
  });

  // Image-serving route
  app.get("/uploads/:filename", (req, res) => {
    if (!gfs) {
      return res.status(500).send("GridFS not initialized");
    }
    gfs
      .openDownloadStreamByName(req.params.filename)
      .on("error", () => res.status(404).send("Not found"))
      .pipe(res);
  });
});

// Socket.IO connection handler (authenticated users only)
io.on("connection", (socket) => {
  console.log(`Authenticated user connected: ${socket.user.username} (${socket.userId})`);
  
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.userId})`);
  });
});

// Start server after connecting to MongoDB
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB(); // Wait for MongoDB connection
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();