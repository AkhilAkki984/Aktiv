import mongoose  from 'mongoose';

const checkInSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const CheckIn = mongoose.model('CheckIn', checkInSchema);
export default CheckIn;