// backend/routes/chat.js
import express from "express";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";
import Message from "../models/Message.js";
import User from "../models/User.js"; // ✅ import User model

dotenv.config();
const router = express.Router();

// Configure GridFS storage for image uploads
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}_${file.originalname}`,
    bucketName: "uploads",
  }),
});
const upload = multer({ storage });

/**
 * ✅ Get contacts (all users except the logged-in user)
 */
router.get("/contacts", auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      "username email"
    );
    res.json(users);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get all messages between logged-in user and a partner
 */
router.get("/:partnerId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.partnerId },
        { sender: req.params.partnerId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Send a message (text or image) to a partner
 */
router.post(
  "/:partnerId",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      const messageData = {
        sender: req.user.id,
        receiver: req.params.partnerId,
        text: req.body.text || null,
        image: req.file ? `/uploads/${req.file.filename}` : null,
      };

      const message = new Message(messageData);
      await message.save();

      res.json(message);
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

export default router;
