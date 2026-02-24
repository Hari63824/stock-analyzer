import React, { useState, useEffect } from 'react';
import { getPremiumPortfolio, getPortfolioHistory, addToPortfolio, sellFromPortfolio, getPortfolioTransactions, getPortfolioReport } from '../services/api';

const PremiumPortfolio = ({ symbol, isPremium, stocks }) => {
  const [portfolio, setPortfolio] = useState(null);
  const [history, setHistory] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('holdings');
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [tradeQuantity, setTradeQuantity] = useState('');
  const [tradePrice, setTradePrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isPremium) {
      loadPortfolio();
    }
  }, [isPremium]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const [portfolioData, historyData, txData] = await Promise.all([
        getPremiumPortfolio(),
        getPortfolioHistory('1mo'),
        getPortfolioTransactions(20)
      ]);
      setPortfolio(portfolioData);
      setHistory(historyData);
      setTransactions(txData);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (e) => {
    e.preventDefault();
    setError('');

    if (!tradeQuantity || parseInt(tradeQuantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    try {
      if (tradeType === 'buy') {
        await addToPortfolio(symbol, parseInt(tradeQuantity), tradePrice ? parseFloat(tradePrice) : null);
      } else {
        await sellFromPortfolio(symbol, parseInt(tradeQuantity));
      }
      setShowTradeForm(false);
      setTradeQuantity('');
      setTradePrice('');
      loadPortfolio();
    } catch (err) {
      setError(err.response?.data?.error || 'Trade failed');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await getPortfolioReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  if (!isPremium) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👑</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Premium Feature</h3>
          <p className="text-slate-600">Upgrade to Premium to track your portfolio with live prices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center">
          <span className="mr-2">💼</span>
          Premium Portfolio
        </h3>
        <button
          onClick={handleDownloadReport}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          📄 Download Report
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading portfolio...</div>
      ) : (
        <>
          {/* Summary Cards */}
          {portfolio?.summary && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Invested</div>
                <div className="text-lg font-bold text-slate-900">₹{portfolio.summary.totalInvested?.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Current Value</div>
                <div className="text-lg font-bold text-slate-900">₹{portfolio.summary.totalCurrentValue?.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">P/L</div>
                <div className={`text-lg font-bold ${portfolio.summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.summary.totalProfitLoss >= 0 ? '+' : ''}₹{portfolio.summary.totalProfitLoss?.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">Return %</div>
                <div className={`text-lg font-bold ${portfolio.summary.totalProfitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.summary.totalProfitLossPercent >= 0 ? '+' : ''}{portfolio.summary.totalProfitLossPercent?.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-2 mb-4">
            {['holdings', 'history', 'transactions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Holdings Tab */}
          {activeTab === 'holdings' && (
            <>
              <button
                onClick={() => setShowTradeForm(!showTradeForm)}
                className="mb-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Add Trade
              </button>

              {showTradeForm && (
                <form onSubmit={handleTrade} className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={tradeType}
                      onChange={(e) => setTradeType(e.target.value)}
                      className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                    <input
                      type="text"
                      value={symbol}
                      readOnly
                      className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                    <input
                      type="number"
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(e.target.value)}
                      placeholder="Qty"
                      className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={tradePrice}
                      onChange={(e) => setTradePrice(e.target.value)}
                      placeholder="Price (optional)"
                      className="px-2 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
                  <button
                    type="submit"
                    className="mt-2 w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Execute Trade
                  </button>
                </form>
              )}

              {portfolio?.positions?.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No holdings yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-slate-600">Symbol</th>
                        <th className="text-right py-2 text-slate-600">Qty</th>
                        <th className="text-right py-2 text-slate-600">Avg</th>
                        <th className="text-right py-2 text-slate-600">Current</th>
                        <th className="text-right py-2 text-slate-600">P/L</th>
                        <th className="text-right py-2 text-slate-600">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio?.positions?.map((pos, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 font-medium">{pos.symbol}</td>
                          <td className="text-right">{pos.quantity}</td>
                          <td className="text-right">₹{pos.avgPrice?.toFixed(2)}</td>
                          <td className="text-right">₹{pos.currentPrice?.toFixed(2)}</td>
                          <td className={`text-right ${pos.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pos.profitLoss >= 0 ? '+' : ''}₹{pos.profitLoss?.toFixed(2)}
                          </td>
                          <td className={`text-right ${pos.profitLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pos.profitLossPercent >= 0 ? '+' : ''}{pos.profitLossPercent?.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              {history?.history?.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No history yet</div>
              ) : (
                <div className="space-y-2">
                  {history?.history?.slice(-10).reverse().map((day, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">{day.date?.split('T')[0]}</span>
                      <span className="font-medium">₹{day.value?.toFixed(2)}</span>
                      <span className={day.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {day.profitLoss >= 0 ? '+' : ''}{day.profitLossPercent?.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No transactions yet</div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <span className={`font-medium ${tx.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type}
                        </span>
                        <span className="ml-2">{tx.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div>{tx.quantity} @ ₹{tx.price?.toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{tx.date?.split('T')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PremiumPortfolio;