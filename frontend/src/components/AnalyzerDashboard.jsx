import React, { useState, useEffect, useRef } from 'react'
import { getQuote, getPrediction, getIndicators, getHistoricalData, getNews, getStrategySignals } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine
} from 'recharts'
import { createChart } from 'lightweight-charts'

const AnalyzerDashboard = ({ symbol, stocks }) => {
  const [selectedStock, setSelectedStock] = useState(symbol)
  const [quote, setQuote] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [indicators, setIndicators] = useState(null)
  const [historical, setHistorical] = useState([])
  const [news, setNews] = useState([])
  const [strategies, setStrategies] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState('area')
  const [timeframe, setTimeframe] = useState('1m')
  const chartContainerRef = useRef(null)
  const chartInstanceRef = useRef(null)

  useEffect(() => {
    if (selectedStock) {
      fetchAllData()
    }
  }, [selectedStock, timeframe])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Load essential data first (quote + historical) - show immediately
      const [quoteData, histData] = await Promise.all([
        getQuote(selectedStock),
        getHistoricalData(selectedStock, timeframe === '1d' ? '5d' : timeframe === '1w' ? '1mo' : '1y')
      ])
      setQuote(quoteData)
      setHistorical(histData)
      setLoading(false)

      // Load secondary data in background
      const period = timeframe === '1d' ? '1mo' : timeframe === '1w' ? '3mo' : '1y'
      const [predData, indData, newsData, stratData] = await Promise.all([
        getPrediction(selectedStock),
        getIndicators(selectedStock, period),
        getNews(selectedStock, 5),
        getStrategySignals(selectedStock)
      ])

      setPrediction(predData)
      setIndicators(indData)
      setNews(newsData)
      setStrategies(stratData)
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoading(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedStock) {
        getQuote(selectedStock).then(setQuote)
        getPrediction(selectedStock).then(setPrediction)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [selectedStock])

  // Candlestick chart with lightweight-charts
  useEffect(() => {
    if (chartType !== 'candle' || !chartContainerRef.current || !historical?.length) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
      return
    }

    const container = chartContainerRef.current
    const chart = createChart(container, {
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#e2e8f0' }, horzLines: { color: '#e2e8f0' } },
      width: container.clientWidth,
      height: 350,
      timeScale: { timeVisible: true, secondsVisible: false }
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    })

    const candleData = historical.map(d => ({
      time: new Date(d.date).getTime() / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    }))

    candlestickSeries.setData(candleData)
    chartInstanceRef.current = chart

    const handleResize = () => {
      if (chartInstanceRef.current && container) {
        chartInstanceRef.current.applyOptions({ width: container.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [chartType, historical])

  const formatCurrency = (val) => `₹${(val || 0).toFixed(2)}`
  const formatChange = (change, percent) => {
    const isPositive = change >= 0
    return { class: isPositive ? 'text-emerald-500' : 'text-red-500', sign: isPositive ? '+' : '' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  const changeFormat = formatChange(quote?.change, quote?.changePercent)

  return (
    <div className="space-y-4">
      {/* Stock Selector Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {stocks?.slice(0, 20).map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${(quote?.change || 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-xs text-slate-500">LIVE</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {['1d', '1w', '1m', '3m', '1y'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${timeframe === tf ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Price & Chart Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">{quote?.name || selectedStock}</h2>
                <p className="text-sm text-slate-500">{selectedStock}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-slate-800">₹{quote?.price?.toFixed(2)}</p>
                <p className={`text-lg font-bold ${changeFormat.class}`}>
                  {changeFormat.sign}{quote?.change?.toFixed(2)} ({quote?.changePercent?.toFixed(2)}%)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="text-center">
                <p className="text-xs text-slate-500">Open</p>
                <p className="font-bold text-slate-700">₹{quote?.open?.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">High</p>
                <p className="font-bold text-emerald-600">₹{quote?.high?.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Low</p>
                <p className="font-bold text-red-500">₹{quote?.low?.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Volume</p>
                <p className="font-bold text-slate-700">{(quote?.volume / 1000000).toFixed(2)}M</p>
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Price Chart</h3>
              <div className="flex space-x-2">
                {['area', 'line', 'candle'].map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 rounded text-xs font-medium ${chartType === type ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              {chartType === 'area' ? (
                <AreaChart data={historical}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} formatter={(val) => [`₹${val?.toFixed(2)}`, 'Price']} />
                  <ReferenceLine y={quote?.price} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} fill="url(#colorPrice)" />
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={historical}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} formatter={(val) => [`₹${val?.toFixed(2)}`, 'Price']} />
                  <Line type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} dot={false} />
                  {indicators?.sma20 && <Line type="monotone" dataKey={() => indicators.sma20[Math.floor(indicators.sma20.length / 2)]} stroke="#f59e0b" strokeWidth={1} dot={false} name="SMA20" />}
                </LineChart>
              ) : (
                <div ref={chartContainerRef} className="w-full h-[350px]" />
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* AI Prediction */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">AI Prediction</h3>
              <span className="px-2 py-1 bg-white/20 rounded text-xs">LIVE</span>
            </div>
            {prediction && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-violet-200">Signal</span>
                  <span className={`text-2xl font-bold ${
                    prediction.signal === 'BUY' ? 'text-emerald-300' : prediction.signal === 'SELL' ? 'text-red-300' : 'text-yellow-300'
                  }`}>{prediction.signal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-violet-200">Confidence</span>
                  <span className="text-xl font-bold">{prediction.confidence}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-xs text-violet-200">Target</p>
                    <p className="font-bold text-emerald-300">₹{prediction.target?.high?.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-violet-200">Current</p>
                    <p className="font-bold">₹{prediction.target?.current?.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-violet-200">Support</p>
                    <p className="font-bold text-red-300">₹{prediction.target?.low?.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Technical Indicators */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3">Technical Indicators</h3>
            <div className="space-y-2">
              {[
                { name: 'RSI (14)', value: indicators?.rsi?.[indicators.rsi.length - 1]?.toFixed(2), type: 'rsi' },
                { name: 'MACD', value: indicators?.macd?.macd?.[indicators.macd.macd.length - 1]?.toFixed(2), type: 'macd' },
                { name: 'ATR (14)', value: indicators?.atr?.[indicators.atr.length - 1]?.toFixed(2), type: 'atr' },
                { name: 'ADX (14)', value: indicators?.adx?.adx?.[indicators.adx.adx.length - 1]?.toFixed(2), type: 'adx' },
              ].map(ind => {
                const getStatus = () => {
                  if (ind.type === 'rsi' && ind.value > 70) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Overbought' }
                  if (ind.type === 'rsi' && ind.value < 30) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Oversold' }
                  return { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Neutral' }
                }
                const status = getStatus()

                return (
                  <div key={ind.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-sm text-slate-600">{ind.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{ind.value || 'N/A'}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${status.bg} ${status.text}`}>{status.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Trading Signals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3">Strategy Signals</h3>
            <div className="space-y-2">
              {strategies && Object.entries(strategies.strategies || {}).slice(0, 4).map(([name, signals]) => {
                const latest = signals[signals.length - 1]
                return (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-sm text-slate-600 capitalize">{name.replace(/([A-Z])/g, ' $1')}</span>
                    {latest && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${latest.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {latest.type}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Latest News */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3">Latest News</h3>
            <div className="space-y-2">
              {news.slice(0, 4).map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer">
                  <p className="text-sm text-slate-700 line-clamp-2">{item.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{item.source}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${item.sentiment > 0 ? 'bg-emerald-100 text-emerald-700' : item.sentiment < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200'}`}>
                      {item.sentimentLabel || 'neutral'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - All Stocks Watchlist */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Market Watch</h3>
          <span className="text-xs text-slate-500">Click to analyze • Auto-refreshes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500">Symbol</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">Price</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">Change</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">Volume</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stocks?.slice(0, 15).map(stock => (
                <tr
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={`cursor-pointer hover:bg-slate-50 ${selectedStock === stock.symbol ? 'bg-emerald-50' : ''}`}
                >
                  <td className="px-4 py-2">
                    <p className="font-bold text-slate-800">{stock.symbol.replace('.NS', '')}</p>
                    <p className="text-xs text-slate-500">{stock.name?.substring(0, 20)}</p>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-slate-800">
                    {quote?.symbol === stock.symbol ? `₹${quote.price?.toFixed(2)}` : '--'}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${(quote?.symbol === stock.symbol && quote?.change >= 0) ? 'text-emerald-600' : 'text-red-500'}`}>
                    {quote?.symbol === stock.symbol ? `${(quote?.change || 0) >= 0 ? '+' : ''}${quote?.changePercent?.toFixed(2)}%` : '--'}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {quote?.symbol === stock.symbol ? `${(quote?.volume / 1000000).toFixed(1)}M` : '--'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {prediction?.signal && quote?.symbol === stock.symbol && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${prediction.signal === 'BUY' ? 'bg-emerald-500 text-white' : prediction.signal === 'SELL' ? 'bg-red-500 text-white' : 'bg-slate-300'}`}>
                        {prediction.signal}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AnalyzerDashboard