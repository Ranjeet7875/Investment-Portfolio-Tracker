import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Style/CryptoMarketData.css';

const CryptoMarketData = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap', direction: 'descending' });
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7'); // Default 7 days

  // Sample data to use when API fails
  const mockCryptoData = [
    {
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      price: 61245.32,
      change: 2.35,
      marketCap: 1198432543210,
      volume: 32543765432,
      image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    },
    {
      id: "ethereum",
      symbol: "ETH",
      name: "Ethereum",
      price: 3245.87,
      change: -0.75,
      marketCap: 389765432100,
      volume: 15432876543,
      image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    },
    {
      id: "binancecoin",
      symbol: "BNB",
      name: "Binance Coin",
      price: 543.21,
      change: 1.23,
      marketCap: 84321567890,
      volume: 3216754321,
      image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    },
    {
      id: "cardano",
      symbol: "ADA",
      name: "Cardano",
      price: 0.65,
      change: -1.45,
      marketCap: 23456789012,
      volume: 1234567890,
      image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    },
    {
      id: "solana",
      symbol: "SOL",
      name: "Solana",
      price: 128.76,
      change: 4.32,
      marketCap: 54321678901,
      volume: 6543217890,
      image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    },
    {
      id: "ripple",
      symbol: "XRP",
      name: "XRP",
      price: 0.75,
      change: 0.34,
      marketCap: 39876543210,
      volume: 2345678901,
      image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    },
    {
      id: "dogecoin",
      symbol: "DOGE",
      name: "Dogecoin",
      price: 0.12,
      change: 7.68,
      marketCap: 16789012345,
      volume: 5432109876,
      image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    },
    {
      id: "polkadot",
      symbol: "DOT",
      name: "Polkadot",
      price: 9.87,
      change: -2.34,
      marketCap: 11234567890,
      volume: 876543210,
      image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    },
    {
      id: "uniswap",
      symbol: "UNI",
      name: "Uniswap",
      price: 7.65,
      change: 1.98,
      marketCap: 7654321098,
      volume: 543210987,
      image: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    },
    {
      id: "chainlink",
      symbol: "LINK",
      name: "Chainlink",
      price: 14.32,
      change: 3.21,
      marketCap: 8901234567,
      volume: 765432109,
      image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    }
  ];

  // Mock historical data generator function
  const generateMockHistoricalData = (coin, days) => {
    const result = [];
    const now = new Date();
    const basePrice = coin.price;
    const volatility = coin.price * 0.05; // 5% volatility
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate a random price movement with some trend
      const randomFactor = Math.random() * 2 - 1; // -1 to 1
      const priceMovement = randomFactor * volatility;
      const trend = (days - i) / days * (coin.change > 0 ? 1 : -1) * volatility * 2;
      
      const price = basePrice + priceMovement + trend;
      
      result.push({
        date: date.toLocaleDateString(),
        price: Math.max(0.01, price) // Ensure price doesn't go below 0.01
      });
    }
    
    return result;
  };

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        setLoading(true);
        
        // Try to use the local API first
        try {
          const response = await fetch('http://localhost:5000/api/market/overview', {
            headers: {
              'x-auth-token': localStorage.getItem('token') || ''
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.trending && data.trending.length > 0) {
              setCryptoData(data.trending);
              setError('');
              return;
            }
          }
        } catch (localError) {
          console.log('Local API error:', localError);
        }
        
        // If local API fails, try CoinGecko directly
        try {
          const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h',
            { mode: 'cors' }
          );
          
          if (response.ok) {
            const data = await response.json();
            const formattedData = data.map(coin => ({
              id: coin.id,
              symbol: coin.symbol.toUpperCase(),
              name: coin.name,
              price: coin.current_price,
              change: coin.price_change_percentage_24h,
              marketCap: coin.market_cap,
              volume: coin.total_volume,
              image: coin.image
            }));
            
            setCryptoData(formattedData);
            setError('');
            return;
          }
        } catch (coingeckoError) {
          console.log('CoinGecko API error:', coingeckoError);
        }
        
        // If both APIs fail, use mock data
        console.log('Using mock data as fallback');
        setCryptoData(mockCryptoData);
        setError('Unable to connect to live data. Showing sample data.');
        
      } catch (err) {
        console.error('Error fetching crypto data:', err);
        setError('Failed to load cryptocurrency data. Showing sample data.');
        setCryptoData(mockCryptoData);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptoData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchCryptoData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch historical data when a coin is selected
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!selectedCoin) return;
      
      try {
        setHistoryLoading(true);
        const coinId = selectedCoin.id;
        
        try {
          // Try to use CoinGecko API to fetch historical data
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${timeRange}`,
            { mode: 'cors' }
          );

          if (response.ok) {
            const data = await response.json();
            
            // Transform the data for the chart
            const formattedData = data.prices.map(([timestamp, price]) => ({
              date: new Date(timestamp).toLocaleDateString(),
              price: price
            }));
            
            setHistoricalData(formattedData);
            return;
          }
        } catch (apiError) {
          console.log('Historical data API error:', apiError);
        }
        
        // If API fails, generate mock historical data
        const mockData = generateMockHistoricalData(selectedCoin, parseInt(timeRange));
        setHistoricalData(mockData);
        setError('Using sample historical data due to API limitations.');
        
      } catch (err) {
        console.error('Error fetching historical data:', err);
        const mockData = generateMockHistoricalData(selectedCoin, parseInt(timeRange));
        setHistoricalData(mockData);
        setError('Failed to load historical data. Using sample data.');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistoricalData();
  }, [selectedCoin, timeRange]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatNumber = (num, digits = 2) => {
    if (num === undefined || num === null) return 'N/A';
    
    // For very small numbers, show more decimal places
    if (Math.abs(num) < 0.01 && num !== 0) {
      return num.toFixed(6);
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(num);
  };

  const formatCurrency = (num) => {
    if (num === undefined || num === null) return 'N/A';
    
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    }
    
    return `$${formatNumber(num)}`;
  };

  const sortedData = React.useMemo(() => {
    if (!cryptoData || cryptoData.length === 0) return [];
    
    // Create a copy for sorting
    let sortableItems = [...cryptoData];
    
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Handle different property names between our API and direct CoinGecko
        let aValue, bValue;
        
        if (sortConfig.key === 'market_cap' || sortConfig.key === 'marketCap') {
          aValue = a.marketCap || a.market_cap || 0;
          bValue = b.marketCap || b.market_cap || 0;
        } else if (sortConfig.key === 'price_change_percentage_24h' || sortConfig.key === 'change') {
          aValue = a.change || a.price_change_percentage_24h || 0;
          bValue = b.change || b.price_change_percentage_24h || 0;
        } else if (sortConfig.key === 'current_price' || sortConfig.key === 'price') {
          aValue = a.price || a.current_price || 0;
          bValue = b.price || b.current_price || 0;
        } else if (sortConfig.key === 'total_volume' || sortConfig.key === 'volume') {
          aValue = a.volume || a.total_volume || 0;
          bValue = b.volume || b.total_volume || 0;
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortableItems;
  }, [cryptoData, sortConfig]);

  const handleCoinClick = (coin) => {
    setSelectedCoin(coin);
  };

  const handleBackClick = () => {
    setSelectedCoin(null);
  };

  if (loading) {
    return <div className="loading">Loading cryptocurrency data...</div>;
  }

  // Render the detailed view for a selected coin
  if (selectedCoin) {
    return (
      <div className="crypto-detail-container">
        <div className="detail-header">
          <button className="back-button" onClick={handleBackClick}>← Back to List</button>
          <div className="coin-title">
            {selectedCoin.image && <img src={selectedCoin.image} alt={selectedCoin.name} className="coin-icon-large" />}
            <h2>{selectedCoin.name} ({selectedCoin.symbol})</h2>
          </div>
        </div>

        <div className="coin-price-info">
          <div className="price-block">
            <span className="label">Current Price:</span>
            <span className="value">${formatNumber(selectedCoin.price || selectedCoin.current_price)}</span>
          </div>
          <div className="price-block">
            <span className="label">24h Change:</span>
            <span className={`value ${(selectedCoin.change || selectedCoin.price_change_percentage_24h) >= 0 ? 'positive-change' : 'negative-change'}`}>
              {formatNumber(selectedCoin.change || selectedCoin.price_change_percentage_24h)}%
            </span>
          </div>
          <div className="price-block">
            <span className="label">Market Cap:</span>
            <span className="value">{formatCurrency(selectedCoin.marketCap || selectedCoin.market_cap)}</span>
          </div>
          <div className="price-block">
            <span className="label">24h Volume:</span>
            <span className="value">{formatCurrency(selectedCoin.volume || selectedCoin.total_volume)}</span>
          </div>
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>Price History</h3>
            <div className="time-range-selector">
              <button 
                className={timeRange === '1' ? 'active' : ''} 
                onClick={() => setTimeRange('1')}
              >
                24h
              </button>
              <button 
                className={timeRange === '7' ? 'active' : ''} 
                onClick={() => setTimeRange('7')}
              >
                7d
              </button>
              <button 
                className={timeRange === '30' ? 'active' : ''} 
                onClick={() => setTimeRange('30')}
              >
                30d
              </button>
              <button 
                className={timeRange === '90' ? 'active' : ''} 
                onClick={() => setTimeRange('90')}
              >
                90d
              </button>
              <button 
                className={timeRange === '365' ? 'active' : ''} 
                onClick={() => setTimeRange('365')}
              >
                1y
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="loading">Loading price history...</div>
          ) : historicalData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    if (timeRange === '1') return new Date(value).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    return value;
                  }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${formatNumber(value)}`}
                />
                <Tooltip 
                  formatter={(value) => [`$${formatNumber(value)}`, 'Price']}
                  labelFormatter={(value) => `Date: ${value}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8884d8" 
                  name="Price (USD)" 
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No historical data available</div>
          )}
        </div>

        <div className="market-stats">
          <h3>Market Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Market Cap Rank</span>
              <span className="stat-value">#{selectedCoin.market_cap_rank || 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">All-Time High</span>
              <span className="stat-value">${formatNumber(selectedCoin.ath || 'N/A')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">All-Time Low</span>
              <span className="stat-value">${formatNumber(selectedCoin.atl || 'N/A')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Circulating Supply</span>
              <span className="stat-value">{formatNumber(selectedCoin.circulating_supply || 'N/A', 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the main list view
  return (
    <div className="crypto-market-container">
      <h2>Cryptocurrency Market</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {sortedData.length > 0 ? (
        <div className="crypto-table">
          <div className="table-header">
            <div className="table-cell" onClick={() => handleSort('name')}>
              Coin {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </div>
            <div className="table-cell text-right" onClick={() => handleSort('price')}>
              Price {sortConfig.key === 'price' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </div>
            <div className="table-cell text-right" onClick={() => handleSort('change')}>
              24h Change {sortConfig.key === 'change' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </div>
            <div className="table-cell text-right" onClick={() => handleSort('marketCap')}>
              Market Cap {sortConfig.key === 'marketCap' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </div>
            <div className="table-cell text-right" onClick={() => handleSort('volume')}>
              Volume (24h) {sortConfig.key === 'volume' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </div>
          </div>
          
          {sortedData.map((coin) => (
            <div 
              className="table-row clickable" 
              key={coin.id || coin.symbol}
              onClick={() => handleCoinClick(coin)}
            >
              <div className="table-cell coin-cell">
                {coin.image && <img src={coin.image} alt={coin.name} className="coin-icon" />}
                <div className="coin-info">
                  <div className="coin-name">{coin.name}</div>
                  <div className="coin-symbol">{coin.symbol}</div>
                </div>
              </div>
              <div className="table-cell text-right">${formatNumber(coin.price || coin.current_price)}</div>
              <div className={`table-cell text-right ${(coin.change || coin.price_change_percentage_24h) >= 0 ? 'positive-change' : 'negative-change'}`}>
                {formatNumber(coin.change || coin.price_change_percentage_24h)}%
              </div>
              <div className="table-cell text-right">{formatCurrency(coin.marketCap || coin.market_cap)}</div>
              <div className="table-cell text-right">{formatCurrency(coin.volume || coin.total_volume)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No cryptocurrency data available</p>
        </div>
      )}
      
      <div className="data-source">
        <p>Data provided by CoinGecko API</p>
        {error && <p className="data-note">Note: Currently displaying sample data due to API connection issues</p>}
      </div>
    </div>
  );
};

export default CryptoMarketData;