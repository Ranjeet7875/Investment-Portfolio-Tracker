// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      name,
      email,
      password
    });
    
    await user.save();
    
    // Generate JWT
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    
    // Generate JWT
    const payload = {
      user: {
        id: user.id
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  const { name, email, profileSettings } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (profileSettings) {
      user.profileSettings = {
        ...user.profileSettings,
        ...profileSettings
      };
    }
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Manage watchlist
router.put('/watchlist', auth, async (req, res) => {
  const { action, symbol, type } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Add to watchlist
    if (action === 'add') {
      // Check if already in watchlist
      const exists = user.watchlist.some(item => item.symbol === symbol);
      if (!exists) {
        user.watchlist.push({ symbol, type });
      }
    }
    // Remove from watchlist
    else if (action === 'remove') {
      user.watchlist = user.watchlist.filter(item => item.symbol !== symbol);
    }
    
    await user.save();
    res.json(user.watchlist);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;