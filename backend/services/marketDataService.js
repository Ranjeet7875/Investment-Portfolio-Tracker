// server/services/marketDataService.js
const axios = require('axios');

// This service handles communication with external APIs for market data
// In a production environment, you would replace this with real API calls
// For this example, we'll use demo/mock data

// Cache to store market data and avoid excessive API calls
const cache = {
  prices: {},
  history: {},
  lastUpdated: {}
};

// Clear cache for data older than 5 minutes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

function clearStaleCache() {
  const now = Date.now();
  
  Object.keys(cache.lastUpdated).forEach(key => {
    if (now - cache.lastUpdated[key] > CACHE_TTL) {
      delete cache.prices[key];
      delete cache.history[key];
      delete cache.lastUpdated[key];
    }
  });
}

// Run cache cleanup every minute
setInterval(clearStaleCache, 60000);

// Demo stock symbols
const DEMO_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT'];
// Demo crypto symbols
const DEMO_CRYPTO = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'XRP', 'DOGE', 'SHIB'];

// Demo market indices
const MARKET_INDICES = {
  'S&P 500': { value: 5102.22, change: 0.45 },
  'NASDAQ': { value: 16996.32, change: 0.73 },
  'DOW': { value: 38784.41, change: 0.23 },
  'BTC/USD': { value: 62580.12, change: 1.2 }
};

