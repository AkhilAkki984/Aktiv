import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Info
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  
  // Profile Info
  firstName: { type: String },
  lastName: { type: String },
  avatar: { type: String },
  bio: { type: String },
  
  // Location & Preferences
  country: { type: String },
  state: { type: String },
  city: { type: String },
  area: { type: String },
  postalCode: { type: String },
  location: { type: String }, // Keep for backward compatibility
  geoLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  partnerPreference: { 
    type: String, 
    enum: ['LOCAL', 'VIRTUAL', 'BOTH'], 
    default: 'BOTH' 
  },
  
  // Goals & Interests
  goals: [{ type: String }],
  preferences: [{ type: String }],
  
  // Legacy fields for backward compatibility
  gender: { type: String },
  genderPreference: { type: String, default: 'any' },
  pauseMatches: { type: Boolean, default: false },
  onboarded: { type: Boolean, default: false },
  checkIns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CheckIn' }],
  score: { type: Number, default: 0 },
  
  // Stats
  connectionCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  
  // Online Status
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Helper method to get full name
userSchema.methods.getFullName = function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
};

// Helper method to get initials
userSchema.methods.getInitials = function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }
  return this.username.substring(0, 2).toUpperCase();
};

// Helper method to get location string
userSchema.methods.getLocationString = function() {
  if (this.city && this.state) {
    return `${this.city}, ${this.state}`;
  }
  if (this.area && this.city) {
    return `${this.area}, ${this.city}`;
  }
  return this.location || 'Location not specified';
};

// Helper method to calculate distance from another user
userSchema.methods.calculateDistance = function(otherUser) {
  if (!this.geoLocation || !otherUser.geoLocation) {
    return null;
  }
  
  const R = 3959; // Earth's radius in miles
  const dLat = (otherUser.geoLocation.latitude - this.geoLocation.latitude) * Math.PI / 180;
  const dLon = (otherUser.geoLocation.longitude - this.geoLocation.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.geoLocation.latitude * Math.PI / 180) * Math.cos(otherUser.geoLocation.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Helper method to get shared goals with another user
userSchema.methods.getSharedGoals = function(otherUser) {
  if (!this.goals || !otherUser.goals) return [];
  return this.goals.filter(goal => otherUser.goals.includes(goal));
};

const User = mongoose.model('User', userSchema);
export default User;