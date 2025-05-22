const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user exists
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

      // Save user to the database (password hashing is handled in the model)
      await user.save();

      // Generate and return JWT token
      const token = user.generateAuthToken();

      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Generate and return JWT token
      const token = user.generateAuthToken();

      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/watchlist
// @desc    Add or remove items from watchlist
// @access  Private
router.put('/watchlist', auth, async (req, res) => {
  try {
    const { action, symbol, type } = req.body;
    
    if (!action || !symbol) {
      return res.status(400).json({ msg: 'Action and symbol are required' });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Initialize watchlist if it doesn't exist
    if (!user.watchlist) {
      user.watchlist = [];
    }
    
    if (action === 'add') {
      // Check if symbol already exists in watchlist
      const symbolExists = user.watchlist.some(item => item.symbol === symbol);
      
      if (symbolExists) {
        return res.status(400).json({ msg: 'Symbol already in watchlist' });
      }
      
      user.watchlist.push({
        symbol,
        type: type || 'unknown',
        addedAt: Date.now()
      });
    } else if (action === 'remove') {
      user.watchlist = user.watchlist.filter(item => item.symbol !== symbol);
    } else {
      return res.status(400).json({ msg: 'Invalid action' });
    }
    
    await user.save();
    res.json(user.watchlist);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/profile
// @desc    Update user profile settings
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, profileSettings } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update fields if provided
    if (name) user.name = name;
    
    if (profileSettings) {
      user.profileSettings = {
        ...user.profileSettings,
        ...profileSettings
      };
    }
    
    await user.save();
    
    // Return user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;