import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Ensure mongoose is imported
import connectDB from "./config/db.js";
import passport from "passport";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chat.js";
import groupRoutes from "./routes/groups.js";
import feedRoutes from "./routes/feed.js";
import matchRoutes from "./routes/matches.js";
import partnerRoutes from "./routes/partners.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import dashboardRoutes from "./routes/dashboard.js";
import goalsRoutes from "./routes/goals.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize app middleware
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(passport.initialize());

// Routes
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

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
  });

  socket.on("message", ({ room, ...msg }) => {
    console.log("Message received:", msg);
    io.to(room).emit("message", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
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