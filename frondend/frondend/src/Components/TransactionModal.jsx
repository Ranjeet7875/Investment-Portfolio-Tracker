import React, { useState, useEffect } from 'react';
import "./Style/TransactionModal.css"

const TransactionModal = ({ isOpen, onClose, coinData, onCompleteTransaction, initialTransactionType = 'buy' }) => {
  const [transactionType, setTransactionType] = useState(initialTransactionType);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);

  useEffect(() => {
    if (isOpen && coinData) {
      // Reset form when modal opens
      setAmount('');
      setError('');
      
      // Set current price from coin data
      setPrice(coinData.price || coinData.current_price || 0);
      
      // Set transaction type from prop if provided
      if (initialTransactionType) {
        setTransactionType(initialTransactionType);
      }
      
      // Set current date as default
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      
      // Fetch user's available balance for this coin if selling
      if (initialTransactionType === 'sell') {
        fetchAvailableBalance(coinData.symbol);
      }
    }
  }, [isOpen, coinData, initialTransactionType]);

  useEffect(() => {
    // Calculate total value whenever amount or price changes
    const calculatedTotal = (parseFloat(amount) || 0) * (parseFloat(price) || 0);
    setTotalValue(calculatedTotal);
  }, [amount, price]);

  useEffect(() => {
    // If transaction type changes to "sell", fetch available balance
    if (transactionType === 'sell' && coinData) {
      fetchAvailableBalance(coinData.symbol);
    }
  }, [transactionType, coinData]);

  const fetchAvailableBalance = async (symbol) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/portfolio/holdings/${symbol}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableBalance(data.amount || 0);
      } else {
        // If the user doesn't have this coin yet
        setAvailableBalance(0);
      }
    } catch (err) {
      console.error('Error fetching available balance:', err);
      setAvailableBalance(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check if user has enough balance for selling
    if (transactionType === 'sell' && amount > availableBalance) {
      setError(`You can't sell more than your available balance of ${availableBalance} ${coinData.symbol}`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      const transactionData = {
        coinId: coinData.id,
        symbol: coinData.symbol,
        name: coinData.name,
        type: transactionType,
        amount: parseFloat(amount),
        price: parseFloat(price),
        totalValue: totalValue,
        date: date
      };
      
      const response = await fetch('http://localhost:5000/api/portfolio/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(transactionData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process transaction');
      }
      
      const result = await response.json();
      
      // Reset form
      setAmount('');
      setTotalValue(0);
      
      // Show success message or toast notification
      // You could implement a toast notification system here
      
      // Notify parent component that transaction is complete
      if (onCompleteTransaction) {
        onCompleteTransaction(result);
      }
      
      // Close modal
      onClose();
      
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (transactionType === 'sell' && availableBalance > 0) {
      setAmount(availableBalance.toString());
    }
  };

  if (!isOpen || !coinData) return null;

  return (
    <div className="modal-overlay">
      <div className="transaction-modal">
        <div className="modal-header">
          <h2>{transactionType === 'buy' ? 'Buy' : 'Sell'} {coinData?.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group transaction-type">
              <button 
                type="button"
                className={`transaction-button ${transactionType === 'buy' ? 'active' : ''}`}
                onClick={() => setTransactionType('buy')}
              >
                Buy
              </button>
              <button 
                type="button"
                className={`transaction-button ${transactionType === 'sell' ? 'active' : ''}`}
                onClick={() => setTransactionType('sell')}
              >
                Sell
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="amount">Amount ({coinData?.symbol?.toUpperCase()})</label>
              <div className="input-with-action">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="any"
                  min="0"
                  required
                />
                {transactionType === 'sell' && (
                  <button 
                    type="button" 
                    className="max-button"
                    onClick={handleMaxAmount}
                  >
                    MAX
                  </button>
                )}
              </div>
              {transactionType === 'sell' && (
                <div className="available-balance">
                  Available: {availableBalance} {coinData?.symbol?.toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="price">Price per {coinData?.symbol?.toUpperCase()} (USD)</label>
              <input
                type="number"
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="any"
                min="0"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="date">Transaction Date</label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            
            <div className="transaction-summary">
              <h3>Transaction Summary</h3>
              <div className="summary-item">
                <span>Total Value:</span>
                <span>${totalValue.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Confirm ${transactionType}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;