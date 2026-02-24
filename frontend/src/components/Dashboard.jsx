import React, { useState, useEffect, useCallback } from 'react'
import { getQuote, getPrediction } from '../services/api'

const Dashboard = ({ symbol, market, stocks: stockList }) => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [stockPrices, setStockPrices] = useState({})
  const [priceLoading, setPriceLoading] = useState(false)

  // Fetch only the selected stock initially for fast load
  useEffect(() => {
    if (symbol) {
      fetchStockDetails(symbol)
      fetchPrediction(symbol)
    }
  }, [symbol])

  // Fetch a few popular stocks in parallel (not all 15)
  useEffect(() => {
    if (!stockList || stockList.length === 0) return

    const fetchInitialStocks = async () => {
      try {
        setLoading(true)
        // Only fetch first 5 stocks initially for fast load
        const popularSymbols = stockList.slice(0, 5).map(s => s.symbol)

        const pricePromises = popularSymbols.map(async (sym) => {
          try {
            const quote = await getQuote(sym)
            return { symbol: sym, ...quote }
          } catch {
            return null
          }
        })

        const prices = await Promise.all(pricePromises)
        const validPrices = prices.filter(Boolean)
        setStockPrices(validPrices.reduce((acc, p) => ({ ...acc, [p.symbol]: p }), {}))
        setStocks(validPrices)
      } catch (err) {
        console.error('Error fetching stocks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialStocks()
  }, [stockList])

  const fetchStockDetails = async (sym) => {
    try {
      const quote = await getQuote(sym)
      setSelectedStock(quote)
    } catch (err) {
      console.error('Quote error:', err)
    }
  }

  const fetchPrediction = async (sym) => {
    try {
      const pred = await getPrediction(sym)
      setPrediction(pred)
    } catch (err) {
      console.error('Prediction error:', err)
    }
  }

  // Load more stocks on demand
  const loadMoreStocks = async () => {
    if (!stockList || priceLoading) return

    try {
      setPriceLoading(true)
      // Get stocks that haven't been loaded yet
      const loadedSymbols = stocks.map(s => s.symbol)
      const remainingStocks = stockList.filter(s => !loadedSymbols.includes(s.symbol)).slice(0, 10)

      const pricePromises = remainingStocks.map(async (stock) => {
        try {
          const quote = await getQuote(stock.symbol)
          return { symbol: stock.symbol, ...quote }
        } catch {
          return null
        }
      })

      const prices = await Promise.all(pricePromises)
      const validPrices = prices.filter(Boolean)
      setStocks(prev => [...prev, ...validPrices])
      setStockPrices(prev => ({
        ...prev,
        ...validPrices.reduce((acc, p) => ({ ...acc, [p.symbol]: p }), {})
      }))
    } catch (err) {
      console.error('Error loading more stocks:', err)
    } finally {
      setPriceLoading(false)
    }
  }

  const formatChange = (change, changePercent) => {
    const isPositive = change >= 0
    return (
      <span className={isPositive ? 'text-emerald-600' : 'text-red-500'}>
        {isPositive ? '+' : ''}{change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Market Status</h3>
              <p className="text-3xl font-bold mt-2">Open</p>
              <p className="text-sm opacity-80 mt-1">{market === 'india' ? 'NSE/BSE' : 'NYSE/NASDAQ'}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-slate-500">Total Stocks</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stocks.length}</p>
            </div>
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-slate-500">Gainers</h3>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {stocks.filter(s => s.change > 0).length}
              </p>
            </div>
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-slate-500">Losers</h3>
              <p className="text-3xl font-bold text-red-500 mt-2">
                {stocks.filter(s => s.change < 0).length}
              </p>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Market Watch - {market === 'india' ? 'Indian Markets' : 'US Markets'}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stocks.map(stock => (
                <tr
                  key={stock.symbol}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${symbol === stock.symbol ? 'bg-emerald-50' : ''}`}
                  onClick={() => setSelectedStock(stock)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${stock.change >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span className="font-bold text-slate-900">{stock.symbol}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{stock.name || stock.symbol}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ${stock.price?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatChange(stock.change, stock.changePercent)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {stock.volume > 1000000
                      ? `${(stock.volume / 1000000).toFixed(2)}M`
                      : stock.volume > 1000
                        ? `${(stock.volume / 1000).toFixed(0)}K`
                        : stock.volume || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {stockList && stocks.length < stockList.length && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              onClick={loadMoreStocks}
              disabled={priceLoading}
              className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {priceLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <span>Load More Stocks ({stockList.length - stocks.length} remaining)</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Selected Stock Details & Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              {selectedStock?.symbol || symbol} Details
            </h3>
            {selectedStock && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedStock.change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {selectedStock.change >= 0 ? 'Bullish' : 'Bearish'}
              </span>
            )}
          </div>
          {selectedStock ? (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Current Price</p>
                <p className="text-2xl font-bold text-slate-800">${selectedStock.price?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Change</p>
                <p className="text-2xl font-bold">{formatChange(selectedStock.change, selectedStock.changePercent)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Day High</p>
                <p className="text-lg font-semibold text-slate-800">${selectedStock.high?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Day Low</p>
                <p className="text-lg font-semibold text-slate-800">${selectedStock.low?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Volume</p>
                <p className="text-lg font-semibold text-slate-800">
                  {(selectedStock.volume / 1000000).toFixed(2)}M
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">52W High</p>
                <p className="text-lg font-semibold text-slate-800">${selectedStock.fiftyTwoWeekHigh?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">P/E Ratio</p>
                <p className="text-lg font-semibold text-slate-800">{selectedStock.pe?.toFixed(2) || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Market Cap</p>
                <p className="text-lg font-semibold text-slate-800">
                  {selectedStock.marketCap > 1e12
                    ? `$${(selectedStock.marketCap / 1e12).toFixed(2)}T`
                    : selectedStock.marketCap > 1e9
                      ? `$${(selectedStock.marketCap / 1e9).toFixed(2)}B`
                      : 'N/A'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Select a stock to view details</p>
            </div>
          )}
        </div>

        {/* Prediction */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">AI Prediction</h3>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500">Live</span>
            </div>
          </div>
          {prediction ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
                <div>
                  <p className="text-sm text-slate-500">Signal</p>
                  <p className={`text-3xl font-bold ${
                    prediction.signal === 'BUY' ? 'text-emerald-600' :
                    prediction.signal === 'SELL' ? 'text-red-500' : 'text-slate-600'
                  }`}>
                    {prediction.signal}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Confidence</p>
                  <p className="text-3xl font-bold text-emerald-600">{prediction.confidence}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-sm text-slate-500">Target High</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${prediction.target?.high?.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-500">Current</p>
                  <p className="text-lg font-bold text-slate-800">
                    ${prediction.target?.current?.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm text-slate-500">Target Low</p>
                  <p className="text-lg font-bold text-red-500">
                    ${prediction.target?.low?.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">Bullish Signals</p>
                  <p className="text-lg font-bold text-emerald-600">{prediction.bullishPercent}%</p>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    style={{ width: `${prediction.bullishPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading prediction...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard