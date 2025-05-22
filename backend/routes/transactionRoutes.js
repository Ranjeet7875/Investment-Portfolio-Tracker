// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const Portfolio = require('../models/Portfolio');
const auth = require('../middleware/auth');

// @route   POST api/portfolio/transactions
// @desc    Add a new transaction and update asset
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { coinId, symbol, name, type, amount, price, totalValue, date } = req.body;
    
    if (!symbol || !type || !amount || !price) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }
    
    // Find if asset already exists for this user
    let asset = await Asset.findOne({ 
      user: req.user.id,
      symbol: symbol.toLowerCase()
    });
    
    // If no asset exists, create a new one
    if (!asset) {
      asset = new Asset({
        user: req.user.id,
        symbol: symbol.toLowerCase(),
        name: name || symbol.toUpperCase(),
        type: 'crypto', // Assuming this is for crypto; adjust as needed
        quantity: type === 'buy' ? parseFloat(amount) : 0,
        purchasePrice: price,
        purchaseDate: date || Date.now()
      });
    } else {
      // Update existing asset quantity
      if (type === 'buy') {
        asset.quantity += parseFloat(amount);
      } else if (type === 'sell') {
        // Ensure user has enough to sell
        if (asset.quantity < parseFloat(amount)) {
          return res.status(400).json({ msg: 'Insufficient balance for this transaction' });
        }
        asset.quantity -= parseFloat(amount);
      }
    }
    
    // Add transaction to asset's transaction history
    const transaction = {
      type,
      quantity: parseFloat(amount),
      price: parseFloat(price),
      date: date ? new Date(date) : new Date(),
      total: totalValue || (parseFloat(amount) * parseFloat(price))
    };
    
    asset.transactions.unshift(transaction);
    
    await asset.save();
    
    // Update portfolio history after transaction
    await updatePortfolioHistory(req.user.id);
    
    res.json({
      success: true,
      asset,
      transaction: asset.transactions[0]
    });
    
  } catch (err) {
    console.error('Transaction error:', err.message);
    res.status(500).json({ 
      msg: 'Server Error',
      error: err.message 
    });
  }
});

// @route   GET api/portfolio/transactions
// @desc    Get all user transactions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Find all assets for this user
    const assets = await Asset.find({ user: req.user.id });
    
    // Extract all transactions from all assets
    let allTransactions = [];
    
    assets.forEach(asset => {
      const assetTransactions = asset.transactions.map(transaction => ({
        ...transaction.toObject(),
        symbol: asset.symbol,
        name: asset.name,
        assetId: asset._id
      }));
      
      allTransactions = [...allTransactions, ...assetTransactions];
    });
    
    // Sort transactions by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(allTransactions);
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/portfolio/holdings/:symbol
// @desc    Get user's holdings for a specific asset
// @access  Private
router.get('/holdings/:symbol', auth, async (req, res) => {
  try {
    const symbol = req.params.symbol.toLowerCase();
    
    const asset = await Asset.findOne({
      user: req.user.id,
      symbol
    });
    
    if (!asset) {
      return res.json({ amount: 0 });
    }
    
    res.json({
      amount: asset.quantity,
      asset
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/portfolio/transactions/:assetId/:transactionId
// @desc    Delete a transaction and update asset quantity
// @access  Private
router.delete('/:assetId/:transactionId', auth, async (req, res) => {
  try {
    const { assetId, transactionId } = req.params;
    
    // Find the asset
    const asset = await Asset.findById(assetId);
    
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    
    // Check ownership
    if (asset.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Find the transaction
    const transactionIndex = asset.transactions.findIndex(
      t => t._id.toString() === transactionId
    );
    
    if (transactionIndex === -1) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    
    const transaction = asset.transactions[transactionIndex];
    
    // Adjust asset quantity based on removed transaction
    if (transaction.type === 'buy') {
      asset.quantity -= transaction.quantity;
      if (asset.quantity < 0) asset.quantity = 0;
    } else if (transaction.type === 'sell') {
      asset.quantity += transaction.quantity;
    }
    
    // Remove the transaction
    asset.transactions.splice(transactionIndex, 1);
    
    // If no transactions left, remove the asset, else save it
    if (asset.transactions.length === 0) {
      await Asset.findByIdAndRemove(assetId);
    } else {
      await asset.save();
    }
    
    // Update portfolio history
    await updatePortfolioHistory(req.user.id);
    
    res.json({ msg: 'Transaction removed', assetId, transactionId });
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Helper function to update portfolio history after transactions
async function updatePortfolioHistory(userId) {
  try {
    // Get all user assets
    const assets = await Asset.find({ user: userId });
    
    // Calculate total portfolio value
    let totalValue = 0;
    const composition = {
      stocks: 0,
      crypto: 0,
      bonds: 0,
      etfs: 0,
      other: 0
    };
    
    for (const asset of assets) {
      // Get latest price (use purchase price as fallback)
      const latestPrice = asset.transactions[0]?.price || asset.purchasePrice;
      const assetValue = asset.quantity * latestPrice;
      
      // Update total value
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
    }
    
    // Find or create user portfolio
    let portfolio = await Portfolio.findOne({ user: userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        user: userId,
        name: 'My Portfolio'
      });
    }
    
    // Add new history entry
    portfolio.history.push({
      date: new Date(),
      totalValue,
      composition
    });
    
    // Update performance metrics if there's enough history
    if (portfolio.history.length > 1) {
      const currentValue = totalValue;
      const historyLength = portfolio.history.length;
      
      // Get historical values
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // Find closest historical values
      const dayValue = findClosestHistoricalValue(portfolio.history, oneDayAgo);
      const weekValue = findClosestHistoricalValue(portfolio.history, oneWeekAgo);
      const monthValue = findClosestHistoricalValue(portfolio.history, oneMonthAgo);
      const yearValue = findClosestHistoricalValue(portfolio.history, oneYearAgo);
      const initialValue = portfolio.history[historyLength - 1].totalValue;
      
      // Calculate performance metrics (as percentages)
      if (dayValue > 0) {
        portfolio.performance.dailyChange = ((currentValue - dayValue) / dayValue) * 100;
      }
      
      if (weekValue > 0) {
        portfolio.performance.weeklyChange = ((currentValue - weekValue) / weekValue) * 100;
      }
      
      if (monthValue > 0) {
        portfolio.performance.monthlyChange = ((currentValue - monthValue) / monthValue) * 100;
      }
      
      if (yearValue > 0) {
        portfolio.performance.yearlyChange = ((currentValue - yearValue) / yearValue) * 100;
      }
      
      if (initialValue > 0) {
        portfolio.performance.totalChange = ((currentValue - initialValue) / initialValue) * 100;
      }
    }
    
    // Limit history to 365 entries
    if (portfolio.history.length > 365) {
      portfolio.history = portfolio.history.slice(0, 365);
    }
    
    await portfolio.save();
    
  } catch (err) {
    console.error('Error updating portfolio history:', err);
  }
}

// Helper to find closest historical value to a date
function findClosestHistoricalValue(history, targetDate) {
  // If no history, return 0
  if (!history || history.length === 0) return 0;
  
  // If only one entry, use that
  if (history.length === 1) return history[0].totalValue;
  
  // Find closest entry by date
  let closestEntry = history[0];
  let smallestDiff = Math.abs(new Date(history[0].date) - targetDate);
  
  for (let i = 1; i < history.length; i++) {
    const diff = Math.abs(new Date(history[i].date) - targetDate);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestEntry = history[i];
    }
  }
  
  return closestEntry.totalValue;
}

module.exports = router;