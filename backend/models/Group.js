import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  avatar: { type: String }, // URL to group avatar image
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  settings: {
    isPrivate: { type: Boolean, default: false },
    allowMemberInvite: { type: Boolean, default: true },
    muteNotifications: { type: Boolean, default: false }
  },
  lastMessage: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ 'lastMessage.timestamp': -1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Method to check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => member.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

// Method to add member
groupSchema.methods.addMember = function(userId, addedBy) {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: 'member',
      addedBy: addedBy
    });
  }
};

// Method to remove member
groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
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

const Group = mongoose.model('Group', groupSchema);
export default Group;
