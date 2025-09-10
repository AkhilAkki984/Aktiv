import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get potential matches for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const { category, gender: genderPref } = req.query; // FIXED: Use gender as param (from frontend genderPreference)
    const currentUser = await User.findById(req.user.id);

    let query = { _id: { $ne: req.user.id }, pauseMatches: false };

    if (category) query.preferences = { $in: [category] };

    if (genderPref && genderPref !== 'any') {
      if (genderPref === 'same') {
        query.gender = currentUser.gender;
      } else if (genderPref === 'opposite') {
        // Assume binary for simplicity; extend for non-binary as needed
        query.gender = currentUser.gender === 'male' ? 'female' : 'male';
      }
    }

    const matches = await User.find(query).select('username preferences');
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;