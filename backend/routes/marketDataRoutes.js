// server/routes/marketDataRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const marketService = require('../services/marketDataService');

// Get current price for a symbol
router.get('/price/:symbol', auth, async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const price = await marketService.getPriceForSymbol(symbol);
    
    if (!price) {
      return res.status(404).json({ msg: 'Symbol not found' });
    }
    
    res.json({ symbol, price });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get historical data for a symbol
router.get('/history/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range } = req.query; // range can be 1d, 5d, 1m, 3m, 6m, 1y, 5y
    
    const historicalData = await marketService.getHistoricalData(symbol, range || '1m');
    
    if (!historicalData) {
      return res.status(404).json({ msg: 'Data not found' });
    }
    
    res.json(historicalData);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Search for assets by keyword
router.get('/search', auth, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    const results = await marketService.searchAssets(query, type);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get market news
router.get('/news', auth, async (req, res) => {
  try {
    const { symbols, limit } = req.query;
    
    const news = await marketService.getMarketNews(symbols, limit || 10);
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get market overview
router.get('/overview', auth, async (req, res) => {
  try {
    const overview = await marketService.getMarketOverview();
    res.json(overview);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;