// server/models/Asset.js
const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['stock', 'crypto', 'bond', 'etf', 'other']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  // For categorizing assets (e.g., tech stocks, blue chips)
  tags: [{
    type: String
  }],
  // Historical transactions for this asset
  transactions: [{
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Asset', AssetSchema);