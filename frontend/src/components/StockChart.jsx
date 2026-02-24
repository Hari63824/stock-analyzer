import React, { useState, useEffect } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts'
import { getHistoricalData, getIndicators } from '../services/api'

const StockChart = ({ symbol }) => {
  const [data, setData] = useState([])
  const [indicators, setIndicators] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('1y')
  const [indicatorType, setIndicatorType] = useState('price')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
    fetchIndicators()
  }, [symbol, period])

  const fetchData = async () => {
    try {
      setLoading(true)
      const historicalData = await getHistoricalData(symbol, period, '1d')
      const chartData = historicalData.map((item, index) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        price: item.close,
        open: item.open,
        high: item.high,
        low: item.low,
        volume: item.volume,
        rawDate: item.date,
        index
      }))
      setData(chartData)
      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }

  const fetchIndicators = async () => {
    try {
      const ind = await getIndicators(symbol, period, '1d')
      setIndicators(ind)
    } catch (err) {
      console.error('Error fetching indicators:', err)
    }
  }

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      )
    }

    if (error || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-slate-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No data available</p>
          </div>
        </div>
      )
    }

    // Prepare chart data with indicators
    const chartData = data.map((item, index) => {
      const result = { ...item }
      if (indicators) {
        if (indicatorType === 'sma' && indicators.sma50) {
          result.sma50 = indicators.sma50[index] ? parseFloat(indicators.sma50[index].toFixed(2)) : null
        }
        if (indicatorType === 'ema' && indicators.ema50) {
          result.ema50 = indicators.ema50[index] ? parseFloat(indicators.ema50[index].toFixed(2)) : null
        }
        if (indicatorType === 'sma20' && indicators.sma20) {
          result.sma20 = indicators.sma20[index] ? parseFloat(indicators.sma20[index].toFixed(2)) : null
        }
        if (indicatorType === 'ema12' && indicators.ema12) {
          result.ema12 = indicators.ema12[index] ? parseFloat(indicators.ema12[index].toFixed(2)) : null
        }
        if (indicatorType === 'bollinger' && indicators.bollingerBands) {
          result.bbUpper = indicators.bollingerBands.upper[index]
          result.bbLower = indicators.bollingerBands.lower[index]
          result.bbMiddle = indicators.bollingerBands.middle[index]
        }
      }
      return result
    })

    return (
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(val) => `$${val.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            formatter={(value, name) => [value?.toFixed(2), name]}
          />
          <Legend />

          {indicatorType === 'price' && (
            <>
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#priceGradient)"
                name="Price"
              />
            </>
          )}

          {indicatorType === 'sma' && (
            <>
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={1}
                fill="url(#priceGradient)"
                name="Price"
              />
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="SMA 50"
              />
              {indicators?.sma20 && (
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  name="SMA 20"
                />
              )}
            </>
          )}

          {indicatorType === 'ema' && (
            <>
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={1}
                fill="url(#priceGradient)"
                name="Price"
              />
              <Line
                type="monotone"
                dataKey="ema50"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                name="EMA 50"
              />
              {indicators?.ema12 && (
                <Line
                  type="monotone"
                  dataKey="ema12"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  name="EMA 12"
                />
              )}
            </>
          )}

          {indicatorType === 'bollinger' && (
            <>
              <Area
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={1}
                fill="url(#priceGradient)"
                name="Price"
              />
              <Line
                type="monotone"
                dataKey="bbUpper"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="Upper Band"
              />
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="Middle Band"
              />
              <Line
                type="monotone"
                dataKey="bbLower"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="Lower Band"
              />
            </>
          )}

          {indicatorType === 'volume' && (
            <>
              <Bar dataKey="volume" fill="#94a3b8" name="Volume" opacity={0.3} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Price"
              />
            </>
          )}

          {indicatorType === 'macd' && indicators?.macd && (
            <>
              <Line
                type="monotone"
                dataKey="price"
                stroke="#10b981"
                strokeWidth={1}
                dot={false}
                name="Price"
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // Get latest indicator values
  const getLatestIndicator = (indicator, key = null) => {
    if (!indicators) return { value: 'N/A', label: 'N/A' }

    let value
    if (key && indicator && indicator[key]) {
      value = indicator[key][indicator[key].length - 1]
    } else if (indicator && Array.isArray(indicator)) {
      value = indicator[indicator.length - 1]
    }

    if (value === null || value === undefined || isNaN(value)) {
      return { value: 'N/A', label: 'N/A' }
    }

    return {
      value: typeof value === 'number' ? value.toFixed(2) : value,
      label: typeof value === 'number' ? (value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral') : 'N/A'
    }
  }

  const rsiData = getLatestIndicator(indicators?.rsi)
  const macdData = indicators?.macd ? {
    value: (indicators.macd.macd?.[indicators.macd.macd.length - 1])?.toFixed(2) || 'N/A',
    signal: (indicators.macd.histogram?.[indicators.macd.histogram.length - 1] || 0) > 0 ? 'Bullish' : 'Bearish'
  } : { value: 'N/A', signal: 'N/A' }
  const atrData = getLatestIndicator(indicators?.atr)
  const adxData = indicators?.adx ? {
    value: indicators.adx.adx?.[indicators.adx.adx.length - 1]?.toFixed(2) || 'N/A',
    label: (indicators.adx.adx?.[indicators.adx.adx.length - 1] || 0) > 25 ? 'Trending' : 'Ranging'
  } : { value: 'N/A', label: 'N/A' }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center space-x-4">
            {/* Period Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-500 font-medium">Period:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              >
                <option value="1mo">1 Month</option>
                <option value="3mo">3 Months</option>
                <option value="6mo">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
              </select>
            </div>

            {/* Indicator Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-slate-500 font-medium">Indicator:</label>
              <select
                value={indicatorType}
                onChange={(e) => setIndicatorType(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              >
                <option value="price">Price Only</option>
                <option value="sma">SMA (20, 50)</option>
                <option value="ema">EMA (12, 50)</option>
                <option value="bollinger">Bollinger Bands</option>
                <option value="volume">Volume</option>
              </select>
            </div>
          </div>

          {/* Current Price Display */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-sm text-slate-500">Current: </span>
              <span className="text-2xl font-bold text-slate-800">
                ${data[data.length - 1]?.price?.toFixed(2) || '0.00'}
              </span>
            </div>
            {data.length > 1 && (
              <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                data[data.length - 1]?.price >= data[0]?.price
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {((data[data.length - 1]?.price - data[0]?.price) / data[0]?.price * 100).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          {symbol} - {period === '1mo' ? '1 Month' :
            period === '3mo' ? '3 Months' :
              period === '6mo' ? '6 Months' :
                period === '1y' ? '1 Year' : '2 Years'} Chart
        </h2>
        {renderChart()}
      </div>

      {/* Technical Indicators Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* RSI */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">RSI (14)</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-800">{rsiData.value}</span>
            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
              rsiData.label === 'Overbought' ? 'bg-red-100 text-red-700' :
                rsiData.label === 'Oversold' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
            }`}>
              {rsiData.label}
            </span>
          </div>
        </div>

        {/* MACD */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">MACD</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-800">{macdData.value}</span>
            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
              macdData.signal === 'Bullish' ? 'bg-emerald-100 text-emerald-700' :
                macdData.signal === 'Bearish' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
            }`}>
              {macdData.signal}
            </span>
          </div>
        </div>

        {/* ATR */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">ATR (14)</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-800">{atrData.value}</span>
            <span className="px-2 py-1 text-xs rounded-lg bg-cyan-100 text-cyan-700 font-medium">
              Volatility
            </span>
          </div>
        </div>

        {/* ADX */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-500 mb-2">ADX (14)</h3>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-800">{adxData.value}</span>
            <span className={`px-2 py-1 text-xs rounded-lg font-medium ${
              adxData.label === 'Trending' ? 'bg-purple-100 text-purple-700' :
                'bg-slate-100 text-slate-700'
            }`}>
              {adxData.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockChart