import React, { useState, useEffect } from 'react'
import { getPrediction, getStrategySignals, getIndicators, getAdvancedPrediction, getTechnicalReport } from '../services/api'

const PredictionPanel = ({ symbol, isPremium = false }) => {
  const [prediction, setPrediction] = useState(null)
  const [signals, setSignals] = useState(null)
  const [indicators, setIndicators] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [premiumPrediction, setPremiumPrediction] = useState(null)
  const [loadingPremium, setLoadingPremium] = useState(false)

  useEffect(() => {
    fetchData()
  }, [symbol])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [predData, signalsData, indicatorsData] = await Promise.all([
        getPrediction(symbol),
        getStrategySignals(symbol),
        getIndicators(symbol)
      ])
      setPrediction(predData)
      setSignals(signalsData)
      setIndicators(indicatorsData)
      setError(null)
    } catch (err) {
      console.error('Error fetching prediction:', err)
      setError('Failed to load prediction data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPremiumPrediction = async () => {
    if (!isPremium) return
    setLoadingPremium(true)
    try {
      const data = await getAdvancedPrediction(symbol)
      setPremiumPrediction(data)
    } catch (err) {
      console.error('Error fetching premium prediction:', err)
    } finally {
      setLoadingPremium(false)
    }
  }

  const downloadReport = async () => {
    try {
      const blob = await getTechnicalReport(symbol)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${symbol}_analysis_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error('Error downloading report:', err)
    }
  }

  const renderSignalBadge = (signal) => {
    const colors = {
      BUY: 'bg-green-100 text-green-700 border-green-200',
      SELL: 'bg-red-100 text-red-700 border-red-200',
      HOLD: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[signal] || colors.HOLD}`}>
        {signal}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Premium Banner */}
      {isPremium && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">👑</span>
            <div>
              <p className="font-semibold">Premium Active</p>
              <p className="text-sm text-white/80">Advanced AI predictions and reports available</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {!premiumPrediction && (
              <button
                onClick={fetchPremiumPrediction}
                disabled={loadingPremium}
                className="px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                {loadingPremium ? 'Loading...' : 'Get AI Prediction'}
              </button>
            )}
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
            >
              📄 Download Report
            </button>
          </div>
        </div>
      )}

      {/* Main Prediction Card */}
      <div className={`rounded-lg shadow-lg p-6 text-white ${
        isPremium && premiumPrediction
          ? 'bg-gradient-to-br from-purple-600 to-purple-800'
          : 'bg-gradient-to-br from-blue-600 to-blue-800'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{symbol}</h2>
            <p className="text-blue-200 mt-1">
              {isPremium && premiumPrediction ? 'Advanced AI Prediction' : 'AI-Powered Prediction'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Signal</p>
            <p className={`text-4xl font-bold ${
              (premiumPrediction?.signal || prediction?.signal) === 'BUY' ? 'text-green-300' :
                (premiumPrediction?.signal || prediction?.signal) === 'SELL' ? 'text-red-300' :
                  (premiumPrediction?.signal || prediction?.signal)?.includes('STRONG') ? 'text-yellow-300' : 'text-yellow-300'
            }`}>
              {premiumPrediction?.signal || prediction?.signal || 'HOLD'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-sm text-blue-200">Confidence</p>
            <p className="text-2xl font-bold">{premiumPrediction?.confidence || prediction?.confidence || 0}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-sm text-blue-200">Bullish Signals</p>
            <p className="text-2xl font-bold">{premiumPrediction?.bullishPercent || prediction?.bullishPercent || 0}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-sm text-blue-200">Current Price</p>
            <p className="text-2xl font-bold">${premiumPrediction?.currentPrice || prediction?.target?.current || '0.00'}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-200">Target High</p>
            <p className="text-xl font-bold text-green-300">${(premiumPrediction?.recommendation?.target1 || prediction?.target?.high)?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-blue-200">Target Low</p>
            <p className="text-xl font-bold text-red-300">${(premiumPrediction?.recommendation?.stopLoss || prediction?.target?.low)?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        {/* Premium Recommendation */}
        {premiumPrediction?.recommendation && (
          <div className="mt-6 bg-white/10 rounded-lg p-4">
            <p className="text-sm text-blue-200 mb-2">Trading Recommendation</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-blue-200">Action</p>
                <p className="font-semibold">{premiumPrediction.recommendation.action}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Entry</p>
                <p className="font-semibold">₹{premiumPrediction.recommendation.entry?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Stop Loss</p>
                <p className="font-semibold text-red-300">₹{premiumPrediction.recommendation.stopLoss?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Risk/Reward</p>
                <p className="font-semibold">{premiumPrediction.recommendation.riskReward}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Individual Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Linear Regression */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Linear Regression</h3>
            {renderSignalBadge(
              prediction?.predictions?.linear?.predictions?.[0]?.change > 0 ? 'BUY' : 'SELL'
            )}
          </div>
          <p className="text-sm text-gray-500">
            5-day price forecast based on linear trend
          </p>
          <div className="mt-3 space-y-1">
            {prediction?.predictions?.linear?.predictions?.slice(0, 3).map((pred, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>Day {pred.day}</span>
                <span className={pred.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${pred.price.toFixed(2)} ({pred.change >= 0 ? '+' : ''}{pred.change.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Moving Average */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Moving Average</h3>
            {renderSignalBadge(prediction?.predictions?.ma?.trend?.toUpperCase())}
          </div>
          <p className="text-sm text-gray-500">
            Trend analysis using EMA crossover
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Trend</span>
              <span className="font-medium">{prediction?.predictions?.ma?.trend}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">SMA 20</span>
              <span>${prediction?.predictions?.ma?.sma20?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">SMA 50</span>
              <span>${prediction?.predictions?.ma?.sma50?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Confidence</span>
              <span>{prediction?.predictions?.ma?.confidence}%</span>
            </div>
          </div>
        </div>

        {/* RSI */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">RSI</h3>
            <span className={`px-2 py-1 text-xs rounded ${
              prediction?.predictions?.rsi?.currentRSI > 70 ? 'bg-red-100 text-red-700' :
                prediction?.predictions?.rsi?.currentRSI < 30 ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
            }`}>
              {prediction?.predictions?.rsi?.currentRSI > 70 ? 'Overbought' :
                prediction?.predictions?.rsi?.currentRSI < 30 ? 'Oversold' : 'Neutral'}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Momentum oscillator (14 periods)
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">RSI Value</span>
              <span className="font-medium">{prediction?.predictions?.rsi?.currentRSI?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Signal</span>
              <span>{prediction?.predictions?.rsi?.signal}</span>
            </div>
          </div>
        </div>

        {/* MACD */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">MACD</h3>
            {renderSignalBadge(
              prediction?.predictions?.macd?.signal?.includes('bullish') ? 'BUY' :
                prediction?.predictions?.macd?.signal?.includes('bearish') ? 'SELL' : 'HOLD'
            )}
          </div>
          <p className="text-sm text-gray-500">
            Moving Average Convergence Divergence
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">MACD Line</span>
              <span>{prediction?.predictions?.macd?.macdLine?.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Signal Line</span>
              <span>{prediction?.predictions?.macd?.signalLine?.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Histogram</span>
              <span className={prediction?.predictions?.macd?.histogram >= 0 ? 'text-green-600' : 'text-red-600'}>
                {prediction?.predictions?.macd?.histogram?.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Bollinger Bands</h3>
            {renderSignalBadge(
              prediction?.predictions?.bollinger?.signal?.includes('bounce') ? 'BUY' :
                prediction?.predictions?.bollinger?.signal?.includes('pullback') ? 'SELL' : 'HOLD'
            )}
          </div>
          <p className="text-sm text-gray-500">
            Mean reversion using volatility bands
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Upper Band</span>
              <span className="text-red-600">${prediction?.predictions?.bollinger?.upper?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Middle</span>
              <span>${prediction?.predictions?.bollinger?.middle?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lower Band</span>
              <span className="text-green-600">${prediction?.predictions?.bollinger?.lower?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Volatility */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Volatility</h3>
            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
              ATR
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Average True Range analysis
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ATR</span>
              <span>{prediction?.predictions?.volatility?.atr?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ATR %</span>
              <span>{prediction?.predictions?.volatility?.atrPercent?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Signal</span>
              <span className="text-xs">{prediction?.predictions?.volatility?.signal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Signals Summary */}
      {signals && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Strategy Signals Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(signals.strategies || {}).map(([strategy, signalList]) => {
              const latestSignal = signalList?.[signalList.length - 1]
              return (
                <div key={strategy} className="p-3 rounded-lg bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 capitalize">
                    {strategy.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  {latestSignal ? (
                    <p className={`text-sm font-bold ${
                      latestSignal.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {latestSignal.type}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No signal</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Disclaimer:</strong> This prediction system is for educational purposes only.
          Stock market predictions are inherently uncertain. Always conduct your own research
          and consult with a financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  )
}

export default PredictionPanel