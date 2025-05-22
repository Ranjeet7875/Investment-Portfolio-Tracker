// server/routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const auth = require('../middleware/auth');

// @route   GET api/portfolio
// @desc    Get user's portfolio summary
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find portfolio for user
    let portfolio = await Portfolio.findOne({ user: req.user.id });
    
    // If no portfolio exists, create one
    if (!portfolio) {
      portfolio = new Portfolio({
        user: req.user.id,
        name: 'My Portfolio'
      });
      
      await portfolio.save();
    }
    
    // Get all assets to calculate current total value
    const assets = await Asset.find({ user: req.user.id });
    
    // Calculate total portfolio value
    let totalValue = 0;
    let composition = {
      stocks: 0,
      crypto: 0,
      bonds: 0,
      etfs: 0,
      other: 0
    };
    
    assets.forEach(asset => {
      // Use the most recent transaction price or purchase price
      const latestPrice = asset.transactions[0]?.price || asset.purchasePrice;
      const assetValue = asset.quantity * latestPrice;
      
      totalValue += assetValue;
      
      // Update composition based on asset type
      if (asset.type === 'stock') {
        composition.stocks += assetValue;
      } else if (asset.type === 'crypto') {
        composition.crypto += assetValue;
      } else if (asset.type === 'bond') {
        composition.bonds += assetValue;
      } else if (asset.type === 'etf') {
        composition.etfs += assetValue;
      } else {
        composition.other += assetValue;
      }
    });
    
    // Update portfolio with latest value if needed
    const lastUpdate = portfolio.history.length > 0 
      ? new Date(portfolio.history[0].date) 
      : null;
      
    const now = new Date();
    
    // If no update today, add new history entry
    if (!lastUpdate || 
        lastUpdate.getDate() !== now.getDate() || 
        lastUpdate.getMonth() !== now.getMonth() || 
        lastUpdate.getFullYear() !== now.getFullYear()) {
      
      portfolio.history.unshift({
        date: now,
        totalValue,
        composition
      });
      
      // Limit history to 365 entries
      if (portfolio.history.length > 365) {
        portfolio.history = portfolio.history.slice(0, 365);
      }
      
      await portfolio.save();
    }
    
    // Return portfolio data
    res.json(portfolio);
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/portfolio/history
// @desc    Get portfolio value history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    // Return just the history array for charting
    res.json(portfolio.history);
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/portfolio
// @desc    Update portfolio settings
// @access  Private
router.put('/', auth, async (req, res) => {
  const { name, description } = req.body;
  
  try {
    let portfolio = await Portfolio.findOne({ user: req.user.id });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        user: req.user.id,
        name: name || 'My Portfolio',
        description
      });
    } else {
      if (name) portfolio.name = name;
      if (description !== undefined) portfolio.description = description;
    }
    
    await portfolio.save();
    
    res.json(portfolio);
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;