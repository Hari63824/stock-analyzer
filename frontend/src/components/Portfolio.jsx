import React, { useState, useEffect } from 'react'
import { getQuote, getOrderBook } from '../services/api'

const Portfolio = ({ symbol, stocks }) => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeType, setTradeType] = useState('BUY')
  const [tradeQuantity, setTradeQuantity] = useState(1)
  const [orderBook, setOrderBook] = useState(null)
  const [orderType, setOrderType] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState('')
  const [tradingSymbol, setTradingSymbol] = useState('')
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetchPortfolio()
  }, [])

  useEffect(() => {
    if (tradingSymbol) {
      fetchOrderBook(tradingSymbol)
    }
  }, [tradingSymbol])

  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/portfolio')
      const data = await response.json()
      setPortfolio(data)
    } catch (err) {
      console.error('Error fetching portfolio:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderBook = async (sym) => {
    try {
      const data = await getOrderBook(sym)
      setOrderBook(data)
      setLimitPrice(data.lastPrice?.toFixed(2) || '')
    } catch (err) {
      console.error('Error fetching order book:', err)
    }
  }

  const executeTrade = async () => {
    if (!tradingSymbol || tradeQuantity < 1) return

    setOrderPlacing(true)
    try {
      const endpoint = orderType === 'MARKET' ? '/api/trade/buy' : '/api/trade/limit'
      const body = orderType === 'MARKET'
        ? { symbol: tradingSymbol, quantity: tradeQuantity }
        : { symbol: tradingSymbol, quantity: tradeQuantity, limitPrice: parseFloat(limitPrice), orderType: tradeType }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success) {
        showNotification(`${tradeType} order executed successfully!`, 'success')
        fetchPortfolio()
      } else if (result.status === 'PENDING') {
        showNotification(`Limit order placed at ₹${limitPrice}`, 'info')
      } else {
        showNotification(result.error || 'Order failed', 'error')
      }
    } catch (err) {
      showNotification(err.message, 'error')
    } finally {
      setOrderPlacing(false)
      setShowTradeModal(false)
    }
  }

  const showNotification = (message, type) => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const formatCurrency = (value) => `₹${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatNumber = (value) => (value || 0).toLocaleString('en-IN')

  const openTradeModal = (sym, type) => {
    setTradingSymbol(sym)
    setTradeType(type)
    setTradeQuantity(1)
    setOrderType('MARKET')
    setShowTradeModal(true)
  }

  const getPosition = (sym) => portfolio?.positions?.find(p => p.symbol === sym)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-xl shadow-lg ${
          notification.type === 'success' ? 'bg-emerald-500' :
            notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <h3 className="text-sm font-medium opacity-90">Total Portfolio Value</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(portfolio?.totalValue)}</p>
          <div className="flex items-center mt-2">
            <span className={`text-sm ${(portfolio?.unrealizedPL || 0) >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
              {(portfolio?.unrealizedPL || 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.unrealizedPL)} ({portfolio?.unrealizedPLPercent?.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-sm text-slate-500">Available Cash</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(portfolio?.cash)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-sm text-slate-500">Invested Value</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(portfolio?.investedValue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <h3 className="text-sm text-slate-500">Today's P&L</h3>
          <p className={`text-3xl font-bold mt-2 ${(portfolio?.todayPL || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {(portfolio?.todayPL || 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.todayPL)}
          </p>
        </div>
      </div>

      {/* Quick Trade Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Trade</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stocks?.slice(0, 8).map(stock => {
            const position = getPosition(stock.symbol)
            return (
              <div key={stock.symbol} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{stock.symbol}</p>
                    <p className="text-xs text-slate-500">{stock.sector}</p>
                  </div>
                  {position && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      {position.quantity} shares
                    </span>
                  )}
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => openTradeModal(stock.symbol, 'BUY')}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    Buy
                  </button>
                  {position && (
                    <button
                      onClick={() => openTradeModal(stock.symbol, 'SELL')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">My Holdings</h3>
          <button
            onClick={async () => {
              await fetch('/api/portfolio/reset', { method: 'POST' })
              fetchPortfolio()
              showNotification('Portfolio reset successfully', 'success')
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Reset Portfolio
          </button>
        </div>
        {portfolio?.positions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Avg Price</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Current</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">P&L</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">P&L %</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.positions.map(position => {
                  const pnl = (position.currentPrice - position.avgPrice) * position.quantity
                  const pnlPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100

                  return (
                    <tr key={position.symbol} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{position.symbol}</p>
                        <p className="text-xs text-slate-500">{stocks?.find(s => s.symbol === position.symbol)?.name}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800">{position.quantity}</td>
                      <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(position.avgPrice)}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800">{formatCurrency(position.currentPrice)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${pnlPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openTradeModal(position.symbol, 'BUY')}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200"
                          >
                            Buy More
                          </button>
                          <button
                            onClick={() => openTradeModal(position.symbol, 'SELL')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                          >
                            Sell
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-slate-500">No holdings yet. Start trading to build your portfolio!</p>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Recent Transactions</h3>
        </div>
        {portfolio?.transactions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.transactions.slice(0, 15).map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        txn.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{txn.symbol}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{txn.quantity}</td>
                    <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(txn.price)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">{formatCurrency(txn.total || txn.netProceeds)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${(txn.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {txn.profit !== undefined ? (txn.profit >= 0 ? '+' : '') + formatCurrency(txn.profit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            No transactions yet
          </div>
        )}
      </div>

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {tradeType} {tradingSymbol}
              </h3>
              <button onClick={() => setShowTradeModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Type */}
            <div className="mb-4">
              <label className="text-sm text-slate-500 mb-2 block">Order Type</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${orderType === 'MARKET' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${orderType === 'LIMIT' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Limit
                </button>
              </div>
            </div>

            {/* Order Book Preview */}
            {orderBook && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Bid: {formatCurrency(orderBook.bids[0]?.price)}</span>
                  <span>Ask: {formatCurrency(orderBook.asks[0]?.price)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-emerald-600">Low: {formatCurrency(orderBook.bids[4]?.price)}</span>
                  <span className="text-red-500">High: {formatCurrency(orderBook.asks[4]?.price)}</span>
                </div>
              </div>
            )}

            {/* Limit Price */}
            {orderType === 'LIMIT' && (
              <div className="mb-4">
                <label className="text-sm text-slate-500 mb-2 block">Limit Price (₹)</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter limit price"
                />
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="text-sm text-slate-500 mb-2 block">Quantity</label>
              <input
                type="number"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
              />
            </div>

            {/* Order Summary */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500">Estimated Total</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency((parseFloat(limitPrice) || orderBook?.lastPrice || 0) * tradeQuantity)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Brokerage (0.1%)</span>
                <span className="text-slate-600">
                  {formatCurrency(((parseFloat(limitPrice) || orderBook?.lastPrice || 0) * tradeQuantity * 0.001))}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={executeTrade}
              disabled={orderPlacing || tradeQuantity < 1}
              className={`w-full py-3 rounded-xl font-bold text-white transition ${
                tradeType === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
              } disabled:opacity-50`}
            >
              {orderPlacing ? 'Processing...' : `${tradeType} ${tradeQuantity} Share${tradeQuantity > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Portfolio