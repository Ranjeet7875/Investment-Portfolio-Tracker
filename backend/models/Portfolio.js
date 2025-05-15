// server/models/Portfolio.js
const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    default: 'My Portfolio'
  },
  description: {
    type: String
  },
  // Historical portfolio values for performance tracking
  history: [{
    date: {
      type: Date,
      default: Date.now
    },
    totalValue: {
      type: Number,
      required: true
    },
    // Breakdown by asset type for the pie chart
    composition: {
      stocks: {
        type: Number,
        default: 0
      },
      crypto: {
        type: Number,
        default: 0
      },
      bonds: {
        type: Number,
        default: 0
      },
      etfs: {
        type: Number,
        default: 0
      },
      other: {
        type: Number,
        default: 0
      }
    }
  }],
  // Quick lookup for dashboard metrics
  performance: {
    dailyChange: {
      type: Number,
      default: 0
    },
    weeklyChange: {
      type: Number,
      default: 0
    },
    monthlyChange: {
      type: Number,
      default: 0
    },
    yearlyChange: {
      type: Number,
      default: 0
    },
    totalChange: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);