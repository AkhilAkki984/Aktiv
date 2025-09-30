// backend/routes/auth.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  try {
    // Normalize email for consistency
    const normalizedEmail = email.trim().toLowerCase();
    
    let user = await User.findOne({ email: normalizedEmail });
    if (user) return res.status(400).json({ msg: 'User already exists' });
    
    const userData = { username, email: normalizedEmail, password };
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    
    user = new User(userData);
    await user.save();
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
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
  
  // Log the raw input for debugging
  console.log('Raw email input:', `"${email}"`);
  
  // Input validation
  if (!email || !password) {
    console.log('Missing credentials:', { email: !!email, password: !!password });
    return res.status(400).json({ 
      success: false,
      msg: 'Please provide both email and password' 
    });
  }

  try {
    // Normalize email for consistency
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Normalized email:', `"${normalizedEmail}"`);
    
    // Find user by email and explicitly select the password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      console.log('Attempting case-insensitive search...');
      
      // Try case-insensitive search as fallback
      const userCaseInsensitive = await User.findOne({ 
        email: new RegExp(`^${email.trim()}$`, 'i') 
      }).select('+password');
      
      if (userCaseInsensitive) {
        console.log('User found with case-insensitive search');
        console.log('Stored email:', userCaseInsensitive.email);
        console.log('WARNING: Email case mismatch - database email:', userCaseInsensitive.email);
      }
      
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid credentials' 
      });
    }

    console.log('User found:', { 
      id: user._id, 
      email: user.email,
      hasPassword: !!user.password
    });
    
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

    // Prepare user data for response
    const userResponse = {
      id: user._id,
      email: user.email,
      username: user.username,
      onboarded: user.onboarded || false,
      // Add any other user fields you need on the frontend
    };

    console.log('Login successful for user:', userResponse.email);
    
    // Return success response with user data
    res.status(200).json({ 
      success: true,
      message: 'Login successful',
      token: token,
      user: userResponse
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
  res.redirect(`http://localhost:5173/login-signup?token=${token}`);
});

// Twitter
router.get('/twitter', passport.authenticate('twitter'));
router.get('/twitter/callback', passport.authenticate('twitter', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login-signup?token=${token}`);
});

// LinkedIn
router.get('/linkedin', passport.authenticate('linkedin'));
router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login-signup?token=${token}`);
});

// Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login-signup?token=${token}`);
});

// PASSWORD RESET ROUTE (Temporary - should be in separate file)
router.get('/reset-password/:email/:newPassword', async (req, res) => {
  try {
    const { email, newPassword } = req.params;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and new password are required' 
      });
    }

    const bcrypt = await import('bcryptjs');
    
    // Find the user (case-insensitive)
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting password',
      error: error.message 
    });
  }
});

// DEBUG ROUTE - Check user credentials (REMOVE IN PRODUCTION)
router.post('/debug-login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    
    if (!user) {
      return res.json({ 
        found: false, 
        message: 'User not found',
        searchedEmail: normalizedEmail 
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    return res.json({
      found: true,
      email: user.email,
      username: user.username,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordMatch: isMatch,
      passwordPrefix: user.password ? user.password.substring(0, 10) + '...' : null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;