// Get price for a single symbol
async function getPriceForSymbol(symbol) {
  try {
    // Check cache first
    if (cache.prices[symbol] && 
        cache.lastUpdated[symbol] && 
        Date.now() - cache.lastUpdated[symbol] < CACHE_TTL) {
      return cache.prices[symbol];
    }
    
    // In a real application, you would call an external API here
    // For demonstration, we'll generate a random price

    // For demo purposes, we'll simulate an API call with a short delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let basePrice;
    
    // Set a reasonable base price for common symbols
    if (symbol === 'AAPL') basePrice = 180;
    else if (symbol === 'MSFT') basePrice = 420;
    else if (symbol === 'GOOGL') basePrice = 150;
    else if (symbol === 'AMZN') basePrice = 180;
    else if (symbol === 'META') basePrice = 480;
    else if (symbol === 'TSLA') basePrice = 177;
    else if (symbol === 'BTC') basePrice = 62000;
    else if (symbol === 'ETH') basePrice = 3000;
    else basePrice = 100;
    
    // Add random variation
    const randomVariation = (Math.random() - 0.5) * 0.05; // +/- 2.5%
    const price = basePrice * (1 + randomVariation);
    
    // Store in cache
    cache.prices[symbol] = price;
    cache.lastUpdated[symbol] = Date.now();
    
    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

// Get prices for multiple symbols
async function getPricesForSymbols(symbols) {
  const prices = {};
  
  // Process symbols in parallel
  await Promise.all(
    symbols.map(async (symbol) => {
      prices[symbol] = await getPriceForSymbol(symbol);
    })
  );
  
  return prices;
}

// Get historical data for a symbol
async function getHistoricalData(symbol, range = '1m') {
  try {
    const cacheKey = `${symbol}-${range}`;
    
    // Check cache first
    if (cache.history[cacheKey] && 
        cache.lastUpdated[cacheKey] && 
        Date.now() - cache.lastUpdated[cacheKey] < CACHE_TTL) {
      return cache.history[cacheKey];
    }
    
    // For demo purposes, simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Determine number of data points based on range
    let dataPoints;
    switch(range) {
      case '1d': dataPoints = 24; break;      // Hourly for 1 day
      case '5d': dataPoints = 5 * 8; break;   // 8 points per day for 5 days
      case '1m': dataPoints = 30; break;      // Daily for 1 month
      case '3m': dataPoints = 90; break;      // Daily for 3 months
      case '6m': dataPoints = 180; break;     // Daily for 6 months
      case '1y': dataPoints = 365; break;     // Daily for 1 year
      case '5y': dataPoints = 60; break;      // Monthly for 5 years
      default: dataPoints = 30;               // Default to 1 month
    }
    
    // Get base price for the symbol
    const currentPrice = await getPriceForSymbol(symbol);
    let basePrice = currentPrice || 100;
    
    // Generate historical data with a realistic pattern
    const data = [];
    const now = new Date();
    let trend = Math.random() > 0.5 ? 1 : -1; // Start with random trend
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      // Create date for this data point
      const date = new Date(now);
      
      if (range === '1d') {
        date.setHours(now.getHours() - i);
      } else if (range === '5d') {
        const hoursToSubtract = Math.floor(i / 8) * 24 + (i % 8) * 3;
        date.setHours(now.getHours() - hoursToSubtract);
      } else if (range === '5y') {
        date.setMonth(now.getMonth() - i);
      } else {
        date.setDate(now.getDate() - i);
      }
      
      // Every few points, consider changing the trend
      if (i % 5 === 0) {
        if (Math.random() < 0.3) {
          trend = -trend;
        }
      }
      
      // Generate a price with a slight trend and randomness
      const randomVariation = (Math.random() - 0.5) * 0.03; // +/- 1.5%
      const trendFactor = trend * Math.random() * 0.01; // 0-1% in trend direction
      
      const price = basePrice * (1 + randomVariation + trendFactor);
      basePrice = price; // Use this price as the base for the next point
      
      data.push({
        date: date.toISOString(),
        price
      });
    }
    
    const result = {
      symbol,
      range,
      data
    };
    
    // Store in cache
    cache.history[cacheKey] = result;
    cache.lastUpdated[cacheKey] = Date.now();
    
    return result;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

// Search for assets by keyword
async function searchAssets(query, type) {
  try {
    // In a real application, you would call an external API here
    // For demonstration, we'll return filtered demo data
    
    query = query.toLowerCase().trim();
    
    // Create a list of demo assets based on the symbols
    const stockAssets = DEMO_STOCKS.map(symbol => ({
      symbol,
      name: getCompanyName(symbol),
      type: 'stock'
    }));
    
    const cryptoAssets = DEMO_CRYPTO.map(symbol => ({
      symbol,
      name: getCryptoName(symbol),
      type: 'crypto'
    }));
    
    let assets = [...stockAssets, ...cryptoAssets];
    
    // Filter by type if specified
    if (type) {
      assets = assets.filter(asset => asset.type === type);
    }
    
    // Filter by query
    const results = assets.filter(asset => 
      asset.symbol.toLowerCase().includes(query) || 
      asset.name.toLowerCase().includes(query)
    );
    
    return results;
  } catch (error) {
    console.error(`Error searching assets:`, error);
    return [];
  }
}

// Get market news
async function getMarketNews(symbols, limit = 10) {
  try {
    // In a real application, you would call a news API
    // For demonstration, we'll generate mock news
    
    const news = [
      {
        id: 1,
        title: 'Markets reach all-time high as tech stocks surge',
        source: 'Market Watch',
        url: '#',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        symbols: ['AAPL', 'MSFT', 'GOOGL']
      },
      {
        id: 2,
        title: 'Bitcoin breaks $62,000 as institutional adoption grows',
        source: 'Crypto News',
        url: '#',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        symbols: ['BTC']
      },
      {
        id: 3,
        title: 'Federal Reserve signals potential interest rate cut',
        source: 'Financial Times',
        url: '#',
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: []
      },
      {
        id: 4,
        title: 'Apple announces new product line, shares jump 3%',
        source: 'Tech Insider',
        url: '#',
        publishedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['AAPL']
      },
      {
        id: 5,
        title: 'Ethereum upgrade successful, gas fees drop significantly',
        source: 'Blockchain Report',
        url: '#',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['ETH']
      },
      {
        id: 6,
        title: 'Tesla deliveries exceed analyst expectations',
        source: 'Auto News',
        url: '#',
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['TSLA']
      },
      {
        id: 7,
        title: 'Amazon expands into healthcare sector with new acquisition',
        source: 'Business Daily',
        url: '#',
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['AMZN']
      },
      {
        id: 8,
        title: 'Nvidia reports record quarterly earnings on AI chip demand',
        source: 'Tech Report',
        url: '#',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['NVDA']
      },
      {
        id: 9,
        title: 'Global market volatility increases amid geopolitical tensions',
        source: 'World Economics',
        url: '#',
        publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: []
      },
      {
        id: 10,
        title: 'Meta announces new VR technology advancements',
        source: 'Tech Today',
        url: '#',
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        symbols: ['META']
      }
    ];
    
    // Filter by symbols if provided
    let filtered = news;
    if (symbols) {
      const symbolList = symbols.split(',');
      filtered = news.filter(item => 
        item.symbols.some(s => symbolList.includes(s)) || 
        item.symbols.length === 0
      );
    }
    
    // Return limited results
    return filtered.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching market news:`, error);
    return [];
  }
}

// Get market overview
async function getMarketOverview() {
  try {
    // Get current prices for market indices
    const indices = { ...MARKET_INDICES };
    
    // Add some random variation to the values
    Object.keys(indices).forEach(index => {
      const randomVariation = (Math.random() - 0.5) * 0.01; // +/- 0.5%
      indices[index].value = indices[index].value * (1 + randomVariation);
      indices[index].change = indices[index].change + randomVariation * 100;
    });
    
    // Get top gainers and losers
    const topGainers = await getTopMovers('gainers', 5);
    const topLosers = await getTopMovers('losers', 5);
    
    return {
      indices,
      topGainers,
      topLosers,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching market overview:`, error);
    return null;
  }
}

// Helper function to get top movers (gainers or losers)
async function getTopMovers(type, limit = 5) {
  // Get all symbols
  const allSymbols = [...DEMO_STOCKS, ...DEMO_CRYPTO];
  
  // Generate random data for all symbols
  const movers = await Promise.all(
    allSymbols.map(async (symbol) => {
      const isGainer = Math.random() > 0.4; // 60% chance of being a gainer
      const changePct = isGainer 
        ? Math.random() * 10 + 1 // 1-11% gain
        : -Math.random() * 10 - 1; // 1-11% loss
      
      return {
        symbol,
        name: symbol.length <= 4 ? (DEMO_STOCKS.includes(symbol) ? getCompanyName(symbol) : getCryptoName(symbol)) : symbol,
        price: await getPriceForSymbol(symbol),
        change: changePct
      };
    })
  );
  
  // Sort based on type (gainers or losers)
  const sorted = type === 'gainers'
    ? movers.sort((a, b) => b.change - a.change) // Descending for gainers
    : movers.sort((a, b) => a.change - b.change); // Ascending for losers
  
  return sorted.slice(0, limit);
}

// Helper function to get company name from symbol
function getCompanyName(symbol) {
  const companyNames = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com, Inc.',
    'META': 'Meta Platforms, Inc.',
    'TSLA': 'Tesla, Inc.',
    'NVDA': 'NVIDIA Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'WMT': 'Walmart Inc.'
  };
  
  return companyNames[symbol] || `${symbol} Corp`;
}

// Helper function to get crypto name from symbol
function getCryptoName(symbol) {
  const cryptoNames = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'AVAX': 'Avalanche',
    'MATIC': 'Polygon',
    'XRP': 'Ripple',
    'DOGE': 'Dogecoin',
    'SHIB': 'Shiba Inu'
  };
  
  return cryptoNames[symbol] || `${symbol} Coin`;
}

module.exports = {
  getPriceForSymbol,
  getPricesForSymbols,
  getHistoricalData,
  searchAssets,
  getMarketNews,
  getMarketOverview
};