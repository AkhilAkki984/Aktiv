# Goals System Documentation

## Overview

The Goals System is a comprehensive feature that allows users to create, manage, and track personal goals with check-ins, scheduling, and progress analytics. This system matches the UI design shown in the provided image and provides a dynamic backend for goal management.

## Features

### 🎯 Goal Management
- **Create Goals**: Users can create goals with titles, descriptions, and categories
- **Edit Goals**: Modify existing goals including schedule and duration
- **Delete Goals**: Remove goals that are no longer needed
- **Goal Status**: Track goals as active, paused, completed, or cancelled

### 📅 Scheduling System
- **Frequency Options**: Daily, Weekdays, Weekends, Weekly, Monthly, or Custom
- **Time Scheduling**: Set specific times (6:00 AM, 7:30 PM, etc.) or "Throughout day"
- **Custom Days**: For custom frequency, select specific days of the week
- **Duration Types**: Week, Month, Quarter, Year, or Custom duration

### ✅ Check-in System
- **Daily Check-ins**: Users can check in once per day per goal
- **Progress Tracking**: Automatic calculation of completion percentage
- **Streak Tracking**: Current streak and longest streak tracking
- **Check-in History**: Complete history of all check-ins with notes

### 📊 Progress Analytics
- **Progress Bars**: Visual progress indicators for each goal
- **Statistics**: Weekly progress, completion rates, and streaks
- **Dashboard Integration**: Top 4-5 goals displayed on dashboard
- **Real-time Updates**: Progress updates immediately after check-ins

## Technical Implementation

### Backend Architecture

#### Models (`backend/models/Goal.js`)
```javascript
// UserGoal Schema
{
  user: ObjectId,           // Reference to User
  title: String,           // Goal title
  description: String,     // Optional description
  status: String,          // active, paused, completed, cancelled
  category: String,        // health, fitness, learning, etc.
  schedule: {
    frequency: String,     // daily, weekdays, etc.
    time: String,          // 6:00 AM, Throughout day, etc.
    days: [String]         // For custom schedules
  },
  duration: {
    type: String,          // week, month, quarter, year, custom
    startDate: Date,
    endDate: Date,
    customDays: Number
  },
  progress: {
    targetCheckIns: Number,
    completedCheckIns: Number,
    currentStreak: Number,
    longestStreak: Number,
    lastCheckIn: Date
  },
  checkIns: [{
    date: Date,
    notes: String,
    createdAt: Date
  }]
}
```

#### API Routes (`backend/routes/goals.js`)
- `GET /api/goals` - Get all user goals
- `GET /api/goals/:id` - Get specific goal
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/checkin` - Check in to goal
- `GET /api/goals/:id/checkins` - Get check-in history
- `GET /api/goals/stats/overview` - Get goals statistics

### Frontend Architecture

#### Pages
- **Goals Page** (`frontend/src/pages/Goals.jsx`): Main goals interface matching the provided design
- **Dashboard Integration**: Goals displayed in dashboard with progress

#### Components
- **GoalForm** (`frontend/src/components/GoalForm.jsx`): Modal form for creating/editing goals
- **GoalCard**: Individual goal display component with check-in functionality

#### API Integration
- **goalsAPI** (`frontend/src/utils/api.js`): Centralized API calls for goals

## UI Design Features

### Goals Page Layout
- **Header**: "My Goals" title with "Create New Goal" button
- **Grid Layout**: 3-column responsive grid for goal cards
- **Goal Cards**: Each card shows:
  - Goal title and status badge
  - Weekly progress with progress bar
  - Schedule information (frequency and time)
  - Check-in/Edit buttons
- **Create Card**: Dashed border card for adding new goals

### Goal Card States
- **Active Goals**: Green "Check In" button, progress tracking
- **Paused Goals**: Blue "Resume" button
- **Completed Goals**: Different styling for achieved goals

### Progress Visualization
- **Progress Bars**: Blue progress bars showing completion percentage
- **Status Badges**: Color-coded status indicators
- **Streak Information**: Current streak display
- **Check-in Counts**: "X/Y days" format for weekly progress

## Usage Examples

### Creating a Goal
1. Click "Create New Goal" button
2. Fill in goal details:
   - Title: "Morning Workout"
   - Category: "Fitness"
   - Frequency: "Daily"
   - Time: "6:00 AM"
   - Duration: "1 Month"
3. Save goal

### Daily Check-in
1. Navigate to Goals page
2. Find active goal
3. Click "Check In" button
4. Progress automatically updates

### Viewing Progress
- Dashboard shows top 4-5 goals with progress
- Goals page shows all goals with detailed progress
- Progress bars and percentages update in real-time

## Database Schema

### UserGoal Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  title: String,
  description: String,
  status: String (enum),
  category: String (enum),
  schedule: {
    frequency: String (enum),
    time: String,
    days: [String]
  },
  duration: {
    type: String (enum),
    startDate: Date,
    endDate: Date,
    customDays: Number
  },
  progress: {
    targetCheckIns: Number,
    completedCheckIns: Number,
    currentStreak: Number,
    longestStreak: Number,
    lastCheckIn: Date
  },
  checkIns: [{
    date: Date,
    notes: String,
    createdAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## API Examples

### Create Goal
```javascript
POST /api/goals
{
  "title": "Morning Workout",
  "description": "30-minute daily workout",
  "category": "fitness",
  "schedule": {
    "frequency": "daily",
    "time": "6:00 AM"
  },
  "duration": {
    "type": "month"
  }
}
```

### Check In
```javascript
POST /api/goals/:id/checkin
{
  "notes": "Great workout today!"
}
```

### Get Goals
```javascript
GET /api/goals?status=active&category=fitness
```

## Setup Instructions

### Backend Setup
1. Ensure MongoDB is running
2. Run the server: `npm start` in backend directory
3. Seed sample data: `node seedGoals.js`

### Frontend Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Navigate to `/goals` to see the goals interface

## Future Enhancements

### Planned Features
- **Goal Categories**: More specific categories and icons
- **Goal Templates**: Pre-defined goal templates
- **Social Features**: Share goals with partners
- **Analytics**: Detailed progress charts and insights
- **Notifications**: Reminders for check-ins
- **Goal Challenges**: Time-based challenges and competitions
- **Export Data**: Export progress data for analysis

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live updates
- **Offline Support**: PWA features for offline check-ins
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Machine learning insights
- **Integration**: Calendar and reminder app integrations

## Troubleshooting

### Common Issues
1. **Check-in Not Working**: Ensure goal is active and not already checked in today
2. **Progress Not Updating**: Refresh page or check network connection
3. **Goals Not Loading**: Check authentication and API endpoints

### Debug Mode
Enable debug logging by setting `DEBUG=true` in environment variables.

## Contributing

When contributing to the goals system:
1. Follow the existing code structure
2. Add proper error handling
3. Include unit tests for new features
4. Update documentation for API changes
5. Ensure responsive design for all screen sizes

## License

This goals system is part of the Aktiv application and follows the same licensing terms.
