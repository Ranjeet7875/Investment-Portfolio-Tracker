// server/services/marketDataService.js
const axios = require('axios');

// Cache to store market data and reduce API calls
const cache = {
  prices: {},
  historical: {},
  search: {},
  news: [],
  overview: null,
  lastUpdated: {}
};

// Cache TTL in milliseconds
const CACHE_TTL = {
  PRICES: 5 * 60 * 1000, // 5 minutes
  HISTORICAL: 60 * 60 * 1000, // 1 hour
  SEARCH: 24 * 60 * 60 * 1000, // 24 hours
  NEWS: 30 * 60 * 1000, // 30 minutes
  OVERVIEW: 15 * 60 * 1000 // 15 minutes
};

// Helper function to check if cache is valid
const isCacheValid = (type, key = 'default') => {
  if (!cache.lastUpdated[type] || !cache.lastUpdated[type][key]) {
    return false;
  }
  
  const now = Date.now();
  const lastUpdate = cache.lastUpdated[type][key];
  return (now - lastUpdate) < CACHE_TTL[type];
};

// Update cache helper
const updateCache = (type, data, key = 'default') => {
  if (!cache.lastUpdated[type]) {
    cache.lastUpdated[type] = {};
  }
  cache.lastUpdated[type][key] = Date.now();
  return data;
};

