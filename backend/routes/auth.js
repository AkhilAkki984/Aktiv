// backend/routes/auth.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });
    
    const userData = { username, email, password };
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    
    user = new User(userData);
    await user.save();
    
    // Get full user data (excluding password)
    const fullUser = await User.findById(user._id).select('-password');
    
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Registration successful for user:', fullUser.email);
    
    // Return token and complete user data
    res.json({ 
      success: true,
      token,
      user: fullUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  console.log('Login request received:', { 
    email: req.body.email,
    hasPassword: !!req.body.password 
  });

  const { email, password } = req.body;
  
  // Input validation
  if (!email || !password) {
    console.log('Missing credentials:', { email: !!email, password: !!password });
    return res.status(400).json({ 
      success: false,
      msg: 'Please provide both email and password' 
    });
  }

  try {
    // Find user by email and explicitly select the password field
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid email or password' 
      });
    }

    console.log('User found, comparing password...');
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('Password comparison failed for user:', email);
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid email or password' 
      });
    }
    
    console.log('Password match successful for user:', email);

    // Create JWT token
    const payload = { 
      user: { 
        id: user.id,
        email: user.email
      } 
    };

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ 
        success: false, 
        msg: 'Server configuration error' 
      });
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Update user's last login time
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    // Get fresh user data with all fields (excluding password)
    const fullUser = await User.findById(user._id).select('-password');
    
    console.log('Login successful for user:', fullUser.email);
    console.log('User profile data:', {
      avatar: fullUser.avatar,
      bio: fullUser.bio,
      onboarded: fullUser.onboarded,
      hasPreferences: !!fullUser.preferences?.length,
      hasGoals: !!fullUser.goals?.length
    });
    
    // Return success response with complete user data
    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      token: token,
      user: fullUser
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ ADDED: Social Login Routes

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const frontendUrl = process.env.FRONTEND_URL || 'https://aktiv-frontend.onrender.com';
  res.redirect(`${frontendUrl}/login-signup?token=${token}`);
});

// Twitter
router.get('/twitter', passport.authenticate('twitter'));
router.get('/twitter/callback', passport.authenticate('twitter', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const frontendUrl = process.env.FRONTEND_URL || 'https://aktiv-frontend.onrender.com';
  res.redirect(`${frontendUrl}/login-signup?token=${token}`);
});

// LinkedIn
router.get('/linkedin', passport.authenticate('linkedin'));
router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const frontendUrl = process.env.FRONTEND_URL || 'https://aktiv-frontend.onrender.com';
  res.redirect(`${frontendUrl}/login-signup?token=${token}`);
});

// Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const frontendUrl = process.env.FRONTEND_URL || 'https://aktiv-frontend.onrender.com';
  res.redirect(`${frontendUrl}/login-signup?token=${token}`);
});


export default router;