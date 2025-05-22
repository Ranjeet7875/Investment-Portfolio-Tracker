import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CryptoMarketData from '../components/CryptoMarketData';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./Style/Dashboard.css";

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioData, setPortfolioData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const navigate = useNavigate();

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // Helper for API calls
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-auth-token': token
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
      }

      return response;
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
      return null;
    }
  }, [navigate]);

  // Formatting helpers
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format((value || 0) / 100);
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Mock current prices for demonstration
  const getCurrentPrice = (symbol) => {
    const mockPrices = {
      'BTC': 42000,
      'ETH': 2300,
      'SOL': 110,
      'ADA': 0.45,
      'DOT': 7.50,
      'LINK': 15.20,
      'MATIC': 0.85,
      'AVAX': 35.50
    };
    return mockPrices[symbol] || 100;
  };

  // Calculate holdings from transactions
  const calculateHoldingsFromTransactions = useCallback(() => {
    if (!transactions || transactions.length === 0) return [];

    const holdingsMap = new Map();

    // Process transactions to calculate holdings
    transactions.forEach(transaction => {
      const { symbol, name, type, quantity, price } = transaction;
      
      if (!holdingsMap.has(symbol)) {
        holdingsMap.set(symbol, {
          symbol,
          name,
          totalQuantity: 0,
          totalCost: 0,
          transactions: []
        });
      }

      const holding = holdingsMap.get(symbol);
      holding.transactions.push(transaction);

      if (type === 'buy') {
        holding.totalQuantity += quantity;
        holding.totalCost += quantity * price;
      } else if (type === 'sell') {
        holding.totalQuantity -= quantity;
        holding.totalCost -= quantity * (holding.totalCost / (holding.totalQuantity + quantity));
      }
    });

    // Convert to holdings array with calculations
    const holdingsArray = Array.from(holdingsMap.values())
      .filter(holding => holding.totalQuantity > 0) // Only show holdings with positive quantity
      .map(holding => {
        const currentPrice = getCurrentPrice(holding.symbol);
        const averagePrice = holding.totalCost / holding.totalQuantity;
        const currentValue = holding.totalQuantity * currentPrice;
        const profitLoss = currentValue - holding.totalCost;
        const profitLossPercentage = (profitLoss / holding.totalCost) * 100;

        return {
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.totalQuantity,
          averagePrice,
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPercentage
        };
      });

    return holdingsArray;
  }, [transactions]);

  // Calculate portfolio metrics
  const calculatePortfolioMetrics = useCallback(() => {
    const calculatedHoldings = calculateHoldingsFromTransactions();
    
    const totalValue = calculatedHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
    const totalCost = calculatedHoldings.reduce((sum, holding) => sum + (holding.quantity * holding.averagePrice), 0);
    const totalProfitLoss = totalValue - totalCost;
    const dailyChange = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      dailyChange,
      totalProfitLoss,
      totalAssets: calculatedHoldings.length,
      holdings: calculatedHoldings
    };
  }, [calculateHoldingsFromTransactions]);

  // Generate mock historical data for demonstration
  const generateMockHistoricalData = useCallback((currentValue = 30000) => {
    const data = [];
    const now = new Date();
    let baseValue = currentValue * 0.8; // Start 20% lower than current
    
    // Generate 30 days of data leading up to current value
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Gradually increase towards current value with some fluctuation
      const targetValue = currentValue;
      const progress = (30 - i) / 30;
      const trendValue = baseValue + (targetValue - baseValue) * progress;
      
      // Add some realistic fluctuation (±5%)
      const fluctuation = (Math.random() - 0.5) * trendValue * 0.1;
      const finalValue = Math.max(trendValue + fluctuation, baseValue * 0.5);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(finalValue * 100) / 100 // Round to 2 decimal places
      });
    }
    
    // Ensure the last value matches current portfolio value
    if (data.length > 0) {
      data[data.length - 1].value = currentValue;
    }
    
    return data;
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetchWithAuth('http://localhost:5000/api/users/me');
        if (!response || !response.ok) {
          throw new Error(response ? 'Failed to fetch user data' : 'Network error');
        }

        const userData = await response.json();
        setUser(userData);
        setWatchlist(userData.watchlist || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [fetchWithAuth]);

  // Fetch transactions and generate sample data
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTransactionsLoading(true);
        
        const response = await fetchWithAuth('http://localhost:5000/api/portfolio/transactions');
        
        if (!response || !response.ok) {
          // Generate sample transactions for demonstration
          const sampleTransactions = [
            {
              _id: '1',
              symbol: 'BTC',
              name: 'Bitcoin',
              type: 'buy',
              quantity: 0.5,
              price: 35000,
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: '2',
              symbol: 'ETH',
              name: 'Ethereum',
              type: 'buy',
              quantity: 5,
              price: 2000,
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: '3',
              symbol: 'SOL',
              name: 'Solana',
              type: 'buy',
              quantity: 50,
              price: 100,
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: '4',
              symbol: 'BTC',
              name: 'Bitcoin',
              type: 'buy',
              quantity: 0.25,
              price: 38000,
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: '5',
              symbol: 'ADA',
              name: 'Cardano',
              type: 'buy',
              quantity: 1000,
              price: 0.40,
              date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
          ];
          setTransactions(sampleTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)));
          return;
        }

        const data = await response.json();
        setTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    if (user) {
      fetchTransactions();
    }
  }, [user, fetchWithAuth]);

  // Update holdings whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const portfolioMetrics = calculatePortfolioMetrics();
      setHoldings(portfolioMetrics.holdings);
      
      // Update portfolio data
      setPortfolioData({
        totalValue: portfolioMetrics.totalValue,
        performance: { 
          dailyChange: portfolioMetrics.dailyChange,
          totalProfitLoss: portfolioMetrics.totalProfitLoss
        },
        assets: portfolioMetrics.holdings,
        totalAssets: portfolioMetrics.totalAssets
      });

      // Generate historical data based on current portfolio value
      const mockHistoricalData = generateMockHistoricalData(portfolioMetrics.totalValue);
      setHistoricalData(mockHistoricalData);
    }
  }, [transactions, calculatePortfolioMetrics, generateMockHistoricalData]);

  // Prepare data for pie chart - Fixed to ensure proper data format
  const getPieChartData = useCallback(() => {
    if (!holdings || holdings.length === 0) {
      return [];
    }
    
    return holdings
      .filter(holding => holding.currentValue > 0) // Only include holdings with value
      .map(holding => ({
        name: holding.symbol,
        value: Math.round(holding.currentValue * 100) / 100, // Round to 2 decimal places
        fullName: holding.name
      }));
  }, [holdings]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleRemoveFromWatchlist = async (symbol) => {
    try {
      const response = await fetchWithAuth('http://localhost:5000/api/users/watchlist', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          symbol
        })
      });

      if (!response || !response.ok) {
        throw new Error('Failed to update watchlist');
      }

      const updatedWatchlist = await response.json();
      setWatchlist(updatedWatchlist);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToWatchlist = () => {
    setShowWatchlistModal(true);
  };

  const getTransactionTypeStyle = (type) => {
    return type === 'buy' ? 'transaction-buy' : 'transaction-sell';
  };

  // Modal placeholder - would be replaced with actual modal component
  const WatchlistModal = () => (
    <div className="modal">
      <div className="modal-content">
        <h2>Add to Watchlist</h2>
        <p>Search and add crypto to watchlist form would go here</p>
        <button onClick={() => setShowWatchlistModal(false)}>Close</button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Get portfolio metrics
  const totalPortfolioValue = portfolioData?.totalValue || 0;
  const dailyChange = portfolioData?.performance?.dailyChange || 0;
  const totalProfitLoss = portfolioData?.performance?.totalProfitLoss || 0;
  const totalAssets = portfolioData?.totalAssets || 0;
  const pieChartData = getPieChartData();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo">Portfolio Tracker</div>
        <nav className="header-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            Watchlist
          </button>
          <button 
            className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            Market
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
        <div className="user-menu">
          <div className="user-name">{user?.name}</div>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="error-message">{error}</div>}
        
        {activeTab === 'overview' && (
          <div className="dashboard-panel">
            <h1>Welcome, {user?.name}</h1>
            <div className="overview-stats">
              <div className="stat-card">
                <h3>Portfolio Value</h3>
                <p className="stat-value">
                  {formatCurrency(totalPortfolioValue)}
                </p>
              </div>
              <div className="stat-card">
                <h3>Total Profit/Loss</h3>
                <p className={`stat-value ${totalProfitLoss >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(totalProfitLoss)} ({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)}%)
                </p>
              </div>
              <div className="stat-card">
                <h3>Total Assets</h3>
                <p className="stat-value">
                  {totalAssets}
                </p>
              </div>
            </div>

            {/* Current Holdings Section */}
            <div className="dashboard-section holdings-section">
              <h2>Current Holdings</h2>
              {holdings && holdings.length > 0 ? (
                <div className="holdings-table">
                  <div className="table-header">
                    <div className="table-cell">Asset</div>
                    <div className="table-cell">Quantity</div>
                    <div className="table-cell">Average Buy Price</div>
                    <div className="table-cell">Current Price</div>
                    <div className="table-cell">Total Value</div>
                    <div className="table-cell">Profit/Loss</div>
                  </div>
                  {holdings.map((holding) => (
                    <div className="table-row" key={holding.symbol}>
                      <div className="table-cell asset-cell">
                        <div className="asset-info">
                          <div className="asset-name">{holding.name}</div>
                          <div className="asset-symbol">{holding.symbol}</div>
                        </div>
                      </div>
                      <div className="table-cell">{holding.quantity ? holding.quantity.toFixed(6) : '0.000000'}</div>
                      <div className="table-cell">{formatCurrency(holding.averagePrice)}</div>
                      <div className="table-cell">{formatCurrency(holding.currentPrice)}</div>
                      <div className="table-cell">{formatCurrency(holding.currentValue)}</div>
                      <div className={`table-cell ${(holding.profitLoss || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(holding.profitLoss || 0)} ({((holding.profitLossPercentage || 0)).toFixed(2)}%)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>You haven't added any assets to your portfolio yet.</p>
                </div>
              )}
            </div>

            {/* Recent Transactions Section */}
            <div className="dashboard-section transactions-section">
              <h2>Recent Transactions</h2>
              {transactionsLoading ? (
                <div className="loading">Loading transactions...</div>
              ) : transactions && transactions.length > 0 ? (
                <div className="transactions-table">
                  <div className="table-header">
                    <div className="table-cell">Date</div>
                    <div className="table-cell">Type</div>
                    <div className="table-cell">Asset</div>
                    <div className="table-cell">Quantity</div>
                    <div className="table-cell">Price</div>
                    <div className="table-cell">Total Value</div>
                  </div>
                  {transactions.slice(0, 10).map((transaction) => (
                    <div className="table-row" key={transaction._id}>
                      <div className="table-cell">{formatDate(transaction.date)}</div>
                      <div className={`table-cell ${getTransactionTypeStyle(transaction.type)}`}>
                        {transaction.type.toUpperCase()}
                      </div>
                      <div className="table-cell asset-cell">
                        <div className="asset-info">
                          <div className="asset-name">{transaction.name}</div>
                          <div className="asset-symbol">{transaction.symbol}</div>
                        </div>
                      </div>
                      <div className="table-cell">{transaction.quantity ? transaction.quantity.toFixed(6) : '0.000000'}</div>
                      <div className="table-cell">{formatCurrency(transaction.price)}</div>
                      <div className="table-cell">{formatCurrency(transaction.quantity * transaction.price)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No transactions yet. Start trading to see your transaction history.</p>
                </div>
              )}
              {transactions && transactions.length > 10 && (
                <div className="view-all-container">
                  <button className="view-all-button" onClick={() => navigate('/transactions')}>View All Transactions</button>
                </div>
              )}
            </div>

            {/* Portfolio Charts Section - Fixed */}
            <div className="dashboard-section portfolio-section">
              <h2>Portfolio Overview</h2>
              <div className="portfolio-content">
                {/* Portfolio Performance Chart */}
                <div className="portfolio-chart">
                  <h3>Portfolio Performance</h3>
                  <div className="chart-container">
                    {historicalData && historicalData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={historicalData}
                          margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
                            }}
                          />
                          <YAxis 
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
                            formatter={(value) => [formatCurrency(value), 'Portfolio Value']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#8884d8" 
                            fill="url(#colorValue)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-placeholder">
                        <p>Loading portfolio performance data...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset Allocation Pie Chart */}
                {pieChartData && pieChartData.length > 0 && (
                  <div className="portfolio-allocation">
                    <h3>Asset Allocation</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [
                              formatCurrency(value), 
                              props.payload.fullName || name
                            ]} 
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="dashboard-panel">
            <h1>Your Watchlist</h1>
            <div className="panel-actions">
              <button className="primary-button" onClick={handleAddToWatchlist}>Add to Watchlist</button>
            </div>
            
            {!watchlist || watchlist.length === 0 ? (
              <div className="empty-state">
                <p>Your watchlist is empty. Add assets to track their performance.</p>
              </div>
            ) : (
              <div className="watchlist-table">
                <div className="table-header">
                  <div className="table-cell">Symbol</div>
                  <div className="table-cell">Type</div>
                  <div className="table-cell">Price</div>
                  <div className="table-cell">24h Change</div>
                  <div className="table-cell">Actions</div>
                </div>
                {watchlist.map((item) => (
                  <div className="table-row" key={item.symbol}>
                    <div className="table-cell">{item.symbol}</div>
                    <div className="table-cell">{item.type}</div>
                    <div className="table-cell">$0.00</div>
                    <div className="table-cell">0.00%</div>
                    <div className="table-cell">
                      <button 
                        className="remove-button"
                        onClick={() => handleRemoveFromWatchlist(item.symbol)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'market' && (
          <div className="dashboard-panel">
            <h1>Market Overview</h1>
            <CryptoMarketData />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="dashboard-panel">
            <h1>Account Settings</h1>
            <div className="settings-section">
              <h2>Profile Information</h2>
              <div className="profile-details">
                <div className="profile-item">
                  <label>Name</label>
                  <p>{user?.name}</p>
                </div>
                <div className="profile-item">
                  <label>Email</label>
                  <p>{user?.email}</p>
                </div>
              </div>
            </div>
            <div className="settings-section">
              <h2>Preferences</h2>
              <div className="profile-details">
                <div className="profile-item">
                  <label>Currency</label>
                  <p>{user?.profileSettings?.currency || 'USD'}</p>
                  <button className="edit-button">Edit</button>
                </div>
                <div className="profile-item">
                  <label>Theme</label>
                  <p>{user?.profileSettings?.theme || 'Light'}</p>
                  <button className="edit-button">Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Enhanced CSS styles for charts */}
      <style>{`
        .portfolio-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
          margin-top: 20px;
        }
        
        @media (min-width: 1024px) {
          .portfolio-content {
            flex-direction: row;
            gap: 40px;
          }
          
          .portfolio-chart,
          .portfolio-allocation {
            flex: 1;
          }
        }
        
        .portfolio-chart,
        .portfolio-allocation {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          min-height: 400px;
        }
        
        .portfolio-chart h3,
        .portfolio-allocation h3 {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }
        
        .chart-container {
          width: 100%;
          height: 300px;
          position: relative;
        }
        
        .chart-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          font-style: italic;
        }
        
        .recharts-responsive-container {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Ensure chart text is visible */
        .recharts-cartesian-axis-tick-value,
        .recharts-legend-item-text,
        .recharts-tooltip-wrapper {
          fill: #333 !important;
          font-size: 12px;
        }
        
        /* Pie chart label styling */
        .recharts-pie-label-text {
          fill: #333 !important;
          font-size: 11px;
          font-weight: 500;
        }
      `}</style>

      {/* Modal */}
      {showWatchlistModal && <WatchlistModal />}
    </div>
  );
};

export default DashboardPage;