// Get current price for a single symbol
const getPriceForSymbol = async (symbol) => {
  try {
    // Check cache first
    if (isCacheValid('PRICES', symbol) && cache.prices[symbol]) {
      return cache.prices[symbol];
    }
    
    // Determine API to use based on symbol format
    // For cryptocurrency (if symbol contains '-' or is known crypto symbol)
    if (symbol.includes('-') || /^(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|XLM)$/i.test(symbol)) {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
      );
      
      if (response.data && response.data[symbol.toLowerCase()]) {
        const price = response.data[symbol.toLowerCase()].usd;
        cache.prices[symbol] = price;
        return updateCache('PRICES', price, symbol);
      }

      // Try alternative lookup for coins by symbol instead of id
      const coinsResponse = await axios.get(
        'https://api.coingecko.com/api/v3/coins/list'
      );
      
      const coin = coinsResponse.data.find(c => 
        c.symbol.toLowerCase() === symbol.toLowerCase()
      );
      
      if (coin) {
        const detailResponse = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd`
        );
        
        if (detailResponse.data && detailResponse.data[coin.id]) {
          const price = detailResponse.data[coin.id].usd;
          cache.prices[symbol] = price;
          return updateCache('PRICES', price, symbol);
        }
      }
    } 
    // For stocks and other assets, use a financial API
    else {
      // Replace with your preferred stock API
      // For example: Alpha Vantage, Yahoo Finance, etc.
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      
      if (response.data && response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
        const price = parseFloat(response.data['Global Quote']['05. price']);
        cache.prices[symbol] = price;
        return updateCache('PRICES', price, symbol);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    // If we got rate limited or API error, return cached value if it exists
    return cache.prices[symbol] || null;
  }
};

// Get prices for multiple symbols at once
const getPricesForSymbols = async (symbols) => {
  try {
    const results = {};
    
    // Group symbols by type to batch API calls
    const cryptoSymbols = [];
    const stockSymbols = [];
    
    symbols.forEach(symbol => {
      if (symbol.includes('-') || /^(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|XLM)$/i.test(symbol)) {
        cryptoSymbols.push(symbol.toLowerCase());
      } else {
        stockSymbols.push(symbol);
      }
    });
    
    // Fetch crypto prices
    if (cryptoSymbols.length > 0) {
      try {
        const cryptoIds = cryptoSymbols.join(',');
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`
        );
        
        if (response.data) {
          for (const symbol of cryptoSymbols) {
            if (response.data[symbol]) {
              results[symbol.toUpperCase()] = response.data[symbol].usd;
              cache.prices[symbol.toUpperCase()] = response.data[symbol].usd;
              updateCache('PRICES', null, symbol.toUpperCase());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching crypto prices:', error);
        // Fallback to individual requests or use cached values
        for (const symbol of cryptoSymbols) {
          const upperSymbol = symbol.toUpperCase();
          if (cache.prices[upperSymbol]) {
            results[upperSymbol] = cache.prices[upperSymbol];
          } else {
            try {
              results[upperSymbol] = await getPriceForSymbol(upperSymbol);
            } catch (e) {
              console.error(`Error getting price for ${upperSymbol}:`, e);
            }
          }
        }
      }
    }
    
    // Fetch stock prices (ideally should be batched but depends on API)
    for (const symbol of stockSymbols) {
      if (isCacheValid('PRICES', symbol) && cache.prices[symbol]) {
        results[symbol] = cache.prices[symbol];
      } else {
        try {
          const price = await getPriceForSymbol(symbol);
          if (price) {
            results[symbol] = price;
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          if (cache.prices[symbol]) {
            results[symbol] = cache.prices[symbol];
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in getPricesForSymbols:', error);
    return {};
  }
};

// Get historical data for a symbol
const getHistoricalData = async (symbol, range = '1m') => {
  try {
    const cacheKey = `${symbol}-${range}`;
    
    // Check cache first
    if (isCacheValid('HISTORICAL', cacheKey) && cache.historical[cacheKey]) {
      return cache.historical[cacheKey];
    }
    
    let data = [];
    
    // Handle different time ranges
    const days = {
      '1d': 1,
      '5d': 5,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      '5y': 1825
    };
    
    const daysCount = days[range] || 30;
    
    // For cryptocurrency
    if (symbol.includes('-') || /^(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|XLM)$/i.test(symbol)) {
      // Try to find the crypto ID first
      let coinId = symbol.toLowerCase();
      
      // If using symbol instead of ID, find the correct ID
      if (!symbol.includes('-')) {
        try {
          const coinsResponse = await axios.get('https://api.coingecko.com/api/v3/coins/list');
          const coin = coinsResponse.data.find(c => 
            c.symbol.toLowerCase() === symbol.toLowerCase()
          );
          
          if (coin) {
            coinId = coin.id;
          }
        } catch (error) {
          console.error('Error finding coin ID:', error);
        }
      }
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${daysCount}`
      );
      
      if (response.data && response.data.prices) {
        // Format the data
        data = response.data.prices.map(item => ({
          date: new Date(item[0]),
          price: item[1]
        }));
      }
    } 
    // For stocks and other assets
    else {
      // Replace with your preferred stock API for historical data
      // For example: Alpha Vantage, Yahoo Finance, etc.
      let interval = 'daily';
      if (daysCount <= 5) interval = '60min';
      
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_${interval.toUpperCase()}&symbol=${symbol}&outputsize=full&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      );
      
      const timeSeriesKey = `Time Series (${interval === 'daily' ? 'Daily' : '60min'})`;
      
      if (response.data && response.data[timeSeriesKey]) {
        const timeSeries = response.data[timeSeriesKey];
        
        // Convert to array and limit by days
        data = Object.entries(timeSeries)
          .map(([date, values]) => ({
            date: new Date(date),
            price: parseFloat(values['4. close'])
          }))
          .sort((a, b) => a.date - b.date)
          .slice(-daysCount);
      }
    }
    
    // Cache the result
    cache.historical[cacheKey] = data;
    updateCache('HISTORICAL', null, cacheKey);
    
    return data;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return cache.historical[`${symbol}-${range}`] || [];
  }
};

// Search for assets
const searchAssets = async (query, type = null) => {
  try {
    const cacheKey = `${query}-${type || 'all'}`;
    
    // Check cache first
    if (isCacheValid('SEARCH', cacheKey) && cache.search[cacheKey]) {
      return cache.search[cacheKey];
    }
    
    let results = [];
    
    // Search for cryptocurrencies
    if (!type || type === 'crypto') {
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/search?query=${query}`
        );
        
        if (response.data && response.data.coins) {
          const cryptoResults = response.data.coins.slice(0, 10).map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            type: 'crypto',
            image: coin.large,
            id: coin.id
          }));
          
          results = [...results, ...cryptoResults];
        }
      } catch (error) {
        console.error('Error searching for cryptocurrencies:', error);
      }
    }
    
    // Search for stocks and other assets
    if (!type || type === 'stock' || type === 'etf') {
      try {
        // Replace with your preferred stock search API
        // For example: Alpha Vantage, Yahoo Finance, etc.
        const response = await axios.get(
          `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${query}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
        );
        
        if (response.data && response.data.bestMatches) {
          const stockResults = response.data.bestMatches.map(match => ({
            symbol: match['1. symbol'],
            name: match['2. name'],
            type: match['3. type'].toLowerCase() === 'etf' ? 'etf' : 'stock',
            region: match['4. region']
          }));
          
          results = [...results, ...stockResults];
        }
      } catch (error) {
        console.error('Error searching for stocks:', error);
      }
    }
    
    // Cache the results
    cache.search[cacheKey] = results;
    updateCache('SEARCH', null, cacheKey);
    
    return results;
  } catch (error) {
    console.error('Error in searchAssets:', error);
    return cache.search[`${query}-${type || 'all'}`] || [];
  }
};

// Get market news
const getMarketNews = async (symbols = null, limit = 10) => {
  try {
    // If no symbols provided, return general market news
    if (!symbols && isCacheValid('NEWS') && cache.news.length > 0) {
      return cache.news.slice(0, limit);
    }
    
    // Replace with your preferred financial news API
    // For example: Alpha Vantage News API, Yahoo Finance, etc.
    let newsUrl = 'https://newsapi.org/v2/top-headlines?category=business&language=en';
    
    if (symbols) {
      newsUrl = `https://newsapi.org/v2/everything?q=${symbols}&language=en&sortBy=publishedAt`;
    }
    
    const response = await axios.get(newsUrl, {
      headers: {
        'X-Api-Key': process.env.NEWS_API_KEY
      }
    });
    
    if (response.data && response.data.articles) {
      const news = response.data.articles.slice(0, limit).map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        image: article.urlToImage
      }));
      
      if (!symbols) {
        cache.news = news;
        updateCache('NEWS');
      }
      
      return news;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching market news:', error);
    return cache.news.slice(0, limit) || [];
  }
};

// Get market overview (indices, trending assets, etc.)
const getMarketOverview = async () => {
  try {
    // Check cache first
    if (isCacheValid('OVERVIEW') && cache.overview) {
      return cache.overview;
    }
    
    // Prepare response object
    const overview = {
      indices: [],
      trending: [],
      marketCap: {},
      timestamp: Date.now()
    };
    
    // Get major indices
    try {
      // Replace with your preferred API for indices
      // This is a placeholder for now
      overview.indices = [
        { symbol: 'SPY', name: 'S&P 500', price: 0, change: 0 },
        { symbol: 'DIA', name: 'Dow Jones', price: 0, change: 0 },
        { symbol: 'QQQ', name: 'NASDAQ', price: 0, change: 0 }
      ];
      
      // Get actual index values
      for (let i = 0; i < overview.indices.length; i++) {
        const price = await getPriceForSymbol(overview.indices[i].symbol);
        if (price) {
          overview.indices[i].price = price;
        }
      }
    } catch (error) {
      console.error('Error fetching indices:', error);
    }
    
    // Get trending cryptocurrencies
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1m'
      );
      
      if (response.data) {
        // Extract top cryptocurrencies
        overview.trending = response.data.slice(0, 10).map(coin => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change: coin.price_change_percentage_24h,
          marketCap: coin.market_cap,
          volume: coin.total_volume,
          image: coin.image,
          type: 'crypto'
        }));
        
        // Calculate market cap distribution
        overview.marketCap.totalCrypto = response.data.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
      }
    } catch (error) {
      console.error('Error fetching trending cryptocurrencies:', error);
    }
    
    // Cache the result
    cache.overview = overview;
    updateCache('OVERVIEW');
    
    return overview;
  } catch (error) {
    console.error('Error in getMarketOverview:', error);
    return cache.overview || { indices: [], trending: [], marketCap: {}, timestamp: Date.now() };
  }
};

module.exports = {
  getPriceForSymbol,
  getPricesForSymbols,
  getHistoricalData,
  searchAssets,
  getMarketNews,
  getMarketOverview
};