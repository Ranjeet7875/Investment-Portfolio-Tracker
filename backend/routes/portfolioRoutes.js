// server/routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');
const marketService = require('../services/marketDataService');

// Get user's portfolio
router.get('/', auth, async (req, res) => {
  try {
    let portfolio = await Portfolio.findOne({ user: req.user.id });
    
    // If no portfolio exists, create one
    if (!portfolio) {
      portfolio = new Portfolio({
        user: req.user.id,
        name: 'My Portfolio',
        description: 'My investment portfolio'
      });
      
      await portfolio.save();
    }
    
    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update portfolio details
router.put('/', auth, async (req, res) => {
  const { name, description } = req.body;
  
  try {
    let portfolio = await Portfolio.findOne({ user: req.user.id });
    
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    // Update fields
    if (name) portfolio.name = name;
    if (description) portfolio.description = description;
    
    await portfolio.save();
    res.json(portfolio);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get portfolio performance data
router.get('/performance', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    if (!portfolio) {
      return res.status(404).json({ msg: 'Portfolio not found' });
    }
    
    // Get all assets for this user
    const assets = await Asset.find({ user: req.user.id });
    
    // Get current market prices for all assets
    const symbols = assets.map(asset => asset.symbol);
    const currentPrices = await marketService.getPricesForSymbols(symbols);
    
    // Calculate current portfolio value and other metrics
    let totalValue = 0;
    let totalCost = 0;
    let composition = {
      stocks: 0,
      crypto: 0,
      bonds: 0,
      etfs: 0,
      other: 0
    };
    
    // Calculate asset values and portfolio composition
    assets.forEach(asset => {
      const currentPrice = currentPrices[asset.symbol] || asset.purchasePrice;
      const assetValue = asset.quantity * currentPrice;
      const assetCost = asset.quantity * asset.purchasePrice;
      
      totalValue += assetValue;
      totalCost += assetCost;
      
      // Update composition
      switch(asset.type) {
        case 'stock':
          composition.stocks += assetValue;
          break;
        case 'crypto':
          composition.crypto += assetValue;
          break;
        case 'bond':
          composition.bonds += assetValue;
          break;
        case 'etf':
          composition.etfs += assetValue;
          break;
        default:
          composition.other += assetValue;
      }
    });
    
    // Calculate performance
    const totalChange = totalValue - totalCost;
    const totalChangePercent = totalCost > 0 ? (totalChange / totalCost) * 100 : 0;
    
    // Add new history point
    portfolio.history.push({
      date: Date.now(),
      totalValue,
      composition
    });
    
    // Limit history to last 365 data points
    if (portfolio.history.length > 365) {
      portfolio.history = portfolio.history.slice(-365);
    }
    
    // Update performance metrics
    portfolio.performance = {
      dailyChange: calculatePerformanceChange(portfolio.history, 1),
      weeklyChange: calculatePerformanceChange(portfolio.history, 7),
      monthlyChange: calculatePerformanceChange(portfolio.history, 30),
      yearlyChange: calculatePerformanceChange(portfolio.history, 365),
      totalChange: totalChangePercent
    };
    
    await portfolio.save();
    
    res.json({
      totalValue,
      totalCost,
      totalChange,
      totalChangePercent,
      composition,
      performance: portfolio.performance,
      history: portfolio.history
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Helper function to calculate performance change over days
function calculatePerformanceChange(history, days) {
  if (history.length < 2) return 0;
  
  const today = history[history.length - 1];
  
  // Find closest data point to 'days' ago
  let index = history.length - 2;
  while (index >= 0) {
    const daysDiff = (today.date - history[index].date) / (1000 * 60 * 60 * 24);
    if (daysDiff >= days) break;
    index--;
  }
  
  // If we don't have enough history
  if (index < 0) return 0;
  
  const past = history[index];
  
  // Calculate percentage change
  return past.totalValue > 0 
    ? ((today.totalValue - past.totalValue) / past.totalValue) * 100
    : 0;
}

module.exports = router;