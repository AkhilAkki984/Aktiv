// backend/routes/chat.js
import express from "express";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Group from "../models/Group.js";
import Connection from "../models/Connection.js";

dotenv.config();
const router = express.Router();

// Configure GridFS storage for media uploads
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `${Date.now()}_${file.originalname}`,
    bucketName: "chat_media",
  }),
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'));
    }
  }
});

/**
 * ✅ Get chat list (conversations with accepted partners only)
 */
router.get("/conversations", auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Get all accepted connections
    const acceptedConnections = await Connection.find({
      $or: [
        { requester: currentUserId, status: 'ACCEPTED' },
        { receiver: currentUserId, status: 'ACCEPTED' }
      ]
    });

    const acceptedUserIds = new Set();
    acceptedConnections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      acceptedUserIds.add(otherUserId);
    });

    // Get user details for all accepted connections
    const acceptedUsers = await User.find({
      _id: { $in: Array.from(acceptedUserIds) }
    }).select('username firstName lastName avatar');

    // Get existing chats for these users
    const existingChats = await Chat.find({
      participants: currentUserId,
      type: 'direct'
    })
    .populate('participants', 'username firstName lastName avatar')
    .populate('lastMessage.sender', 'username firstName lastName avatar');

    // Create a map of existing chats by participant
    const existingChatMap = new Map();
    existingChats.forEach(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId);
      if (otherParticipant) {
        existingChatMap.set(otherParticipant._id.toString(), chat);
      }
    });

    // Create conversation objects for all mutual friends
    const conversations = await Promise.all(acceptedUsers.map(async (user) => {
      const existingChat = existingChatMap.get(user._id.toString());
      
      if (existingChat) {
        // Use existing chat data
        const userSettings = existingChat.getUserSettings(currentUserId);
        return {
          _id: existingChat._id,
          type: 'direct',
          name: user.getFullName?.() || user.username,
          avatar: user.avatar,
          lastMessage: existingChat.lastMessage,
          unreadCount: userSettings ? existingChat.unreadCount : 0,
          isPinned: userSettings?.isPinned || false,
          isMuted: userSettings?.isMuted || false,
          participants: existingChat.participants,
          updatedAt: existingChat.updatedAt,
          hasMessages: !!existingChat.lastMessage
        };
      } else {
        // Create a virtual conversation for mutual friends without existing chats
        return {
          _id: `temp_${user._id}`, // Temporary ID for frontend
          type: 'direct',
          name: user.getFullName?.() || user.username,
          avatar: user.avatar,
          lastMessage: null,
          unreadCount: 0,
          isPinned: false,
          isMuted: false,
          participants: [currentUserId, user._id],
          updatedAt: new Date(),
          hasMessages: false
        };
      }
    }));

    // Sort conversations: pinned first, then by last message time, then by name
    conversations.sort((a, b) => {
      // Pinned chats first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then by last message time (most recent first)
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
      }
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });

    res.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get messages for a specific chat
 */
router.get("/messages/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    let chat;
    
    // Handle temporary chat IDs (for mutual friends without existing chats)
    if (chatId.startsWith('temp_')) {
      const otherUserId = chatId.replace('temp_', '');
      
      // Verify the connection is accepted
      const connection = await Connection.findOne({
        $or: [
          { requester: req.user.id, receiver: otherUserId, status: 'ACCEPTED' },
          { requester: otherUserId, receiver: req.user.id, status: 'ACCEPTED' }
        ]
      });
      
      if (!connection) {
        return res.status(403).json({ msg: "Connection not accepted" });
      }
      
      // Try to find existing chat, if not found, return empty messages
      chat = await Chat.findOne({
        participants: { $all: [req.user.id, otherUserId] },
        type: 'direct'
      });
      
      if (!chat) {
        // No existing chat, return empty messages
        return res.json([]);
      }
    } else {
      chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(req.user.id)) {
        return res.status(404).json({ msg: "Chat not found" });
      }
    }

    const skip = (page - 1) * limit;
    
    let messages;
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.toString() !== req.user.id);
      messages = await Message.find({
        $or: [
          { sender: req.user.id, receiver: otherParticipant },
          { sender: otherParticipant, receiver: req.user.id }
        ],
        deleted: { $ne: true }
      })
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    } else {
      messages = await Message.find({
        groupId: chat.groupId,
        deleted: { $ne: true }
      })
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    }

    // Mark messages as read
    if (messages.length > 0) {
      chat.markAsRead(req.user.id, messages[0]._id);
      await chat.save();
    }

    res.json(messages.reverse()); // Return in chronological order
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Send a message to a chat
 */
