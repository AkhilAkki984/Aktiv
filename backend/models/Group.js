import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  avatar: { type: String }, // Group profile picture
  
  // Members
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { 
      type: String, 
      enum: ['admin', 'member'], 
      default: 'member' 
    },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // Group Settings
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Privacy Settings
  isPrivate: { type: Boolean, default: false },
  inviteOnly: { type: Boolean, default: false },
  
  // Message Settings
  lastMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  
  // User-specific settings for each member
  userSettings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    lastReadMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastReadAt: { type: Date },
    unreadCount: { type: Number, default: 0 }
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
groupSchema.index({ members: 1 });
groupSchema.index({ 'lastMessage.timestamp': -1 });
groupSchema.index({ 'userSettings.user': 1, 'userSettings.isPinned': -1 });

// Method to get user settings for a specific user
groupSchema.methods.getUserSettings = function(userId) {
  return this.userSettings.find(setting => setting.user.toString() === userId.toString());
};

// Method to update user settings
groupSchema.methods.updateUserSettings = function(userId, updates) {
  const userSetting = this.getUserSettings(userId);
  if (userSetting) {
    Object.assign(userSetting, updates);
  } else {
    this.userSettings.push({ user: userId, ...updates });
  }
};

// Method to add member to group
groupSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
    
    // Add user settings
    this.userSettings.push({ user: userId });
    
    // If role is admin, add to admins array
    if (role === 'admin' && !this.admins.includes(userId)) {
      this.admins.push(userId);
    }
  }
};

// Method to remove member from group
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  this.userSettings = this.userSettings.filter(setting => 
    setting.user.toString() !== userId.toString()
  );
  
  this.admins = this.admins.filter(admin => 
    admin.toString() !== userId.toString()
  );
};

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  return this.admins.includes(userId) || 
         this.members.some(member => 
           member.user.toString() === userId.toString() && 
           member.role === 'admin' && 
           member.isActive
         );
};

// Method to update last message
groupSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    messageId: message._id,
    content: message.content || (message.media ? `Sent ${message.media.type}` : ''),
    sender: message.sender,
    timestamp: message.createdAt
  };
  this.updatedAt = new Date();
};

// Method to increment unread count for all members except sender
groupSchema.methods.incrementUnreadCount = function(senderId) {
  this.userSettings.forEach(setting => {
    if (setting.user.toString() !== senderId.toString()) {
      setting.unreadCount = (setting.unreadCount || 0) + 1;
    }
  });
};

// Method to mark as read for a specific user
groupSchema.methods.markAsRead = function(userId, messageId) {
  const userSetting = this.getUserSettings(userId);
  if (userSetting) {
    userSetting.lastReadMessage = messageId;
    userSetting.lastReadAt = new Date();
    userSetting.unreadCount = 0;
  }
};

// Method to get unread count for a specific user
groupSchema.methods.getUnreadCount = function(userId) {
  const userSetting = this.getUserSettings(userId);
  return userSetting ? (userSetting.unreadCount || 0) : 0;
};

// Method to get member count
groupSchema.methods.getMemberCount = function() {
  return this.members.filter(member => member.isActive).length;
};

// Method to get online members count
groupSchema.methods.getOnlineMembersCount = async function() {
  const activeMemberIds = this.members
    .filter(member => member.isActive)
    .map(member => member.user);
  
  const User = mongoose.model('User');
  const onlineCount = await User.countDocuments({
    _id: { $in: activeMemberIds },
    isOnline: true
  });
  
  return onlineCount;
};

const Group = mongoose.model('Group', groupSchema);
export default Group;