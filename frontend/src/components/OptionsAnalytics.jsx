import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { getQuote, getOptionsChain, getHistoricalData } from '../services/api'

const OptionsAnalytics = () => {
  const [activeTab, setActiveTab] = useState('scanner')
  const [symbol, setSymbol] = useState('NIFTY')
  const [underlyingPrice, setUnderlyingPrice] = useState(22500)
  const [optionChain, setOptionChain] = useState(null)
  const [loading, setLoading] = useState(false)

  // Position tracker state
  const [positions, setPositions] = useState([
    { id: 1, symbol: 'NIFTY', type: 'buy', optionType: 'call', strike: 22600, premium: 150, quantity: 1, entryDate: '2024-01-15' },
    { id: 2, symbol: 'NIFTY', type: 'buy', optionType: 'put', strike: 22400, premium: 120, quantity: 1, entryDate: '2024-01-15' },
  ])

  const niftyStocks = [
    { symbol: 'NIFTY', name: 'Nifty 50', lotSize: 75 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', lotSize: 25 },
    { symbol: 'RELIANCE.NS', name: 'Reliance', lotSize: 500 },
    { symbol: 'TCS.NS', name: 'TCS', lotSize: 300 },
    { symbol: 'INFY.NS', name: 'Infosys', lotSize: 400 },
  ]

  useEffect(() => {
    fetchData()
  }, [symbol])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quote, chain] = await Promise.all([
        getQuote(symbol),
        getOptionsChain(symbol)
      ])
      setUnderlyingPrice(quote.price || 22000)
      setOptionChain(chain)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ======== OPTIONS SCANNER ========
  const scannerResults = useMemo(() => {
    if (!optionChain) return []

    const results = []
    const atmStrike = Math.round(underlyingPrice / 50) * 50

    // Scan for various opportunities
    const strikes = optionChain.strikes?.slice(0, 15) || []
    strikes.forEach(strike => {
      const call = optionChain.calls?.find(c => c.strike === strike)
      const put = optionChain.puts?.find(p => p.strike === strike)

      if (call && put) {
        const intrinsic = Math.abs(underlyingPrice - strike)
        const extrinsicCall = call.lastPrice - intrinsic
        const extrinsicPut = put.lastPrice - intrinsic
        const totalExtrinsic = extrinsicCall + extrinsicPut

        // Check for arbitrage (straddle cheap)
        if (totalExtrinsic < underlyingPrice * 0.02) {
          results.push({
            strike,
            type: 'Cheap Straddle',
            signal: 'BUY',
            score: 85,
            reason: 'Low extrinsic value - theta gain',
            callPremium: call.lastPrice,
            putPremium: put.lastPrice,
            totalPremium: call.lastPrice + put.lastPrice
          })
        }

        // High OI buildup detection
        if (call.openInterest > 1000000) {
          results.push({
            strike,
            type: 'Call OI Buildup',
            signal: call.bid > call.ask * 0.9 ? 'BUY' : 'SELL',
            score: 75,
            reason: 'Strong institutional interest',
            oi: call.openInterest,
            volume: call.volume
          })
        }

        if (put.openInterest > 1000000) {
          results.push({
            strike,
            type: 'Put OI Buildup',
            signal: put.bid > put.ask * 0.9 ? 'BUY' : 'SELL',
            score: 75,
            reason: 'Heavy put support',
            oi: put.openInterest,
            volume: put.volume
          })
        }

        // IV comparison
        const ivDiff = Math.abs((call.impliedVolatility || 0.25) - (put.impliedVolatility || 0.25))
        if (ivDiff > 0.1) {
          results.push({
            strike,
            type: 'IV Skew',
            signal: call.impliedVolatility > put.impliedVolatility ? 'BUY PUT' : 'BUY CALL',
            score: 60,
            reason: call.impliedVolatility > put.impliedVolatility ? 'Calls expensive - buy puts' : 'Puts expensive - buy calls',
            callIV: call.impliedVolatility,
            putIV: put.impliedVolatility
          })
        }
      }
    })

    // Add some artificial opportunities for demo
    results.push(
      { strike: atmStrike - 200, type: 'Support Level', signal: 'BUY PUT', score: 80, reason: 'Strong support zone', oi: 2500000 },
      { strike: atmStrike + 200, type: 'Resistance Level', signal: 'BUY CALL', score: 80, reason: 'Resistance breakout', oi: 2200000 },
    )

    return results.sort((a, b) => b.score - a.score).slice(0, 10)
  }, [optionChain, underlyingPrice])

  // ======== VOLATILITY ANALYZER ========
  const volatilityAnalysis = useMemo(() => {
    if (!optionChain) return null

    const calls = optionChain.calls || []
    const puts = optionChain.puts || []

    const callIVs = calls.map(c => c.impliedVolatility || 0.2).filter(Boolean)
    const putIVs = puts.map(p => p.impliedVolatility || 0.2).filter(Boolean)

    const avgCallIV = callIVs.length ? callIVs.reduce((a, b) => a + b, 0) / callIVs.length : 0.2
    const avgPutIV = putIVs.length ? putIVs.reduce((a, b) => a + b, 0) / putIVs.length : 0.2
    const avgIV = (avgCallIV + avgPutIV) / 2

    // Historical volatility (simulated - would need real data)
    const historicalVol = 0.15

    // IV Rank (simplified)
    const ivRank = Math.min(100, Math.max(0, (avgIV / 0.3) * 100))
    const ivPercentile = Math.min(100, Math.max(0, (avgIV - 0.1) / 0.25 * 100))

    // IV Crush analysis (earnings, events)
    const ivCrushRisk = avgIV > 0.25 ? 'HIGH' : avgIV > 0.18 ? 'MEDIUM' : 'LOW'

    return {
      avgCallIV: (avgCallIV * 100).toFixed(1),
      avgPutIV: (avgPutIV * 100).toFixed(1),
      ivRank: ivRank.toFixed(0),
      ivPercentile: ivPercentile.toFixed(0),
      ivCrushRisk,
      historicalVol: (historicalVol * 100).toFixed(1),
      premiumToIV: ((avgIV - historicalVol) * 100).toFixed(1),
      recommendation: ivRank > 70 ? 'SELL VOLATILITY' : ivRank < 30 ? 'BUY VOLATILITY' : 'NEUTRAL'
    }
  }, [optionChain])

  // ======== RISK ANALYZER ========
  const riskAnalysis = useMemo(() => {
    const lotSize = niftyStocks.find(s => s.symbol === symbol)?.lotSize || 75

    let totalPremium = 0
    let maxLoss = 0
    let maxProfit = 0

    positions.forEach(pos => {
      const qty = pos.quantity * lotSize
      const premiumPaid = pos.premium * qty
      totalPremium += pos.type === 'buy' ? premiumPaid : -premiumPaid

      if (pos.type === 'buy') {
        maxLoss -= premiumPaid
        maxProfit += (pos.optionType === 'call' ? 10000 : pos.strike) * qty
      } else {
        maxProfit += premiumPaid
        maxLoss -= (pos.optionType === 'call' ? 10000 : pos.strike) * qty
      }
    })

    // Stress test scenarios
    const scenarios = [
      { move: -10, label: '-10%', pnl: totalPremium * -0.5 },
      { move: -5, label: '-5%', pnl: totalPremium * -0.25 },
      { move: 0, label: '0%', pnl: 0 },
      { move: 5, label: '+5%', pnl: totalPremium * 0.25 },
      { move: 10, label: '+10%', pnl: totalPremium * 0.5 },
    ]

    return {
      totalPremium: Math.abs(totalPremium),
      maxProfit: maxProfit > 100000 ? 'Unlimited' : `₹${maxProfit.toLocaleString()}`,
      maxLoss: Math.abs(maxLoss) > 100000 ? 'Unlimited' : `₹${Math.abs(maxLoss).toLocaleString()}`,
      riskReward: maxLoss > 0 ? (maxProfit / Math.abs(maxLoss)).toFixed(2) : 'N/A',
      scenarios,
      marginRequired: totalPremium * 1.2,
      portfolioBeta: 1.2
    }
  }, [positions, symbol])

  // ======== EXPIRY ANALYSIS ========
  const expiryAnalysis = useMemo(() => {
    const daysToExpiry = [7, 14, 21, 28, 35]
    const thetaDecay = []

    daysToExpiry.forEach(days => {
      const decay = Math.pow(0.95, days) * 100
      thetaDecay.push({
        days,
        thetaRemaining: decay.toFixed(1),
        decayRate: (100 - decay).toFixed(1)
      })
    })

    return thetaDecay
  }, [])

  // ======== POSITION TRACKER ========
  const positionMetrics = useMemo(() => {
    const lotSize = niftyStocks.find(s => s.symbol === symbol)?.lotSize || 75
    const currentValue = positions.reduce((sum, pos) => {
      // Simulate current premium (would be real in production)
      const currentPremium = pos.premium * (1 + (Math.random() - 0.5) * 0.3)
      return sum + currentPremium * pos.quantity * lotSize
    }, 0)

    const entryValue = positions.reduce((sum, pos) => {
      return sum + pos.premium * pos.quantity * lotSize
    }, 0)

    const pnl = currentValue - entryValue
    const pnlPercent = entryValue > 0 ? (pnl / entryValue * 100) : 0

    return {
      currentValue,
      entryValue,
      pnl,
      pnlPercent,
      positionCount: positions.length
    }
  }, [positions, symbol])

  const addPosition = () => {
    const newPos = {
      id: Date.now(),
      symbol,
      type: 'buy',
      optionType: 'call',
      strike: underlyingPrice,
      premium: 100,
      quantity: 1,
      entryDate: new Date().toISOString().split('T')[0]
    }
    setPositions([...positions, newPos])
  }

  const removePosition = (id) => {
    setPositions(positions.filter(p => p.id !== id))
  }

  const pieData = [
    { name: 'Calls', value: positions.filter(p => p.optionType === 'call').length * 50 },
    { name: 'Puts', value: positions.filter(p => p.optionType === 'put').length * 50 },
  ]
  const COLORS = ['#10b981', '#ef4444']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Options Analytics Pro</h2>
            <p className="text-slate-300 text-sm">Advanced options analysis & position management</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-2 text-sm"
            >
              {niftyStocks.map(s => (
                <option key={s.symbol} value={s.symbol} className="text-slate-800">{s.name}</option>
              ))}
            </select>
            <div className="bg-white/20 px-4 py-2 rounded-lg">
              <p className="text-xs text-slate-300">Underlying</p>
              <p className="font-bold">₹{underlyingPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {[
            { id: 'scanner', label: '🔍 Scanner', color: 'from-blue-500 to-cyan' },
            { id: 'volatility', label: '📊 Volatility', color: 'from-purple-500 to-pink' },
            { id: 'risk', label: '⚠️ Risk', color: 'from-red-500 to-orange' },
            { id: 'expiry', label: '📅 Expiry', color: 'from-amber-500 to-yellow' },
            { id: 'positions', label: '💼 Positions', color: 'from-emerald-500 to-teal' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white`
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Scanner Results */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">🎯 Opportunity Scanner</h3>

              {scannerResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Scanning for opportunities...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {scannerResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border-l-4 ${
                        result.signal.includes('BUY') ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">₹{result.strike}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              result.signal.includes('BUY') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.signal}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{result.type}</p>
                          <p className="text-xs text-slate-500">{result.reason}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-800">{result.score}</div>
                          <p className="text-xs text-slate-500">Score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OI Analysis Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">📈 Open Interest Analysis</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={optionChain?.calls?.slice(0, 10).map((c, i) => ({
                  strike: c.strike,
                  callOI: c.openInterest || 0,
                  putOI: optionChain.puts?.[i]?.openInterest || 0
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="callOI" fill="#10b981" name="Call OI" />
                  <Bar dataKey="putOI" fill="#ef4444" name="Put OI" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2 text-center">Call OI (Green) vs Put OI (Red)</p>
            </div>
          </div>
        </div>
      )}

      {/* Volatility Tab */}
      {activeTab === 'volatility' && volatilityAnalysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
              <p className="text-blue-100 text-sm">IV Rank</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.ivRank}%</p>
              <p className="text-xs text-blue-200">{volatilityAnalysis.recommendation}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
              <p className="text-purple-100 text-sm">IV Percentile</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.ivPercentile}%</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
              <p className="text-amber-100 text-sm">Avg Call IV</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.avgCallIV}%</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-4 text-white">
              <p className="text-emerald-100 text-sm">Historical Vol</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.historicalVol}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">IV Analysis</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">IV Crush Risk</span>
                  <span className={`px-3 py-1 rounded-full font-medium ${
                    volatilityAnalysis.ivCrushRisk === 'HIGH' ? 'bg-red-100 text-red-700' :
                    volatilityAnalysis.ivCrushRisk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {volatilityAnalysis.ivCrushRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Premium vs IV</span>
                  <span className="font-bold text-slate-800">{volatilityAnalysis.premiumToIV}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Avg Put IV</span>
                  <span className="font-bold text-slate-800">{volatilityAnalysis.avgPutIV}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">IV vs Historical Vol</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { month: 'Jan', iv: 18, hv: 15 },
                  { month: 'Feb', iv: 22, hv: 16 },
                  { month: 'Mar', iv: 28, hv: 18 },
                  { month: 'Apr', iv: 24, hv: 17 },
                  { month: 'May', iv: 20, hv: 14 },
                  { month: 'Jun', iv: 18, hv: 15 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="iv" stroke="#8b5cf6" strokeWidth={2} name="IV" />
                  <Line type="monotone" dataKey="hv" stroke="#10b981" strokeWidth={2} name="HV" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2 text-center">Purple = Implied Vol | Green = Historical Vol</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Tab */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Max Profit</p>
              <p className="text-xl font-bold text-green-600">{riskAnalysis.maxProfit}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Max Loss</p>
              <p className="text-xl font-bold text-red-600">{riskAnalysis.maxLoss}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Risk/Reward</p>
              <p className="text-xl font-bold text-slate-800">{riskAnalysis.riskReward}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Margin Req.</p>
              <p className="text-xl font-bold text-slate-800">₹{riskAnalysis.marginRequired.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Stress Test Scenarios</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskAnalysis.scenarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                  <Bar dataKey="pnl" fill="#6366f1" name="P/L" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Portfolio Risk</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Portfolio Beta</span>
                    <span className="font-bold">{riskAnalysis.portfolioBeta}</span>
                  </div>
                  <p className="text-xs text-slate-500">Market sensitivity</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Delta Exposure</span>
                    <span className="font-bold">+125</span>
                  </div>
                  <p className="text-xs text-slate-500">Directional risk</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Vega Exposure</span>
                    <span className="font-bold">+450</span>
                  </div>
                  <p className="text-xs text-slate-500">Volatility risk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Tab */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Theta Decay Analysis</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={expiryAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="days" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="thetaRemaining"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2 text-center">Premium remaining by days to expiry</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Theta Breakdown</h3>
              <div className="space-y-2">
                {expiryAnalysis.map(exp => (
                  <div key={exp.days} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{exp.days} Days</p>
                      <p className="text-xs text-slate-500">{exp.decayRate}% decayed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-600">{exp.thetaRemaining}%</p>
                      <p className="text-xs text-slate-500">remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Positions</p>
              <p className="text-2xl font-bold">{positionMetrics.positionCount}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Entry Value</p>
              <p className="text-2xl font-bold">₹{positionMetrics.entryValue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Current Value</p>
              <p className="text-2xl font-bold">₹{positionMetrics.currentValue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">P&L</p>
              <p className={`text-2xl font-bold ${positionMetrics.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {positionMetrics.pnl >= 0 ? '+' : ''}₹{positionMetrics.pnl.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-500">Return %</p>
              <p className={`text-2xl font-bold ${positionMetrics.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {positionMetrics.pnlPercent >= 0 ? '+' : ''}{positionMetrics.pnlPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Position List */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Active Positions</h3>
                <button
                  onClick={addPosition}
                  className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
                >
                  + Add Position
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Strike</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Prem</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Value</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {positions.map(pos => (
                      <tr key={pos.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            pos.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {pos.type.toUpperCase()} {pos.optionType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">₹{pos.strike}</td>
                        <td className="px-3 py-2">₹{pos.premium}</td>
                        <td className="px-3 py-2">{pos.quantity}</td>
                        <td className="px-3 py-2">₹{(pos.premium * pos.quantity * 75).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removePosition(pos.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Position Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 mb-3">Position Distribution</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-slate-100 rounded-lg p-3">
        <p className="text-xs text-slate-500">
          <strong>Note:</strong> This is an educational tool. Options data is simulated. Always verify with your broker.
        </p>
      </div>
    </div>
  )
}

export default OptionsAnalytics