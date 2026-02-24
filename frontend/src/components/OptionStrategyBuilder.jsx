import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart } from 'recharts'
import { getQuote, getOptionsChain } from '../services/api'

const OptionStrategyBuilder = () => {
  const [symbol, setSymbol] = useState('NIFTY')
  const [underlyingPrice, setUnderlyingPrice] = useState(22500)
  const [loading, setLoading] = useState(false)
  const [optionChain, setOptionChain] = useState(null)
  const [legs, setLegs] = useState([])
  const [expiry, setExpiry] = useState(null)
  const [showGreeks, setShowGreeks] = useState(true)

  const niftyStocks = [
    { symbol: 'NIFTY', name: 'Nifty 50', lotSize: 75 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', lotSize: 25 },
    { symbol: 'NIFTYY', name: 'Nifty IT', lotSize: 50 },
    { symbol: 'FINNIFTY', name: 'Fin Nifty', lotSize: 50 },
    { symbol: 'RELIANCE.NS', name: 'Reliance', lotSize: 500 },
    { symbol: 'TCS.NS', name: 'TCS', lotSize: 300 },
    { symbol: 'INFY.NS', name: 'Infosys', lotSize: 400 },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', lotSize: 500 },
  ]

  useEffect(() => {
    const selected = niftyStocks.find(s => s.symbol === symbol)
    if (selected) {
      fetchUnderlyingPrice(selected.symbol)
    }
  }, [symbol])

  useEffect(() => {
    if (underlyingPrice) {
      fetchOptionChain()
    }
  }, [symbol])

  const fetchUnderlyingPrice = async (sym) => {
    try {
      const quote = await getQuote(sym)
      setUnderlyingPrice(quote.price || 22000)
    } catch (err) {
      console.error('Error fetching price:', err)
    }
  }

  const fetchOptionChain = async () => {
    try {
      setLoading(true)
      const chain = await getOptionsChain(symbol)
      setOptionChain(chain)
      if (chain.expirationDates?.length > 0 && !expiry) {
        setExpiry(chain.expirationDates[0])
      }
    } catch (err) {
      console.error('Error fetching option chain:', err)
    } finally {
      setLoading(false)
    }
  }

  const addLeg = (type, strike, optionType) => {
    const newLeg = {
      id: Date.now(),
      type, // 'buy' or 'sell'
      strike,
      optionType, // 'call' or 'put'
      quantity: 1,
      premium: getPremiumForStrike(strike, optionType),
    }
    setLegs([...legs, newLeg])
  }

  const removeLeg = (legId) => {
    setLegs(legs.filter(l => l.id !== legId))
  }

  const updateLeg = (legId, field, value) => {
    setLegs(legs.map(l => l.id === legId ? { ...l, [field]: value } : l))
  }

  const getPremiumForStrike = (strike, optionType) => {
    if (!optionChain) return 50

    const options = optionType === 'call' ? optionChain.calls : optionChain.puts
    const found = options?.find(o => o.strike === strike)
    return found?.lastPrice || Math.abs(underlyingPrice - strike) * 0.5 + 20
  }

  const lotSize = niftyStocks.find(s => s.symbol === symbol)?.lotSize || 75

  // Calculate payoff data
  const payoffData = useMemo(() => {
    if (legs.length === 0) return []

    const range = underlyingPrice * 0.3
    const minPrice = Math.floor(underlyingPrice - range)
    const maxPrice = Math.ceil(underlyingPrice + range)
    const points = []

    for (let price = minPrice; price <= maxPrice; price += 50) {
      let totalProfit = 0

      legs.forEach(leg => {
        const qty = leg.quantity * lotSize
        let legProfit = 0

        if (leg.optionType === 'call') {
          const intrinsic = Math.max(0, price - leg.strike)
          const payoff = intrinsic - leg.premium
          legProfit = leg.type === 'buy' ? payoff * qty : -payoff * qty
        } else {
          const intrinsic = Math.max(0, leg.strike - price)
          const payoff = intrinsic - leg.premium
          legProfit = leg.type === 'buy' ? payoff * qty : -payoff * qty
        }

        totalProfit += legProfit
      })

      points.push({
        price,
        profit: totalProfit,
        breakeven: totalProfit === 0 ? price : null
      })
    }

    return points
  }, [legs, underlyingPrice, lotSize])

  // Calculate max profit/loss
  const analysis = useMemo(() => {
    if (legs.length === 0) return null

    const profits = payoffData.map(p => p.profit)
    const maxProfit = Math.max(...profits)
    const maxLoss = Math.min(...profits)

    // Find breakeven points
    let breakevens = []
    for (let i = 1; i < payoffData.length; i++) {
      if ((payoffData[i-1].profit < 0 && payoffData[i].profit >= 0) ||
          (payoffData[i-1].profit >= 0 && payoffData[i].profit < 0)) {
        breakevens.push(payoffData[i].price)
      }
    }

    // Calculate net premium
    const netPremium = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      const premium = leg.premium * qty
      return leg.type === 'buy' ? sum - premium : sum + premium
    }, 0)

    // Calculate Greeks (simplified)
    const netDelta = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      const isITM = leg.optionType === 'call'
        ? underlyingPrice > leg.strike
        : underlyingPrice < leg.strike
      const delta = isITM ? 0.5 : 0.3
      return sum + (leg.type === 'buy' ? delta : -delta) * qty * 0.01
    }, 0)

    const netGamma = legs.reduce((sum, leg) => {
      return sum + (leg.type === 'buy' ? 0.02 : -0.02) * leg.quantity * lotSize
    }, 0)

    const netTheta = legs.reduce((sum, leg) => {
      return sum + (leg.type === 'buy' ? -5 : 5) * leg.quantity * lotSize
    }, 0)

    const netVega = legs.reduce((sum, leg) => {
      return sum + (leg.type === 'buy' ? 10 : -10) * leg.quantity * lotSize
    }, 0)

    return {
      maxProfit: maxProfit > 100000 ? 'Unlimited' : `₹${maxProfit.toLocaleString('en-IN')}`,
      maxLoss: maxLoss < -100000 ? 'Unlimited' : `₹${maxLoss.toLocaleString('en-IN')}`,
      breakevens,
      netPremium: `₹${netPremium.toLocaleString('en-IN')}`,
      netDelta: netDelta.toFixed(2),
      netGamma: netGamma.toFixed(2),
      netTheta: netTheta.toFixed(2),
      netVega: netVega.toFixed(2),
    }
  }, [legs, payoffData, underlyingPrice, lotSize])

  // Get strikes around ATM
  const availableStrikes = useMemo(() => {
    if (!optionChain?.strikes) {
      // Generate strikes if no option chain
      const strikes = []
      const roundedSpot = Math.round(underlyingPrice / 50) * 50
      for (let i = -10; i <= 10; i++) {
        strikes.push(roundedSpot + i * 50)
      }
      return strikes
    }
    return optionChain.strikes.slice(0, 20)
  }, [optionChain, underlyingPrice])

  const presetStrategies = [
    { name: 'Long Call', legs: [{ type: 'buy', optionType: 'call' }] },
    { name: 'Long Put', legs: [{ type: 'buy', optionType: 'put' }] },
    { name: 'Covered Call', legs: [{ type: 'sell', optionType: 'call' }] },
    { name: 'Protective Put', legs: [{ type: 'buy', optionType: 'put' }] },
    { name: 'Bull Call Spread', legs: [{ type: 'buy', optionType: 'call' }, { type: 'sell', optionType: 'call' }] },
    { name: 'Bear Put Spread', legs: [{ type: 'buy', optionType: 'put' }, { type: 'sell', optionType: 'put' }] },
    { name: 'Long Straddle', legs: [{ type: 'buy', optionType: 'call' }, { type: 'buy', optionType: 'put' }] },
    { name: 'Long Strangle', legs: [{ type: 'buy', optionType: 'call' }, { type: 'buy', optionType: 'put' }] },
    { name: 'Iron Condor', legs: [{ type: 'sell', optionType: 'put' }, { type: 'buy', optionType: 'put' }, { type: 'sell', optionType: 'call' }, { type: 'buy', optionType: 'call' }] },
    { name: 'Iron Butterfly', legs: [{ type: 'sell', optionType: 'call' }, { type: 'buy', optionType: 'call' }, { type: 'buy', optionType: 'put' }, { type: 'sell', optionType: 'put' }] },
  ]

  const applyStrategy = (strategy) => {
    const newLegs = []
    const atmStrike = Math.round(underlyingPrice / 50) * 50

    strategy.legs.forEach((legDef, idx) => {
      const strike = idx === 0 ? atmStrike : idx === 1 ? atmStrike + 100 : atmStrike - 100
      newLegs.push({
        id: Date.now() + idx,
        type: legDef.type,
        optionType: legDef.optionType,
        strike: strike,
        quantity: 1,
        premium: getPremiumForStrike(strike, legDef.optionType),
      })
    })

    setLegs(newLegs)
  }

  const clearLegs = () => setLegs([])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Option Strategy Builder</h2>
            <p className="text-emerald-200 text-sm">Build & analyze options strategies</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Symbol Selector */}
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm backdrop-blur"
            >
              {niftyStocks.map(s => (
                <option key={s.symbol} value={s.symbol} className="text-slate-800">
                  {s.name} (Lot: {s.lotSize})
                </option>
              ))}
            </select>

            {/* Underlying Price */}
            <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur">
              <p className="text-xs text-emerald-200">Underlying</p>
              <p className="font-bold">₹{underlyingPrice.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Strategies */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Quick Strategies</h3>
          <button onClick={clearLegs} className="text-sm text-red-500 hover:underline">Clear All</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {presetStrategies.map(strategy => (
            <button
              key={strategy.name}
              onClick={() => applyStrategy(strategy)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 rounded-lg text-sm font-medium transition"
            >
              {strategy.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Option Chain / Strike Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Select Strikes</h3>
          <p className="text-xs text-slate-500 mb-3">Click to add leg</p>

          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            {/* Call Strikes */}
            <div>
              <p className="text-xs font-medium text-green-600 mb-2">CALLS</p>
              {availableStrikes.map(strike => (
                <button
                  key={`call-${strike}`}
                  onClick={() => addLeg('buy', strike, 'call')}
                  className="w-full p-2 text-left hover:bg-green-50 rounded-lg border border-slate-100 mb-1 transition text-sm"
                >
                  <span className="font-medium">₹{strike}</span>
                  <span className="text-green-600 text-xs ml-2">₹{getPremiumForStrike(strike, 'call').toFixed(2)}</span>
                </button>
              ))}
            </div>

            {/* Put Strikes */}
            <div>
              <p className="text-xs font-medium text-red-600 mb-2">PUTS</p>
              {availableStrikes.map(strike => (
                <button
                  key={`put-${strike}`}
                  onClick={() => addLeg('buy', strike, 'put')}
                  className="w-full p-2 text-left hover:bg-red-50 rounded-lg border border-slate-100 mb-1 transition text-sm"
                >
                  <span className="font-medium">₹{strike}</span>
                  <span className="text-red-600 text-xs ml-2">₹{getPremiumForStrike(strike, 'put').toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Legs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Strategy Legs ({legs.length})</h3>

          {legs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-sm">Add legs from option chain</p>
            </div>
          ) : (
            <div className="space-y-2">
              {legs.map((leg, idx) => (
                <div key={leg.id} className={`p-3 rounded-lg border ${
                  leg.type === 'buy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        value={leg.type}
                        onChange={(e) => updateLeg(leg.id, 'type', e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          leg.type === 'buy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        leg.optionType === 'call' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {leg.optionType.toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-800">₹{leg.strike}</span>
                    </div>
                    <button
                      onClick={() => removeLeg(leg.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Premium</label>
                      <input
                        type="number"
                        value={leg.premium}
                        onChange={(e) => updateLeg(leg.id, 'premium', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500">Qty (Lots)</label>
                      <input
                        type="number"
                        value={leg.quantity}
                        onChange={(e) => updateLeg(leg.id, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis & Chart */}
        <div className="space-y-4">
          {/* P/L Analysis */}
          {analysis && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Strategy Analysis</h3>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Max Profit</p>
                  <p className="font-bold text-green-700">{analysis.maxProfit}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Max Loss</p>
                  <p className="font-bold text-red-700">{analysis.maxLoss}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Net Premium</p>
                  <p className="font-bold text-blue-700">{analysis.netPremium}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600">Breakeven</p>
                  <p className="font-bold text-purple-700">
                    {analysis.breakevens.length > 0 ? analysis.breakevens.map(b => `₹${b}`).join(', ') : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Greeks */}
              {showGreeks && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">GREEKS</p>
                  <div className="grid grid-cols-4 gap-1">
                    <div className="text-center p-1 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Δ</p>
                      <p className="text-sm font-bold">{analysis.netDelta}</p>
                    </div>
                    <div className="text-center p-1 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Γ</p>
                      <p className="text-sm font-bold">{analysis.netGamma}</p>
                    </div>
                    <div className="text-center p-1 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">Θ</p>
                      <p className="text-sm font-bold">{analysis.netTheta}</p>
                    </div>
                    <div className="text-center p-1 bg-slate-50 rounded">
                      <p className="text-xs text-slate-500">ν</p>
                      <p className="text-sm font-bold">{analysis.netVega}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payoff Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 mb-2">Payoff Chart</h3>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={payoffData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="price" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  labelFormatter={(val) => `Price: ₹${val}`}
                />
                <ReferenceLine y={0} stroke="#64748b" />
                <ReferenceLine x={underlyingPrice} stroke="#3b82f6" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 text-center mt-1">Blue line = Current Price (₹{underlyingPrice})</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> This is a simulation tool for educational purposes. Option prices and Greeks are approximate.
          Always verify with your broker before trading.
        </p>
      </div>
    </div>
  )
}

export default OptionStrategyBuilder