import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For direct messages
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // For group messages
  content: { type: String }, // Text content
  media: {
    type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
    url: { type: String },
    filename: { type: String },
    size: { type: Number }
  },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'video', 'audio', 'document', 'system'], 
    default: 'text' 
  },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // For message replies
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