router.post("/messages/:chatId", auth, upload.single("media"), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, replyTo, messageType = 'text' } = req.body;
    
    let chat;
    
    // Handle temporary chat IDs (for mutual friends without existing chats)
    if (chatId.startsWith('temp_')) {
      const otherUserId = chatId.replace('temp_', '');
      
      // Verify the connection is accepted
      const connection = await Connection.findOne({
        $or: [
          { requester: req.user.id, receiver: otherUserId, status: 'ACCEPTED' },
          { requester: otherUserId, receiver: req.user.id, status: 'ACCEPTED' }
        ]
      });
      
      if (!connection) {
        return res.status(403).json({ msg: "Connection not accepted" });
      }
      
      // Create or find the chat
      chat = await Chat.findOrCreateDirectChat(req.user.id, otherUserId);
    } else {
      chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(req.user.id)) {
        return res.status(404).json({ msg: "Chat not found" });
      }
    }

    // Check if user has accepted connection for direct messages
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.toString() !== req.user.id);
      const connection = await Connection.findOne({
        $or: [
          { requester: req.user.id, receiver: otherParticipant, status: 'ACCEPTED' },
          { requester: otherParticipant, receiver: req.user.id, status: 'ACCEPTED' }
        ]
      });
      
      if (!connection) {
        return res.status(403).json({ msg: "Connection not accepted" });
      }
    }

    const messageData = {
      sender: req.user.id,
      content: content || null,
      messageType: messageType,
      replyTo: replyTo || null
    };

    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.toString() !== req.user.id);
      messageData.receiver = otherParticipant;
    } else {
      messageData.groupId = chat.groupId;
    }

    // Handle media upload
    if (req.file) {
      const fileType = req.file.mimetype.split('/')[0];
      messageData.media = {
        type: fileType === 'image' ? 'image' : 
              fileType === 'video' ? 'video' : 
              fileType === 'audio' ? 'audio' : 'document',
        url: `/chat_media/${req.file.filename}`,
        filename: req.file.originalname,
        size: req.file.size
      };
      messageData.messageType = messageData.media.type;
    }

    const message = new Message(messageData);
    await message.save();

    // Update chat last message
    chat.updateLastMessage(message);
    chat.incrementUnreadCount(req.user.id);
    await chat.save();

    // Update group last message if it's a group chat
    if (chat.type === 'group') {
      const group = await Group.findById(chat.groupId);
      if (group) {
        group.updateLastMessage(message);
        await group.save();
      }
    }

    // Populate sender info for response
    await message.populate('sender', 'username firstName lastName avatar');
    if (message.replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    res.json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Update chat settings (pin, mute)
 */
router.put("/settings/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isPinned, isMuted } = req.body;
    
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    chat.updateUserSettings(req.user.id, { isPinned, isMuted });
    await chat.save();

    res.json({ msg: "Settings updated successfully" });
  } catch (err) {
    console.error("Error updating chat settings:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Mark messages as read
 */
router.put("/read/:chatId", auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageId } = req.body;
    
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user.id)) {
      return res.status(404).json({ msg: "Chat not found" });
    }

    chat.markAsRead(req.user.id, messageId);
    await chat.save();

    res.json({ msg: "Messages marked as read" });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Search conversations
 */
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const currentUserId = req.user.id;
    
    // Search in chat names and last messages
    const chats = await Chat.find({
      participants: currentUserId,
      $or: [
        { 'lastMessage.content': { $regex: q, $options: 'i' } }
      ]
    })
    .populate('participants', 'username firstName lastName avatar')
    .populate('lastMessage.sender', 'username firstName lastName avatar')
    .populate('groupId', 'name avatar');

    // Filter and format results
    const filteredChats = chats.filter(chat => {
      if (chat.type === 'group') {
        return chat.groupId?.name.toLowerCase().includes(q.toLowerCase());
      } else {
        const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId);
        return otherParticipant?.username.toLowerCase().includes(q.toLowerCase()) ||
               otherParticipant?.getFullName?.().toLowerCase().includes(q.toLowerCase());
      }
    });

    const formattedChats = filteredChats.map(chat => {
      const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId);
      return {
        _id: chat._id,
        type: chat.type,
        name: chat.type === 'group' ? chat.groupId?.name : otherParticipant?.getFullName?.() || otherParticipant?.username,
        avatar: chat.type === 'group' ? chat.groupId?.avatar : otherParticipant?.avatar,
        lastMessage: chat.lastMessage
      };
    });

    res.json(formattedChats);
  } catch (err) {
    console.error("Error searching conversations:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
