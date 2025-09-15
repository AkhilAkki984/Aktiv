import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema({
  requester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'], 
    default: 'PENDING' 
  },
  message: { 
    type: String, 
    maxlength: 500 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure unique connection requests
connectionSchema.index({ requester: 1, receiver: 1 }, { unique: true });

// Update timestamp on save
connectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get connection status between two users
connectionSchema.statics.getConnectionStatus = async function(userId1, userId2) {
  const connection = await this.findOne({
    $or: [
      { requester: userId1, receiver: userId2 },
      { requester: userId2, receiver: userId1 }
    ]
  });
  
  if (!connection) return null;
  
  return {
    status: connection.status,
    isRequester: connection.requester.toString() === userId1,
    connection
  };
};

// Static method to get user's connections
connectionSchema.statics.getUserConnections = async function(userId, status = 'ACCEPTED') {
  return this.find({
    $or: [
      { requester: userId, status },
      { receiver: userId, status }
    ]
  }).populate('requester receiver', 'username firstName lastName avatar city state');
};

// Static method to get pending requests for a user
connectionSchema.statics.getPendingRequests = async function(userId) {
  return this.find({
    receiver: userId,
    status: 'PENDING'
  }).populate('requester', 'username firstName lastName avatar city state bio goals');
};

// Static method to get sent requests by a user
connectionSchema.statics.getSentRequests = async function(userId) {
  return this.find({
    requester: userId,
    status: 'PENDING'
  }).populate('receiver', 'username firstName lastName avatar city state bio goals');
};

const Connection = mongoose.model('Connection', connectionSchema);
export default Connection;
