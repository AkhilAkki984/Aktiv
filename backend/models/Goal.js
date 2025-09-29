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
    let daysDiff = 0;
    
    // Handle custom duration with customDays
    if (this.duration.type === 'custom' && this.duration.customDays) {
      daysDiff = this.duration.customDays;
    } else {
      // Calculate days from start/end dates for other duration types
      const startDate = new Date(this.duration.startDate);
      const endDate = this.duration.endDate || new Date();
      daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }
    
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
    
    console.log('Calculating target check-ins:', {
      durationType: this.duration.type,
      customDays: this.duration.customDays,
      daysDiff,
      frequency: this.schedule.frequency,
      expectedCheckIns,
      currentCompleted: this.progress.completedCheckIns
    });
    
    this.progress.targetCheckIns = Math.max(expectedCheckIns, this.progress.completedCheckIns);
  }
  
  next();
});

// Helper method to parse time string to hours and minutes
userGoalSchema.methods.parseTime = function(timeString) {
  if (!timeString || timeString === 'Throughout day') {
    return { hours: 0, minutes: 0, isAllDay: true };
  }
  
  const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) {
    return { hours: 0, minutes: 0, isAllDay: true };
  }
  
  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes, isAllDay: false };
};

// Helper method to get time window for check-ins
userGoalSchema.methods.getTimeWindow = function(tzOffsetMinutes = null) {
  // Compute "now" and "today" using the client's local timezone if provided
  // JS getTimezoneOffset() returns minutes to add to local to get UTC (U = L + offset) => L = U - offset
  const now = tzOffsetMinutes === null
    ? new Date()
    : new Date(Date.now() - tzOffsetMinutes * 60 * 1000);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  const timeInfo = this.parseTime(this.schedule.time);
  
  if (timeInfo.isAllDay) {
    return {
      canCheckIn: true,
      startTime: '00:00',
      endTime: '23:59',
      nextAvailableTime: null
    };
  }
  
  // Create start and end times for today
  const startTime = new Date(today);
  startTime.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
  
  const endTime = new Date(today);
  endTime.setHours(23, 59, 59, 999);
  
  // Check if current time is within the window
  const canCheckIn = now >= startTime && now <= endTime;
  
  // If not in window, calculate next available time
  let nextAvailableTime = null;
  if (!canCheckIn) {
    if (now < startTime) {
      // Before start time today
      nextAvailableTime = startTime;
    } else {
      // After end time today, next available is tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
      nextAvailableTime = tomorrow;
    }
  }
  
  return {
    canCheckIn,
    startTime: `${timeInfo.hours.toString().padStart(2, '0')}:${timeInfo.minutes.toString().padStart(2, '0')}`,
    endTime: '23:59',
    nextAvailableTime
  };
};

// Method to add a check-in with time window validation
userGoalSchema.methods.addCheckIn = function(notes = '', options = {}) {
  // Align with client's local timezone if provided
  const tzOffsetMinutes = options?.tzOffsetMinutes ?? null;
  const now = tzOffsetMinutes === null
    ? new Date()
    : new Date(Date.now() - tzOffsetMinutes * 60 * 1000);
  const today = new Date(now);
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
  
  // Previously: Enforced a time window based on schedule.time
  // Change: Allow check-in any time of day to reduce friction.
  // We still compute the window if needed for UI, but do not block here.
  
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
