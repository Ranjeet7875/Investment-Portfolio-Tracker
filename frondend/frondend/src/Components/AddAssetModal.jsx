import React, { useState, useEffect } from 'react';
import './Style/MarketsNews.css';

const MarketsNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const mockNews = [
    {
      id: 1,
      title: "Fed Signals Potential Rate Cut as Inflation Cools",
      summary: "Federal Reserve officials hint at possible interest rate reductions following encouraging inflation data, boosting market sentiment.",
      category: "monetary-policy",
      timestamp: "2 hours ago",
      source: "Financial Times",
      impact: "high"
    },
    {
      id: 2,
      title: "Tech Stocks Rally on AI Earnings Beat",
      summary: "Major technology companies report better-than-expected earnings driven by artificial intelligence investments.",
      category: "earnings",
      timestamp: "4 hours ago",
      source: "Reuters",
      impact: "medium"
    },
    {
      id: 3,
      title: "Oil Prices Surge on Supply Concerns",
      summary: "Crude oil futures jump 3% as geopolitical tensions raise concerns about global supply disruptions.",
      category: "commodities",
      timestamp: "6 hours ago",
      source: "Bloomberg",
      impact: "high"
    },
    {
      id: 4,
      title: "Bitcoin Breaks $50K Resistance Level",
      summary: "Cryptocurrency markets show strength as Bitcoin surpasses key psychological resistance, driving altcoin rally.",
      category: "crypto",
      timestamp: "8 hours ago",
      source: "CoinDesk",
      impact: "medium"
    },
    {
      id: 5,
      title: "European Markets Open Higher on ECB Comments",
      summary: "European indices gain ground following dovish commentary from ECB President regarding monetary policy outlook.",
      category: "international",
      timestamp: "10 hours ago",
      source: "MarketWatch",
      impact: "low"
    },
    {
      id: 6,
      title: "Retail Sales Data Shows Consumer Resilience",
      summary: "Latest retail sales figures exceed expectations, indicating continued consumer spending strength despite economic headwinds.",
      category: "economic-data",
      timestamp: "12 hours ago",
      source: "CNBC",
      impact: "medium"
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchNews = async () => {
      try {
        setLoading(true);
        // In a real app, you would make an API call here
        // const response = await fetch('/api/market-news');
        // const data = await response.json();
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setNews(mockNews);
      } catch (err) {
        setError('Failed to load market news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const categories = [
    { value: 'all', label: 'All News' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'monetary-policy', label: 'Monetary Policy' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'international', label: 'International' },
    { value: 'economic-data', label: 'Economic Data' }
  ];

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  const refreshNews = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setNews([...mockNews]);
      setLoading(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="markets-news-container">
        <div className="loading-container">
          <div className="loading-header"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="loading-card">
              <div className="loading-title"></div>
              <div className="loading-text"></div>
              <div className="loading-text-short"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="markets-news-page">
      {/* Header */}
      <div className="header-section">
        <div className="header-content">
          <div className="header-info">
            <h1 className="page-title">Markets News</h1>
            <p className="page-subtitle">Stay updated with the latest market developments</p>
          </div>
          <button onClick={refreshNews} className="refresh-button">
            <svg className="refresh-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Category Filter */}
        <div className="filter-section">
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`category-button ${selectedCategory === category.value ? 'active' : ''}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="news-grid">
          {filteredNews.map(article => (
            <div key={article.id} className="news-card">
              <div className="card-header">
                <span className={`impact-badge impact-${article.impact}`}>
                  {article.impact.toUpperCase()} IMPACT
                </span>
                <span className="timestamp">{article.timestamp}</span>
              </div>
              
              <h3 className="news-title">
                {article.title}
              </h3>
              
              <p className="news-summary">
                {article.summary}
              </p>
              
              <div className="card-footer">
                <span className="news-source">
                  {article.source}
                </span>
                <button className="read-more-button">
                  Read More
                  <svg className="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredNews.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="empty-title">No news available</h3>
            <p className="empty-description">Try selecting a different category or refresh the page.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketsNews;