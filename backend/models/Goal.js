import mongoose from 'mongoose';

// Individual User Goals Schema
const userGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'paused', 'completed', 'cancelled'], 
    default: 'active' 
  },
  category: { 
    type: String, 
    enum: ['health', 'fitness', 'learning', 'productivity', 'personal', 'other'], 
    default: 'personal' 
  },
  
  // Scheduling
  schedule: {
    frequency: { 
      type: String, 
      enum: ['daily', 'weekdays', 'weekends', 'weekly', 'monthly', 'custom'], 
      required: true 
    },
    time: { type: String }, // e.g., "6:00 AM", "7:30 PM", "Throughout day"
    days: [{ type: String }], // For custom schedules: ['monday', 'wednesday', 'friday']
  },
  
  // Duration and Progress
  duration: {
    type: { 
      type: String, 
      enum: ['week', 'month', 'quarter', 'year', 'custom'], 
      required: true 
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    customDays: { type: Number }, // For custom duration
  },
  
  // Progress Tracking
  progress: {
    targetCheckIns: { type: Number, default: 0 }, // Total expected check-ins
    completedCheckIns: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCheckIn: { type: Date },
  },
  
  // Check-ins history
  checkIns: [{ 
    date: { type: Date, required: true },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Partner Goals Schema (existing functionality)
const partnerGoalSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create indexes for better performance
userGoalSchema.index({ user: 1, status: 1 });
userGoalSchema.index({ user: 1, createdAt: -1 });
userGoalSchema.index({ 'progress.lastCheckIn': -1 });

// Pre-save middleware to update progress
userGoalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate target check-ins based on duration and frequency
  if (this.duration.type && this.schedule.frequency) {
    const startDate = new Date(this.duration.startDate);
    const endDate = this.duration.endDate || new Date();
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    let expectedCheckIns = 0;
    switch (this.schedule.frequency) {
      case 'daily':
        expectedCheckIns = daysDiff;
        break;
      case 'weekdays':
        expectedCheckIns = Math.floor(daysDiff / 7) * 5;
        break;
      case 'weekends':
        expectedCheckIns = Math.floor(daysDiff / 7) * 2;
        break;
      case 'weekly':
        expectedCheckIns = Math.floor(daysDiff / 7);
        break;
      case 'monthly':
        expectedCheckIns = Math.floor(daysDiff / 30);
        break;
      case 'custom':
        expectedCheckIns = this.schedule.days ? Math.floor(daysDiff / 7) * this.schedule.days.length : 0;
        break;
    }
    
    this.progress.targetCheckIns = Math.max(expectedCheckIns, this.progress.completedCheckIns);
  }
  
  next();
});

// Method to add a check-in
userGoalSchema.methods.addCheckIn = function(notes = '') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if already checked in today
  const existingCheckIn = this.checkIns.find(checkIn => {
    const checkInDate = new Date(checkIn.date);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });
  
  if (existingCheckIn) {
    return { success: false, message: 'Already checked in today' };
  }
  
  // Add new check-in
  this.checkIns.push({
    date: today,
    notes: notes,
    createdAt: new Date()
  });
  
  // Update progress
  this.progress.completedCheckIns = this.checkIns.length;
  this.progress.lastCheckIn = today;
  
  // Calculate current streak
  this.calculateStreak();
  
  return { success: true, message: 'Check-in added successfully' };
};

// Method to calculate current streak
userGoalSchema.methods.calculateStreak = function() {
  if (this.checkIns.length === 0) {
    this.progress.currentStreak = 0;
    return;
  }
  
  // Sort check-ins by date (newest first)
  const sortedCheckIns = [...this.checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < sortedCheckIns.length; i++) {
    const checkInDate = new Date(sortedCheckIns[i].date);
    checkInDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    expectedDate.setHours(0, 0, 0, 0);
    
    if (checkInDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  
  this.progress.currentStreak = streak;
  this.progress.longestStreak = Math.max(this.progress.longestStreak, streak);
};

// Create models
const UserGoal = mongoose.model('UserGoal', userGoalSchema);
const PartnerGoal = mongoose.model('PartnerGoal', partnerGoalSchema);

// Export both models
export { UserGoal, PartnerGoal };
export default UserGoal; // Default export for backward compatibility
