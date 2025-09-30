// backend/routes/users.js
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get current user's profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Update current user's profile
router.put('/profile', auth, async (req, res) => {
  try {
    console.log('Profile update request for user:', req.user.id);
    console.log('Update data:', req.body);
    
    // Parse location string into separate fields if provided
    if (req.body.location) {
      const locationParts = req.body.location.split(',').map(part => part.trim());
      
      // Extract location components from comma-separated string
      // Format: Country, City, Area
      if (locationParts.length >= 1) req.body.country = locationParts[0];
      if (locationParts.length >= 2) req.body.city = locationParts[1];
      if (locationParts.length >= 3) req.body.area = locationParts[2];
      
      console.log('Parsed location:', {
        country: req.body.country,
        city: req.body.city,
        area: req.body.area
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      req.body, 
      { 
        new: true,
        runValidators: true // Run model validators
      }
    ).select('-password');
    
    console.log('Profile updated successfully:', {
      id: user._id,
      avatar: user.avatar,
      bio: user.bio,
      onboarded: user.onboarded
    });
    
    res.json(user);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update current user's preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { preferences: req.body.preferences },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
