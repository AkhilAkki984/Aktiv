import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Ensure mongoose is imported
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

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize app middleware
app.use(cors({ 
  origin: [ "http://localhost:5173", // Development
    "https://aktiv-frontend.onrender.com", // Your production frontend
    "https://*.onrender.com" // All Render subdomains

  ], 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/ai-coach", aiCoachRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [ "http://localhost:5173", // Development
      "https://aktiv-frontend.onrender.com", // Your production frontend
      "https://*.onrender.com" // All Render subdomains

    ],
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