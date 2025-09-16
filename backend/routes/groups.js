import express from "express";
import auth from "../middleware/auth.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import Connection from "../models/Connection.js";

const router = express.Router();

/**
 * ✅ Create a new group
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, description, members, avatar } = req.body;
    
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ msg: "Group name and at least one member required" });
    }

    // Verify all members exist and have accepted connections
    const memberUsers = await User.find({ _id: { $in: members } });
    if (memberUsers.length !== members.length) {
      return res.status(400).json({ msg: "One or more members not found" });
    }

    // Check if all members have accepted connections with the creator
    for (const memberId of members) {
      const connection = await Connection.findOne({
        $or: [
          { requester: req.user.id, receiver: memberId, status: 'ACCEPTED' },
          { requester: memberId, receiver: req.user.id, status: 'ACCEPTED' }
        ]
      });
      
      if (!connection) {
        return res.status(400).json({ 
          msg: `Connection not accepted with user ${memberId}` 
        });
      }
    }

    // Create group
    const group = new Group({
      name,
      description,
      avatar,
      createdBy: req.user.id,
      admins: [req.user.id],
      members: [
        { user: req.user.id, role: 'admin' },
        ...members.map(memberId => ({ user: memberId, role: 'member' }))
      ],
      userSettings: [
        { user: req.user.id },
        ...members.map(memberId => ({ user: memberId }))
      ]
    });

    await group.save();

    // Populate group data
    await group.populate([
      { path: 'members.user', select: 'username firstName lastName avatar' },
      { path: 'createdBy', select: 'username firstName lastName avatar' },
      { path: 'admins', select: 'username firstName lastName avatar' }
    ]);

    res.status(201).json({
      msg: "Group created successfully",
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        createdBy: group.createdBy,
        admins: group.admins,
        members: group.members,
        memberCount: group.getMemberCount(),
        createdAt: group.createdAt
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
    const groups = await Group.find({
      'members.user': req.user.id,
      'members.isActive': true
    })
    .populate('members.user', 'username firstName lastName avatar isOnline lastSeen')
    .populate('lastMessage.sender', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('admins', 'username firstName lastName avatar')
    .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 });

    const groupsWithSettings = groups.map(group => {
      const userSettings = group.getUserSettings(req.user.id);
      return {
        _id: group._id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        createdBy: group.createdBy,
        admins: group.admins,
        members: group.members,
        memberCount: group.getMemberCount(),
        lastMessage: group.lastMessage,
        unreadCount: group.getUnreadCount(req.user.id),
        isPinned: userSettings?.isPinned || false,
        isMuted: userSettings?.isMuted || false,
        updatedAt: group.updatedAt,
        createdAt: group.createdAt
      };
    });

    res.json(groupsWithSettings);
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
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'username firstName lastName avatar isOnline lastSeen')
      .populate('createdBy', 'username firstName lastName avatar')
      .populate('admins', 'username firstName lastName avatar');

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const userSettings = group.getUserSettings(req.user.id);
    
    res.json({
      _id: group._id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      createdBy: group.createdBy,
      admins: group.admins,
      members: group.members,
      memberCount: group.getMemberCount(),
      lastMessage: group.lastMessage,
      unreadCount: group.getUnreadCount(req.user.id),
      isPinned: userSettings?.isPinned || false,
      isMuted: userSettings?.isMuted || false,
      isAdmin: group.isAdmin(req.user.id),
      updatedAt: group.updatedAt,
      createdAt: group.createdAt
    });
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Add members to group
 */
router.post("/:groupId/members", auth, async (req, res) => {
  try {
    const { members } = req.body;
    
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ msg: "Members array required" });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ msg: "Only admins can add members" });
    }

    // Verify all new members exist and have accepted connections
    const memberUsers = await User.find({ _id: { $in: members } });
    if (memberUsers.length !== members.length) {
      return res.status(400).json({ msg: "One or more members not found" });
    }

    // Check connections and add members
    const addedMembers = [];
    for (const memberId of members) {
      if (group.isMember(memberId)) {
        continue; // Skip if already a member
      }

      const connection = await Connection.findOne({
        $or: [
          { requester: req.user.id, receiver: memberId, status: 'ACCEPTED' },
          { requester: memberId, receiver: req.user.id, status: 'ACCEPTED' }
        ]
      });
      
      if (!connection) {
        return res.status(400).json({ 
          msg: `Connection not accepted with user ${memberId}` 
        });
      }

      group.addMember(memberId, 'member');
      addedMembers.push(memberId);
    }

    if (addedMembers.length === 0) {
      return res.status(400).json({ msg: "No new members to add" });
    }

    await group.save();

    // Populate updated group
    await group.populate([
      { path: 'members.user', select: 'username firstName lastName avatar' },
      { path: 'createdBy', select: 'username firstName lastName avatar' },
      { path: 'admins', select: 'username firstName lastName avatar' }
    ]);

    res.json({
      msg: "Members added successfully",
      group: {
        _id: group._id,
        name: group.name,
        members: group.members,
        memberCount: group.getMemberCount()
      }
    });
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

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(req.user.id) && req.user.id !== memberId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    if (!group.isMember(memberId)) {
      return res.status(400).json({ msg: "User is not a member of this group" });
    }

    // Prevent removing the last admin
    if (group.isAdmin(memberId) && group.admins.length === 1) {
      return res.status(400).json({ msg: "Cannot remove the last admin" });
    }

    group.removeMember(memberId);
    await group.save();

    res.json({ msg: "Member removed successfully" });
  } catch (err) {
    console.error("Error removing member:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Update group settings
 */
router.put("/:groupId/settings", auth, async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isAdmin(req.user.id)) {
      return res.status(403).json({ msg: "Only admins can update group settings" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar !== undefined) group.avatar = avatar;

    await group.save();

    res.json({ msg: "Group settings updated successfully" });
  } catch (err) {
    console.error("Error updating group settings:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Update user's group settings (pin, mute, etc.)
 */
router.put("/:groupId/user-settings", auth, async (req, res) => {
  try {
    const { isPinned, isMuted } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const updates = {};
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (isMuted !== undefined) updates.isMuted = isMuted;

    group.updateUserSettings(req.user.id, updates);
    await group.save();

    res.json({ msg: "User settings updated successfully" });
  } catch (err) {
    console.error("Error updating user settings:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Get group messages
 */
router.get("/:groupId/messages", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(req.user.id)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const skip = (page - 1) * limit;
    const messages = await Message.find({
      groupId: req.params.groupId,
      deleted: { $ne: true }
    })
    .populate('sender', 'username firstName lastName avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Mark messages as read
    if (messages.length > 0) {
      group.markAsRead(req.user.id, messages[0]._id);
      await group.save();
    }

    res.json(messages.reverse()); // Return in chronological order
  } catch (err) {
    console.error("Error fetching group messages:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/**
 * ✅ Leave group
 */
router.post("/:groupId/leave", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ msg: "Group not found" });
    }

    if (!group.isMember(req.user.id)) {
      return res.status(400).json({ msg: "You are not a member of this group" });
    }

    // If user is the last admin, transfer admin to another member
    if (group.isAdmin(req.user.id) && group.admins.length === 1) {
      const otherMembers = group.members.filter(member => 
        member.user.toString() !== req.user.id && member.isActive
      );
      
      if (otherMembers.length > 0) {
        const newAdmin = otherMembers[0].user;
        group.admins = [newAdmin];
        group.members.find(member => member.user.toString() === newAdmin.toString()).role = 'admin';
      }
    }

    group.removeMember(req.user.id);
    await group.save();

    res.json({ msg: "Left group successfully" });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;