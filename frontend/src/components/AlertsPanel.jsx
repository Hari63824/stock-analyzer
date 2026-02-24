import React, { useState, useEffect } from 'react';
import { getAlerts, createAlert, deleteAlert } from '../services/api';

const AlertsPanel = ({ symbol, isPremium }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [condition, setCondition] = useState('above');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isPremium) {
      loadAlerts();
    }
  }, [isPremium]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (err) {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!targetPrice) {
      setError('Please enter a target price');
      return;
    }

    try {
      await createAlert(symbol, parseFloat(targetPrice), condition);
      setTargetPrice('');
      setSuccess('Alert created successfully');
      loadAlerts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create alert');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await deleteAlert(alertId);
      loadAlerts();
    } catch (err) {
      setError('Failed to delete alert');
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
          <p className="text-slate-600 mb-4">Upgrade to Premium to create price alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
        <span className="mr-2">🔔</span>
        Price Alerts
      </h3>

      {/* Create Alert Form */}
      <form onSubmit={handleCreateAlert} className="mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              readOnly
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Target Price</label>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full mt-3 bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Create Alert
        </button>
      </form>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-3">{success}</div>}

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-4 text-slate-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-4 text-slate-500">No alerts yet</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.isActive
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-slate-900">{alert.symbol}</span>
                <span className={`text-sm px-2 py-0.5 rounded ${
                  alert.condition === 'above'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {alert.condition === 'above' ? '↑' : '↓'} ₹{alert.targetPrice}
                </span>
                {!alert.isActive && (
                  <span className="text-xs text-slate-500">Triggered</span>
                )}
              </div>
              <button
                onClick={() => handleDeleteAlert(alert.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;