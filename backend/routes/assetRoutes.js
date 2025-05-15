// server/routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const Asset = require('../models/Asset');
const auth = require('../middleware/auth');
const marketService = require('../services/marketDataService');

// Get all assets for a user
router.get('/', auth, async (req, res) => {
  try {
    const assets = await Asset.find({ user: req.user.id });
    res.json(assets);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Get a single asset by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    
    // Check if the asset belongs to the user
    if (asset.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add a new asset
router.post('/', auth, async (req, res) => {
  const { symbol, name, type, quantity, purchasePrice, purchaseDate, notes, tags } = req.body;
  
  try {
    // Create a new asset object
    const newAsset = new Asset({
      user: req.user.id,
      symbol,
      name,
      type,
      quantity,
      purchasePrice,
      purchaseDate,
      notes,
      tags
    });
    
    // Add initial transaction
    newAsset.transactions.push({
      type: 'buy',
      date: purchaseDate || Date.now(),
      quantity,
      price: purchasePrice
    });
    
    const asset = await newAsset.save();
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Update an asset
router.put('/:id', auth, async (req, res) => {
  const { symbol, name, type, quantity, purchasePrice, purchaseDate, notes, tags } = req.body;
  
  // Build asset object
  const assetFields = {};
  if (symbol) assetFields.symbol = symbol;
  if (name) assetFields.name = name;
  if (type) assetFields.type = type;
  if (quantity) assetFields.quantity = quantity;
  if (purchasePrice) assetFields.purchasePrice = purchasePrice;
  if (purchaseDate) assetFields.purchaseDate = purchaseDate;
  if (notes) assetFields.notes = notes;
  if (tags) assetFields.tags = tags;
  
  try {
    let asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    
    // Check if the asset belongs to the user
    if (asset.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { $set: assetFields },
      { new: true }
    );
    
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete an asset
router.delete('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    
    // Check if the asset belongs to the user
    if (asset.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    await Asset.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Asset removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add a transaction to an asset
router.post('/:id/transaction', auth, async (req, res) => {
  const { type, quantity, price, date } = req.body;
  
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ msg: 'Asset not found' });
    }
    
    // Check if the asset belongs to the user
    if (asset.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Create new transaction
    const newTransaction = {
      type,
      quantity,
      price,
      date: date || Date.now()
    };
    
    // Update asset quantity based on transaction type
    if (type === 'buy') {
      asset.quantity += quantity;
    } else if (type === 'sell') {
      // Check if the user has enough to sell
      if (asset.quantity < quantity) {
        return res.status(400).json({ msg: 'Not enough assets to sell' });
      }
      asset.quantity -= quantity;
    }
    
    // Add new transaction to the beginning of the array
    asset.transactions.unshift(newTransaction);
    
    await asset.save();
    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;