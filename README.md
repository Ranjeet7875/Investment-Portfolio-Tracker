# Investment Portfolio Tracker

A full-stack web application for tracking cryptocurrency investments and portfolio management.

## Features

### Portfolio Management
- Real-time portfolio value tracking
- Asset holdings overview with profit/loss calculations
- Transaction history tracking (buy/sell)
- Portfolio performance visualization with charts
- Asset allocation visualization (pie chart)

### Market Data
- Cryptocurrency market data integration
- Real-time price updates
- Market overview dashboard
- Market news section

### Account Management
- User authentication system
- Profile management
- Customizable account settings
  - Currency preferences
  - Theme settings

### Dashboard Features
- Interactive dashboard with multiple tabs:
  - Overview: Portfolio summary and charts
  - Markets News: Latest cryptocurrency news
  - Market: Real-time market data
  - Settings: Account configuration

### Data Visualization
- Portfolio performance line chart
- Asset allocation pie chart
- Transaction history table
- Holdings summary table

### Transaction Management
- Record buy/sell transactions
- Transaction history tracking
- Detailed transaction information:
  - Date
  - Type (buy/sell)
  - Asset details
  - Quantity
  - Price
  - Total value

## Technical Stack

### Frontend
- React
- Recharts for data visualization
- CSS for styling
- Responsive design

### Backend
- Node.js
- Express
- MongoDB
- JWT authentication

## API Integration
- Real-time cryptocurrency market data
- Market news integration
- User authentication
- Portfolio management endpoints

## Security Features
- JWT-based authentication
- Protected API routes
- Secure user sessions

## Installation and Setup

1. Clone the repository
2. Install dependencies:
```sh
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

3. Set up environment variables
4. Start the development servers:
```sh
# Backend
npm run server

# Frontend
npm run dev
```

## Environment Variables

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```
