import React, { useState } from 'react';
import './Style/AddAssetModal.css';

const AddAssetModal = ({ onClose, onAssetAdded }) => {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'stock',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    tags: ''
  });
  
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { symbol, name, type, quantity, purchasePrice, purchaseDate, notes, tags } = formData;

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSearchSymbol = async () => {
    if (!symbol) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/market/search?query=${symbol}`, {
        headers: {
          'x-auth-token': token
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search for symbol');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (result) => {
    setFormData({
      ...formData,
      symbol: result.symbol,
      name: result.name,
      type: result.type || 'stock'
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Format data for API
      const assetData = {
        symbol: symbol.toUpperCase(),
        name,
        type,
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate,
        notes,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const response = await fetch('http://localhost:5000/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(assetData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Failed to add asset');
      }

      const data = await response.json();
      setSuccess('Asset added successfully!');
      
      // Reset form
      setFormData({
        symbol: '',
        name: '',
        type: 'stock',
        quantity: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
        tags: ''
      });
      
      // Notify parent component
      if (onAssetAdded) {
        onAssetAdded(data);
      }
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Asset</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="symbol">Symbol</label>
            <div className="search-container">
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={symbol}
                onChange={handleChange}
                placeholder="e.g., AAPL, BTC, ETH"
                required
              />
              <button 
                type="button" 
                className="search-button"
                onClick={handleSearchSymbol}
                disabled={loading || !symbol}
              >
                Search
              </button>
            </div>
            
            {loading && <div className="loading-indicator">Searching...</div>}
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div 
                    key={index} 
                    className="search-result-item"
                    onClick={() => selectResult(result)}
                  >
                    <div className="result-symbol">{result.symbol}</div>
                    <div className="result-name">{result.name}</div>
                    <div className="result-type">{result.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              placeholder="e.g., Apple Inc., Bitcoin"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Asset Type</label>
            <select
              id="type"
              name="type"
              value={type}
              onChange={handleChange}
              required
            >
              <option value="stock">Stock</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="etf">ETF</option>
              <option value="bond">Bond</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={quantity}
                onChange={handleChange}
                step="any"
                min="0"
                placeholder="e.g., 10"
                required
              />
            </div>
            
            <div className="form-group half">
              <label htmlFor="purchasePrice">Purchase Price ($)</label>
              <input
                type="number"
                id="purchasePrice"
                name="purchasePrice"
                value={purchasePrice}
                onChange={handleChange}
                step="any"
                min="0"
                placeholder="e.g., 150.50"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="purchaseDate">Purchase Date</label>
            <input
              type="date"
              id="purchaseDate"
              name="purchaseDate"
              value={purchaseDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={handleChange}
              placeholder="Any additional information about this asset..."
              rows="3"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label htmlFor="tags">Tags (Optional, comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={tags}
              onChange={handleChange}
              placeholder="e.g., tech, long-term, retirement"
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || success}
            >
              {loading ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;