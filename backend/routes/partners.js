// backend/routes/partners.js
import express from 'express';
import auth from '../middleware/auth.js';
import Goal from '../models/Goal.js';
import CheckIn from '../models/CheckIn.js';
import User from '../models/User.js';

const router = express.Router();

// Create a new goal with a partner
router.post('/goals', auth, async (req, res) => {
  try {
    const { goal, partnerId } = req.body;
    const newGoal = new Goal({ user1: req.user.id, user2: partnerId, goal });
    await newGoal.save();
    res.json(newGoal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Create a new check-in and update user score
router.post('/checkins', auth, async (req, res) => {
  try {
    const checkIn = new CheckIn({ user: req.user.id, message: req.body.message });
    await checkIn.save();

    await User.findByIdAndUpdate(req.user.id, {
      $inc: { score: 10 },
      $push: { checkIns: checkIn._id },
    });

    res.json(checkIn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
