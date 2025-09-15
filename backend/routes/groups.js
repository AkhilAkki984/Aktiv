import express from "express";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import auth from "../middleware/auth.js";
import Group from "../models/Group.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Connection from "../models/Connection.js";

dotenv.config();
const router = express.Router();

// Configure GridFS storage for group avatars
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    filename: `group_${Date.now()}_${file.originalname}`,
    bucketName: "group_avatars",
  }),
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed for group avatars.'));
    }
  }
});

/**
 * ✅ Create a new group
 */
router.post("/", auth, upload.single("avatar"), async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    const currentUserId = req.user.id;

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ msg: "Name and member IDs are required" });
    }

    // Verify all members have accepted connections with the creator
    const allMemberIds = [...memberIds, currentUserId];
    const connections = await Connection.find({
      $or: [
        { requester: currentUserId, receiver: { $in: memberIds }, status: 'ACCEPTED' },
        { requester: { $in: memberIds }, receiver: currentUserId, status: 'ACCEPTED' }
      ]
    });

    const connectedUserIds = new Set();
    connections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      connectedUserIds.add(otherUserId);
    });

    // Check if all members are connected
    const unconnectedMembers = memberIds.filter(id => !connectedUserIds.has(id));
    if (unconnectedMembers.length > 0) {
      return res.status(400).json({ 
        msg: "All members must have accepted connections with you" 
      });
    }

    // Create group
    const groupData = {
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: currentUserId,
      avatar: req.file ? `/group_avatars/${req.file.filename}` : null,
      members: [
        { user: currentUserId, role: 'admin' }, // Creator is admin
        ...memberIds.map(id => ({ user: id, role: 'member', addedBy: currentUserId }))
      ]
    };

    const group = new Group(groupData);
    await group.save();

    // Create chat for the group
    const chat = new Chat({
      participants: allMemberIds,
      type: 'group',
      groupId: group._id,
      userSettings: allMemberIds.map(id => ({ user: id }))
    });
    await chat.save();

    // Populate group data for response
    await group.populate('members.user', 'username firstName lastName avatar');
    await group.populate('createdBy', 'username firstName lastName avatar');

    res.json({
      group,
      chat: {
        _id: chat._id,
        type: 'group',
        groupId: group._id
      }
    });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get user's groups
 */
router.get("/", auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const groups = await Group.find({
      'members.user': currentUserId
    })
    .populate('members.user', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('lastMessage.sender', 'username firstName lastName avatar')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });

    res.json(groups);
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get group details
 */
router.get("/:groupId", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('members.user', 'username firstName lastName avatar')
      .populate('createdBy', 'username firstName lastName avatar')
      .populate('lastMessage.sender', 'username firstName lastName avatar');

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(currentUserId)) {
      return res.status(403).json({ msg: "Not a member of this group" });
    }

    res.json(group);
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Update group details
 */
router.put("/:groupId", auth, upload.single("avatar"), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(currentUserId)) {
      return res.status(403).json({ msg: "Only admins can update group details" });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (req.file) group.avatar = `/group_avatars/${req.file.filename}`;

    group.updatedAt = new Date();
    await group.save();

    await group.populate('members.user', 'username firstName lastName avatar');
    await group.populate('createdBy', 'username firstName lastName avatar');

    res.json(group);
  } catch (err) {
    console.error("Error updating group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Add members to group
 */
router.post("/:groupId/members", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const currentUserId = req.user.id;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ msg: "Member IDs are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(currentUserId)) {
      return res.status(403).json({ msg: "Only admins can add members" });
    }

    // Verify all new members have accepted connections with the current user
    const connections = await Connection.find({
      $or: [
        { requester: currentUserId, receiver: { $in: memberIds }, status: 'ACCEPTED' },
        { requester: { $in: memberIds }, receiver: currentUserId, status: 'ACCEPTED' }
      ]
    });

    const connectedUserIds = new Set();
    connections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      connectedUserIds.add(otherUserId);
    });

    const validMemberIds = memberIds.filter(id => 
      connectedUserIds.has(id) && !group.isMember(id)
    );

    if (validMemberIds.length === 0) {
      return res.status(400).json({ 
        msg: "No valid new members to add" 
      });
    }

    // Add members to group
    validMemberIds.forEach(memberId => {
      group.addMember(memberId, currentUserId);
    });

    await group.save();

    // Update chat participants
    const chat = await Chat.findOne({ groupId: group._id });
    if (chat) {
      chat.participants = [...new Set([...chat.participants, ...validMemberIds])];
      validMemberIds.forEach(memberId => {
        chat.updateUserSettings(memberId, {});
      });
      await chat.save();
    }

    await group.populate('members.user', 'username firstName lastName avatar');

    res.json(group);
  } catch (err) {
    console.error("Error adding members:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Remove member from group
 */
router.delete("/:groupId/members/:memberId", auth, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(currentUserId) && memberId !== currentUserId) {
      return res.status(403).json({ msg: "Only admins can remove other members" });
    }

    if (!group.isMember(memberId)) {
      return res.status(400).json({ msg: "User is not a member of this group" });
    }

    // Remove member from group
    group.removeMember(memberId);
    await group.save();

    // Update chat participants
    const chat = await Chat.findOne({ groupId: group._id });
    if (chat) {
      chat.participants = chat.participants.filter(id => id.toString() !== memberId);
      await chat.save();
    }

    await group.populate('members.user', 'username firstName lastName avatar');

    res.json(group);
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Leave group
 */
router.post("/:groupId/leave", auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(currentUserId)) {
      return res.status(400).json({ msg: "You are not a member of this group" });
    }

    // Remove user from group
    group.removeMember(currentUserId);
    await group.save();

    // Update chat participants
    const chat = await Chat.findOne({ groupId: group._id });
    if (chat) {
      chat.participants = chat.participants.filter(id => id.toString() !== currentUserId);
      await chat.save();
    }

    res.json({ msg: "Left group successfully" });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get available users for group creation (accepted connections only)
 */
router.get("/available-users", auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Get all accepted connections
    const connections = await Connection.find({
      $or: [
        { requester: currentUserId, status: 'ACCEPTED' },
        { receiver: currentUserId, status: 'ACCEPTED' }
      ]
    });

    const connectedUserIds = new Set();
    connections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      connectedUserIds.add(otherUserId);
    });

    // Get user details for connected users
    const users = await User.find({
      _id: { $in: Array.from(connectedUserIds) }
    }).select('username firstName lastName avatar');

    res.json(users);
  } catch (err) {
    console.error("Error fetching available users:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
