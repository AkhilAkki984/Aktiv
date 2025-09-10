import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
