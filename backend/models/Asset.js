// server/models/Asset.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['buy', 'sell', 'transfer_in', 'transfer_out', 'staking_reward'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  total: {
    type: Number
  },
  notes: {
    type: String
  }
});

const AssetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['stock', 'etf', 'crypto', 'bond', 'forex', 'commodity', 'other'],
    default: 'other'
  },
  quantity: {
    type: Number,
    default: 0
  },
  purchasePrice: {
    type: Number
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  tags: [String],
  transactions: [TransactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
AssetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Asset', AssetSchema);