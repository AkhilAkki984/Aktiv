import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  type: { type: String, enum: ['direct', 'group'], default: 'direct' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // For group chats
  lastMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  unreadCount: { type: Number, default: 0 },
  userSettings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPinned: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    lastReadMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastReadAt: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ 'userSettings.user': 1, 'userSettings.isPinned': -1 });

// Method to get user settings for a specific user
chatSchema.methods.getUserSettings = function(userId) {
  return this.userSettings.find(setting => setting.user.toString() === userId.toString());
};

// Method to update user settings
chatSchema.methods.updateUserSettings = function(userId, updates) {
  const userSetting = this.getUserSettings(userId);
  if (userSetting) {
    Object.assign(userSetting, updates);
  } else {
    this.userSettings.push({ user: userId, ...updates });
  }
};

// Method to update last message
chatSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    messageId: message._id,
    content: message.content || (message.media ? `Sent ${message.media.type}` : ''),
    sender: message.sender,
    timestamp: message.createdAt
  };
  this.updatedAt = new Date();
};

// Method to increment unread count for all participants except sender
chatSchema.methods.incrementUnreadCount = function(senderId) {
  this.userSettings.forEach(setting => {
    if (setting.user.toString() !== senderId.toString()) {
      this.unreadCount += 1;
    }
  });
};

// Method to mark as read for a specific user
chatSchema.methods.markAsRead = function(userId, messageId) {
  const userSetting = this.getUserSettings(userId);
  if (userSetting) {
    userSetting.lastReadMessage = messageId;
    userSetting.lastReadAt = new Date();
    this.unreadCount = Math.max(0, this.unreadCount - 1);
  }
};

// Static method to find or create direct chat
chatSchema.statics.findOrCreateDirectChat = async function(user1Id, user2Id) {
  let chat = await this.findOne({
    type: 'direct',
    participants: { $all: [user1Id, user2Id] }
  });

  if (!chat) {
    chat = new this({
      participants: [user1Id, user2Id],
      type: 'direct',
      userSettings: [
        { user: user1Id },
        { user: user2Id }
      ]
    });
    await chat.save();
  }

  return chat;
};

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
