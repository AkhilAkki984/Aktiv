import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  avatar: { type: String },
  bio: { type: String },
  goals: [{ type: String }],
  preferences: [{ type: String }],
  location: { type: String },
  gender: { type: String }, // FIXED: New field for user's gender
  genderPreference: { type: String, default: 'any' }, // FIXED: New field (replaced restrictGender)
  pauseMatches: { type: Boolean, default: false },
  onboarded: { type: Boolean, default: false },
  checkIns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CheckIn' }], // FIXED: Correct ref case
  score: { type: Number, default: 0 },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;