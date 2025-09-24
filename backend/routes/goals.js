import express from 'express';
import auth from '../middleware/auth.js';
import { UserGoal } from '../models/Goal.js';

const router = express.Router();

// Get all goals for the current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category } = req.query;
    
    let query = { user: userId };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }
    
    const goals = await UserGoal.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'username');
    
    // Calculate progress percentage for each goal
    const goalsWithProgress = goals.map(goal => {
      const progressPercentage = goal.progress.targetCheckIns > 0 
        ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
        : 0;
      
      return {
        ...goal.toObject(),
        progressPercentage
      };
    });
    
    res.json(goalsWithProgress);
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get a specific goal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const goal = await UserGoal.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'username');
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    const progressPercentage = goal.progress.targetCheckIns > 0 
      ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
      : 0;
    
    res.json({
      ...goal.toObject(),
      progressPercentage
    });
  } catch (err) {
    console.error('Get goal error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create a new goal
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      schedule,
      duration
    } = req.body;
    
    // Validate required fields
    if (!title || !schedule?.frequency || !duration?.type) {
      return res.status(400).json({ 
        msg: 'Title, schedule frequency, and duration type are required' 
      });
    }
    
    // Calculate end date based on duration
    let endDate = null;
    const startDate = new Date();
    
    switch (duration.type) {
      case 'week':
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (duration.customDays) {
          endDate = new Date(startDate.getTime() + duration.customDays * 24 * 60 * 60 * 1000);
        }
        break;
    }
    
    const goalData = {
      user: req.user.id,
      title,
      description,
      category: category || 'personal',
      schedule: {
        frequency: schedule.frequency,
        time: schedule.time || 'Throughout day',
        days: schedule.days || []
      },
      duration: {
        type: duration.type,
        startDate,
        endDate,
        customDays: duration.customDays
      }
    };
    
    const goal = new UserGoal(goalData);
    await goal.save();
    
    res.status(201).json(goal);
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update a goal
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Goal update request received:', {
      goalId: req.params.id,
      body: req.body
    });
    
    const {
      title,
      description,
      category,
      status,
      schedule,
      duration
    } = req.body;
    
    const goal = await UserGoal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Update fields - allow empty strings and null values
    if (title !== undefined) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (category !== undefined) goal.category = category;
    if (status !== undefined) goal.status = status;
    if (schedule !== undefined) {
      goal.schedule = {
        ...goal.schedule,
        ...schedule
      };
    }
    if (duration !== undefined) {
      console.log('Updating duration:', {
        currentDuration: goal.duration,
        newDuration: duration
      });
      goal.duration = {
        ...goal.duration,
        ...duration
      };
      console.log('Updated duration:', goal.duration);
    }
    
    await goal.save();
    
    // Recalculate progress percentage after update
    const progressPercentage = goal.progress.targetCheckIns > 0 
      ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
      : 0;
    
    console.log('Goal updated successfully:', {
      id: goal._id,
      title: goal.title,
      schedule: goal.schedule,
      duration: goal.duration,
      targetCheckIns: goal.progress.targetCheckIns,
      completedCheckIns: goal.progress.completedCheckIns,
      progressPercentage
    });
    
    res.json({
      ...goal.toObject(),
      progressPercentage
    });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Delete a goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await UserGoal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    res.json({ msg: 'Goal deleted successfully' });
  } catch (err) {
    console.error('Delete goal error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Check in to a goal
router.post('/:id/checkin', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    
    const goal = await UserGoal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    if (goal.status !== 'active') {
      return res.status(400).json({ msg: 'Cannot check in to inactive goal' });
    }
    
    const result = goal.addCheckIn(notes);
    
    if (!result.success) {
      return res.status(400).json({ msg: result.message });
    }
    
    await goal.save();
    
    const progressPercentage = goal.progress.targetCheckIns > 0 
      ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
      : 0;
    
    res.json({
      ...goal.toObject(),
      progressPercentage,
      message: result.message
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get check-in history for a goal
router.get('/:id/checkins', auth, async (req, res) => {
  try {
    const goal = await UserGoal.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Sort check-ins by date (newest first)
    const sortedCheckIns = goal.checkIns.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(sortedCheckIns);
  } catch (err) {
    console.error('Get check-ins error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get goals statistics for dashboard
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const goals = await UserGoal.find({ user: userId });
    
    const stats = {
      total: goals.length,
      active: goals.filter(g => g.status === 'active').length,
      completed: goals.filter(g => g.status === 'completed').length,
      paused: goals.filter(g => g.status === 'paused').length,
      totalCheckIns: goals.reduce((sum, g) => sum + g.progress.completedCheckIns, 0),
      currentStreaks: goals.map(g => g.progress.currentStreak),
      longestStreak: Math.max(...goals.map(g => g.progress.longestStreak), 0)
    };
    
    // Get top 5 goals by progress for dashboard
    const topGoals = goals
      .filter(g => g.status === 'active')
      .map(goal => {
        const progressPercentage = goal.progress.targetCheckIns > 0 
          ? Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100)
          : 0;
        
        return {
          ...goal.toObject(),
          progressPercentage
        };
      })
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 5);
    
    res.json({
      stats,
      topGoals
    });
  } catch (err) {
    console.error('Get goals stats error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
