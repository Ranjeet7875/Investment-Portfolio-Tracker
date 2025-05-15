// server/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const assetRoutes = require('./routes/assetRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const userRoutes = require('./routes/userRoutes');
const marketDataRoutes = require('./routes/marketDataRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ranvishwakarma122:nNjOcMP7oTBVqWVK@cluster0.cbs5t.mongodb.net/portfolio-tracker')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/assets', assetRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/users', userRoutes);
app.use('/api/market', marketDataRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.send('Portfolio Tracker API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});