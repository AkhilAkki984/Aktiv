// backend/routes/auth.js
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });
    user = new User({ username, email, password });
    await user.save();
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ ADDED: Social Login Routes

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login?token=${token}`);
});

// Twitter
router.get('/twitter', passport.authenticate('twitter'));
router.get('/twitter/callback', passport.authenticate('twitter', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login?token=${token}`);
});

// LinkedIn
router.get('/linkedin', passport.authenticate('linkedin'));
router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login?token=${token}`);
});

// Facebook
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  const token = jwt.sign({ user: { id: req.user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/login?token=${token}`);
});


export default router;