import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// WARNING: This is a temporary route to reset a user's password
// REMOVE THIS ROUTE AFTER USE IN PRODUCTION
router.get('/reset-password/:email/:newPassword', async (req, res) => {
  try {
    const { email, newPassword } = req.params;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and new password are required' 
      });
    }

    // Find the user
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

export default router;
