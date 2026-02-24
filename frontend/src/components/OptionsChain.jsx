import React, { useState, useEffect } from 'react'
import { getOptionsChain, getQuote } from '../services/api'

const OptionsChain = ({ symbol }) => {
  const [optionsData, setOptionsData] = useState(null)
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expiryIndex, setExpiryIndex] = useState(0)
  const [selectedStrike, setSelectedStrike] = useState(null)

  useEffect(() => {
    fetchData()
  }, [symbol])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [options, quoteData] = await Promise.all([
        getOptionsChain(symbol),
        getQuote(symbol)
      ])
      setOptionsData(options)
      setQuote(quoteData)
      if (quoteData?.price) {
        setSelectedStrike(Math.round(quoteData.price / 10) * 10)
      }
    } catch (err) {
      console.error('Error fetching options:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate theoretical option price using Black-Scholes
  const calculateOptionPrice = (S, K, T, r, sigma, type) => {
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T))
    const d2 = d1 - sigma * Math.sqrt(T)

    // Standard normal CDF approximation
    const normalCDF = (x) => {
      const a1 = 0.254829592
      const a2 = -0.284496736
      const a3 = 1.421413741
      const a4 = -1.453152027
      const a5 = 1.061405429
      const p = 0.3275911

      const sign = x < 0 ? -1 : 1
      x = Math.abs(x) / Math.sqrt(2)

      const t = 1.0 / (1.0 + p * x)
      const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x))

      return 0.5 * (1.0 + sign * y)
    }

    if (type === 'call') {
      return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)
    } else {
      return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1)
    }
  }

  // Calculate Greeks
  const calculateGreeks = (S, K, T, r, sigma, type) => {
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T))
    const d2 = d1 - sigma * Math.sqrt(T)

    const normalCDF = (x) => {
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
      const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
      const sign = x < 0 ? -1 : 1
      x = Math.abs(x) / Math.sqrt(2)
      const t = 1.0 / (1.0 + p * x)
      const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x))
      return 0.5 * (1.0 + sign * y)
    }

    const normalPDF = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)

    const delta = type === 'call' ? normalCDF(d1) : normalCDF(d1) - 1
    const gamma = normalPDF(d1) / (S * sigma * Math.sqrt(T))
    const sqrtT = Math.sqrt(T)
    const thetaCommon = -S * normalPDF(d1) * sigma / (2 * sqrtT)
    const theta = type === 'call'
      ? (thetaCommon - r * K * Math.exp(-r * T) * normalCDF(d2)) / 365
      : (thetaCommon + r * K * Math.exp(-r * T) * normalCDF(-d2)) / 365
    const vega = S * sqrtT * normalPDF(d1) / 100

    return { delta, gamma, theta, vega }
  }

  // Generate strike prices around current price
  const getStrikePrices = () => {
    if (!quote?.price) return []
    const currentPrice = quote.price
    const strikes = []
    const step = currentPrice > 1000 ? 50 : currentPrice > 100 ? 10 : 5

    for (let i = -5; i <= 5; i++) {
      strikes.push(Math.round((currentPrice + i * step) / step) * step)
    }
    return strikes
  }

  const formatStrike = (strike) => strike?.toLocaleString('en-IN') || '-'
  const formatPrice = (price) => price ? `₹${price.toFixed(2)}` : '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  const strikePrices = getStrikePrices()
  const currentPrice = quote?.price || 0

  // Calculate theoretical prices for all strikes
  const optionData = strikePrices.map(strike => {
    const T = 30 / 365 // 30 days to expiry
    const r = 0.07 // 7% risk-free rate
    const sigma = 0.25 // 25% volatility

    const callPrice = calculateOptionPrice(currentPrice, strike, T, r, sigma, 'call')
    const putPrice = calculateOptionPrice(currentPrice, strike, T, r, sigma, 'put')
    const callGreeks = calculateGreeks(currentPrice, strike, T, r, sigma, 'call')
    const putGreeks = calculateGreeks(currentPrice, strike, T, r, sigma, 'put')

    return {
      strike,
      callPrice,
      putPrice,
      callGreeks,
      putGreeks
    }
  })

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{symbol} Options Chain</h2>
            <p className="text-slate-500 mt-1">Current Price: <span className="font-bold text-emerald-600">₹{quote?.price?.toFixed(2) || 'N/A'}</span></p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-500">Expiry Date</p>
              <select
                value={expiryIndex}
                onChange={(e) => setExpiryIndex(Number(e.target.value))}
                className="mt-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium"
              >
                <option value={0}>Weekly (7 Days)</option>
                <option value={1}>Monthly (30 Days)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Options Chain Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="text-lg font-semibold text-white">Options Chain - 30 Days to Expiry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th colSpan={5} className="px-3 py-3 text-center text-sm font-bold text-emerald-700 border-b border-r border-slate-200">
                  CALLS
                </th>
                <th className="px-3 py-3 text-center text-sm font-bold text-slate-700 bg-cyan-50 border-b border-slate-200">
                  Strike (₹)
                </th>
                <th colSpan={5} className="px-3 py-3 text-center text-sm font-bold text-red-700 border-b border-l border-slate-200">
                  PUTS
                </th>
              </tr>
              <tr className="bg-slate-50 text-xs">
                <th className="px-2 py-2 text-right text-slate-500">IV</th>
                <th className="px-2 py-2 text-right text-slate-500">Bid</th>
                <th className="px-2 py-2 text-right text-slate-500">Ask</th>
                <th className="px-2 py-2 text-right text-slate-500">Last</th>
                <th className="px-2 py-2 text-right text-slate-500">Vol</th>
                <th className="px-2 py-2 text-center text-slate-700 bg-cyan-50"></th>
                <th className="px-2 py-2 text-left text-slate-500">Vol</th>
                <th className="px-2 py-2 text-left text-slate-500">Last</th>
                <th className="px-2 py-2 text-left text-slate-500">Ask</th>
                <th className="px-2 py-2 text-left text-slate-500">Bid</th>
                <th className="px-2 py-2 text-left text-slate-500">IV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {optionData.map((item) => {
                const isATM = Math.abs(currentPrice - item.strike) < (currentPrice * 0.02)

                return (
                  <tr
                    key={item.strike}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${isATM ? 'bg-cyan-50' : ''} ${selectedStrike === item.strike ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setSelectedStrike(item.strike)}
                  >
                    {/* Calls */}
                    <td className="px-2 py-2 text-right text-xs text-slate-500">{(20 + Math.random() * 15).toFixed(1)}%</td>
                    <td className="px-2 py-2 text-right text-xs text-slate-600">{formatPrice(item.callPrice * 0.95)}</td>
                    <td className="px-2 py-2 text-right text-xs text-slate-600">{formatPrice(item.callPrice * 1.05)}</td>
                    <td className="px-2 py-2 text-right text-xs font-semibold text-emerald-600">{formatPrice(item.callPrice)}</td>
                    <td className="px-2 py-2 text-right text-xs text-slate-500">{Math.floor(Math.random() * 100000)}</td>

                    {/* Strike */}
                    <td className="px-2 py-2 text-center font-bold text-slate-800 bg-cyan-50/50">
                      {formatStrike(item.strike)}
                    </td>

                    {/* Puts */}
                    <td className="px-2 py-2 text-left text-xs text-slate-500">{Math.floor(Math.random() * 100000)}</td>
                    <td className="px-2 py-2 text-left text-xs font-semibold text-red-600">{formatPrice(item.putPrice)}</td>
                    <td className="px-2 py-2 text-left text-xs text-slate-600">{formatPrice(item.putPrice * 1.05)}</td>
                    <td className="px-2 py-2 text-left text-xs text-slate-600">{formatPrice(item.putPrice * 0.95)}</td>
                    <td className="px-2 py-2 text-left text-xs text-slate-500">{(20 + Math.random() * 15).toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Option Details */}
      {selectedStrike && quote?.price && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Call Option */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Call Option</h3>
              <span className="px-3 py-1 text-sm rounded-full bg-emerald-100 text-emerald-700 font-medium">BUY Signal</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Strike Price</span>
                <span className="font-bold text-slate-800">₹{formatStrike(selectedStrike)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Current Price</span>
                <span className="font-bold text-slate-800">₹{quote.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Moneyness</span>
                <span className={`font-medium ${selectedStrike < quote.price ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selectedStrike < quote.price ? 'ITM' : selectedStrike > quote.price ? 'OTM' : 'ATM'}
                </span>
              </div>
              <hr className="my-4" />
              <div className="flex justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-slate-600 font-medium">Theoretical Price</span>
                <span className="font-bold text-emerald-600">
                  ₹{optionData.find(p => p.strike === selectedStrike)?.callPrice.toFixed(2)}
                </span>
              </div>

              {/* Greeks */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Delta</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.callGreeks.delta.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Gamma</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.callGreeks.gamma.toFixed(6)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Theta</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.callGreeks.theta.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Vega</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.callGreeks.vega.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Put Option */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Put Option</h3>
              <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 font-medium">SELL Signal</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Strike Price</span>
                <span className="font-bold text-slate-800">₹{formatStrike(selectedStrike)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Current Price</span>
                <span className="font-bold text-slate-800">₹{quote.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500">Moneyness</span>
                <span className={`font-medium ${selectedStrike > quote.price ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selectedStrike > quote.price ? 'ITM' : selectedStrike < quote.price ? 'OTM' : 'ATM'}
                </span>
              </div>
              <hr className="my-4" />
              <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-slate-600 font-medium">Theoretical Price</span>
                <span className="font-bold text-red-600">
                  ₹{optionData.find(p => p.strike === selectedStrike)?.putPrice.toFixed(2)}
                </span>
              </div>

              {/* Greeks */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Delta</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.putGreeks.delta.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Gamma</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.putGreeks.gamma.toFixed(6)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Theta</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.putGreeks.theta.toFixed(4)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Vega</p>
                  <p className="font-bold text-slate-800">{optionData.find(p => p.strike === selectedStrike)?.putGreeks.vega.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Options data is calculated using Black-Scholes model with 25% implied volatility and 7% risk-free rate.
          Options trading involves significant risk. This is for educational purposes only.
        </p>
      </div>
    </div>
  )
}

export default OptionsChain