import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, Legend } from 'recharts'
import { getQuote, getOptionsChain, getHistoricalData } from '../services/api'

// ============================================
// COMPREHENSIVE OPTIONS TRADING PLATFORM
// ============================================

const OptionsTradingPlatform = () => {
  const [activeTab, setActiveTab] = useState('builder')
  const [symbol, setSymbol] = useState('NIFTY')
  const [underlyingPrice, setUnderlyingPrice] = useState(22500)
  const [optionChain, setOptionChain] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expiry, setExpiry] = useState(null)
  const [positions, setPositions] = useState([])
  const [showGreeks, setShowGreeks] = useState(true)
  const [chartType, setChartType] = useState('payoff')
  const [strategyLines, setStrategyLines] = useState({
    showBreakeven: true,
    showMaxPain: true,
    showSupport: true,
    showResistance: true,
    showTrendLine: false,
    showMA: false,
    showBollinger: false,
    customLines: []
  })
  const [trendLineStart, setTrendLineStart] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const niftyStocks = [
    { symbol: 'NIFTY', name: 'Nifty 50', lotSize: 75, exchange: 'NSE' },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', lotSize: 25, exchange: 'NSE' },
    { symbol: 'NIFTYY', name: 'Nifty IT', lotSize: 50, exchange: 'NSE' },
    { symbol: 'FINNIFTY', name: 'Fin Nifty', lotSize: 50, exchange: 'NSE' },
    { symbol: 'MIDCPNIFTY', name: 'MidCap Nifty', lotSize: 75, exchange: 'NSE' },
    { symbol: 'RELIANCE.NS', name: 'Reliance', lotSize: 500, exchange: 'NSE' },
    { symbol: 'TCS.NS', name: 'TCS', lotSize: 300, exchange: 'NSE' },
    { symbol: 'INFY.NS', name: 'Infosys', lotSize: 400, exchange: 'NSE' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', lotSize: 500, exchange: 'NSE' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', lotSize: 625, exchange: 'NSE' },
    { symbol: 'SBIN.NS', name: 'SBI Bank', lotSize: 500, exchange: 'NSE' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Bank', lotSize: 400, exchange: 'NSE' },
  ]

  // Fetch data on symbol change
  useEffect(() => {
    fetchAllData()
  }, [symbol])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [quote, chain] = await Promise.all([
        getQuote(symbol),
        getOptionsChain(symbol)
      ])
      setUnderlyingPrice(quote.price || 22000)
      setOptionChain(chain)
      if (chain.expirationDates?.length > 0) {
        setExpiry(chain.expirationDates[0])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const lotSize = niftyStocks.find(s => s.symbol === symbol)?.lotSize || 75

  // ==================== STRATEGY BUILDER ====================
  const [legs, setLegs] = useState([])

  const addLeg = useCallback((type, strike, optionType) => {
    const newLeg = {
      id: Date.now(),
      type,
      strike,
      optionType,
      quantity: 1,
      premium: getPremiumForStrike(strike, optionType),
    }
    setLegs(prev => [...prev, newLeg])
  }, [optionChain, underlyingPrice])

  const removeLeg = useCallback((legId) => {
    setLegs(prev => prev.filter(l => l.id !== legId))
  }, [])

  const updateLeg = useCallback((legId, field, value) => {
    setLegs(prev => prev.map(l => l.id === legId ? { ...l, [field]: value } : l))
  }, [])

  const getPremiumForStrike = (strike, optionType) => {
    if (!optionChain) return 50
    const options = optionType === 'call' ? optionChain.calls : optionChain.puts
    const found = options?.find(o => o.strike === strike)
    return found?.lastPrice || Math.abs(underlyingPrice - strike) * 0.5 + 20
  }

  // Preset strategies
  const presetStrategies = [
    { name: 'Long Call', desc: 'Bullish - Unlimited profit, limited loss', legs: [{ type: 'buy', optionType: 'call', offset: 0 }], color: 'green' },
    { name: 'Long Put', desc: 'Bearish - Profit from price drop', legs: [{ type: 'buy', optionType: 'put', offset: 0 }], color: 'red' },
    { name: 'Covered Call', desc: 'Neutral - Income generation', legs: [{ type: 'sell', optionType: 'call', offset: 100 }], color: 'blue' },
    { name: 'Protective Put', desc: 'Insurance - Protected downside', legs: [{ type: 'buy', optionType: 'put', offset: 0 }], color: 'purple' },
    { name: 'Bull Call Spread', desc: 'Moderate Bullish - Limited risk', legs: [{ type: 'buy', optionType: 'call', offset: -100 }, { type: 'sell', optionType: 'call', offset: 100 }], color: 'green' },
    { name: 'Bear Put Spread', desc: 'Moderate Bearish - Limited risk', legs: [{ type: 'buy', optionType: 'put', offset: 100 }, { type: 'sell', optionType: 'put', offset: -100 }], color: 'red' },
    { name: 'Bull Put Spread', desc: 'Bullish - Credit spread', legs: [{ type: 'sell', optionType: 'put', offset: -100 }, { type: 'buy', optionType: 'put', offset: -200 }], color: 'green' },
    { name: 'Bear Call Spread', desc: 'Bearish - Credit spread', legs: [{ type: 'sell', optionType: 'call', offset: 100 }, { type: 'buy', optionType: 'call', offset: 200 }], color: 'red' },
    { name: 'Long Straddle', desc: 'High Volatility - Big move any direction', legs: [{ type: 'buy', optionType: 'call', offset: 0 }, { type: 'buy', optionType: 'put', offset: 0 }], color: 'purple' },
    { name: 'Long Strangle', desc: 'Very High Volatility - Cheaper than straddle', legs: [{ type: 'buy', optionType: 'call', offset: 100 }, { type: 'buy', optionType: 'put', offset: -100 }], color: 'purple' },
    { name: 'Short Straddle', desc: 'Low Volatility - Sell volatility', legs: [{ type: 'sell', optionType: 'call', offset: 0 }, { type: 'sell', optionType: 'put', offset: 0 }], color: 'orange' },
    { name: 'Short Strangle', desc: 'Range Bound - Sell volatility', legs: [{ type: 'sell', optionType: 'call', offset: 100 }, { type: 'sell', optionType: 'put', offset: -100 }], color: 'orange' },
    { name: 'Iron Condor', desc: 'Range Bound - Profit in consolidation', legs: [{ type: 'sell', optionType: 'put', offset: -100 }, { type: 'buy', optionType: 'put', offset: -200 }, { type: 'sell', optionType: 'call', offset: 100 }, { type: 'buy', optionType: 'call', offset: 200 }], color: 'blue' },
    { name: 'Iron Butterfly', desc: 'Neutral - Max profit at ATM', legs: [{ type: 'sell', optionType: 'put', offset: 0 }, { type: 'buy', optionType: 'put', offset: -100 }, { type: 'buy', optionType: 'call', offset: 100 }, { type: 'sell', optionType: 'call', offset: 0 }], color: 'indigo' },
    { name: 'Jade Lizard', desc: 'Bullish - No downside risk', legs: [{ type: 'sell', optionType: 'put', offset: -100 }, { type: 'sell', optionType: 'call', offset: 100 }, { type: 'buy', optionType: 'call', offset: 200 }], color: 'green' },
    { name: 'Reverse Iron Condor', desc: 'Volatile - Profit from big move', legs: [{ type: 'buy', optionType: 'put', offset: -200 }, { type: 'sell', optionType: 'put', offset: -100 }, { type: 'sell', optionType: 'call', offset: 100 }, { type: 'buy', optionType: 'call', offset: 200 }], color: 'pink' },
  ]

  const applyStrategy = (strategy) => {
    const newLegs = []
    const atmStrike = Math.round(underlyingPrice / 50) * 50

    strategy.legs.forEach((legDef, idx) => {
      const strike = atmStrike + legDef.offset
      newLegs.push({
        id: Date.now() + idx,
        type: legDef.type,
        optionType: legDef.optionType,
        strike,
        quantity: 1,
        premium: getPremiumForStrike(strike, legDef.optionType),
      })
    })

    setLegs(newLegs)
  }

  const clearLegs = () => setLegs([])

  // Calculate payoff data
  const payoffData = useMemo(() => {
    if (legs.length === 0) return []

    const range = underlyingPrice * 0.25
    const minPrice = Math.floor(underlyingPrice - range)
    const maxPrice = Math.ceil(underlyingPrice + range)
    const points = []

    for (let price = minPrice; price <= maxPrice; price += 25) {
      let totalProfit = 0
      let legDetails = []

      legs.forEach(leg => {
        const qty = leg.quantity * lotSize
        let legProfit = 0
        let intrinsic = 0

        if (leg.optionType === 'call') {
          intrinsic = Math.max(0, price - leg.strike)
        } else {
          intrinsic = Math.max(0, leg.strike - price)
        }

        const payoff = intrinsic - leg.premium
        legProfit = leg.type === 'buy' ? payoff * qty : -payoff * qty
        totalProfit += legProfit

        legDetails.push({
          strike: leg.strike,
          type: leg.type,
          optionType: leg.optionType,
          profit: legProfit
        })
      })

      points.push({
        price,
        profit: totalProfit,
        legDetails
      })
    }

    return points
  }, [legs, underlyingPrice, lotSize])

  // Strategy analysis
  const analysis = useMemo(() => {
    if (legs.length === 0) return null

    const profits = payoffData.map(p => p.profit)
    const maxProfit = Math.max(...profits)
    const maxLoss = Math.min(...profits)

    let breakevens = []
    for (let i = 1; i < payoffData.length; i++) {
      if ((payoffData[i-1].profit < 0 && payoffData[i].profit >= 0) ||
          (payoffData[i-1].profit >= 0 && payoffData[i].profit < 0)) {
        breakevens.push(payoffData[i].price)
      }
    }

    const netPremium = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      return leg.type === 'buy' ? sum - (leg.premium * qty) : sum + (leg.premium * qty)
    }, 0)

    // Greeks calculation
    const netDelta = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      const isITM = leg.optionType === 'call' ? underlyingPrice > leg.strike : underlyingPrice < leg.strike
      const isATM = Math.abs(underlyingPrice - leg.strike) < 50
      let delta = 0.5
      if (isITM) delta = 0.7
      if (isATM) delta = 0.5
      return sum + (leg.type === 'buy' ? delta : -delta) * qty * 0.01
    }, 0)

    const netGamma = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      return sum + (leg.type === 'buy' ? 0.02 : -0.02) * qty
    }, 0)

    const netTheta = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      return sum + (leg.type === 'buy' ? -8 : 8) * qty
    }, 0)

    const netVega = legs.reduce((sum, leg) => {
      const qty = leg.quantity * lotSize
      return sum + (leg.type === 'buy' ? 15 : -15) * qty
    }, 0)

    return {
      maxProfit: maxProfit > 100000 ? 'Unlimited' : `₹${Math.round(maxProfit).toLocaleString('en-IN')}`,
      maxLoss: maxLoss < -100000 ? 'Unlimited' : `₹${Math.round(Math.abs(maxLoss)).toLocaleString('en-IN')}`,
      breakevens,
      netPremium: Math.round(netPremium),
      netDelta: netDelta.toFixed(2),
      netGamma: netGamma.toFixed(2),
      netTheta: netTheta.toFixed(2),
      netVega: netVega.toFixed(2),
      cost: legs.reduce((sum, leg) => sum + leg.premium * leg.quantity * lotSize, 0),
      premiumReceived: legs.filter(l => l.type === 'sell').reduce((sum, leg) => sum + leg.premium * leg.quantity * lotSize, 0),
      premiumPaid: legs.filter(l => l.type === 'buy').reduce((sum, leg) => sum + leg.premium * leg.quantity * lotSize, 0),
    }
  }, [legs, payoffData, underlyingPrice, lotSize])

  // Generate strikes
  const availableStrikes = useMemo(() => {
    if (!optionChain?.strikes) {
      const strikes = []
      const roundedSpot = Math.round(underlyingPrice / 50) * 50
      for (let i = -15; i <= 15; i++) {
        strikes.push(roundedSpot + i * 50)
      }
      return strikes
    }
    return optionChain.strikes
  }, [optionChain, underlyingPrice])

  // ==================== PCR ANALYSIS ====================
  const pcrAnalysis = useMemo(() => {
    if (!optionChain) return null

    const totalCallOI = optionChain.calls?.reduce((sum, c) => sum + (c.openInterest || 0), 0) || 0
    const totalPutOI = optionChain.puts?.reduce((sum, p) => sum + (p.openInterest || 0), 0) || 0
    const pcr = totalPutOI / (totalCallOI || 1)

    const totalCallVol = optionChain.calls?.reduce((sum, c) => sum + (c.volume || 0), 0) || 0
    const totalPutVol = optionChain.puts?.reduce((sum, p) => sum + (p.volume || 0), 0) || 0
    const pcrVolume = totalPutVol / (totalCallVol || 1)

    return {
      pcr: pcr.toFixed(2),
      pcrVolume: pcrVolume.toFixed(2),
      totalCallOI,
      totalPutOI,
      totalCallVol,
      totalPutVol,
      signal: pcr > 1.2 ? 'Bearish' : pcr < 0.8 ? 'Bullish' : 'Neutral'
    }
  }, [optionChain])

  // ==================== OI ANALYSIS ====================
  const oiAnalysis = useMemo(() => {
    if (!optionChain) return { maxPain: 0, support: [], resistance: [] }

    const strikePain = {}
    optionChain.calls?.forEach(c => {
      const pain = (c.openInterest || 0) * (c.strike - underlyingPrice)
      strikePain[c.strike] = (strikePain[c.strike] || 0) + pain
    })
    optionChain.puts?.forEach(p => {
      const pain = (p.openInterest || 0) * (underlyingPrice - p.strike)
      strikePain[p.strike] = (strikePain[p.strike] || 0) + pain
    })

    const maxPainStrike = Object.entries(strikePain).sort((a, b) => a[1] - b[1])[0]?.[0] || underlyingPrice

    // Find support (high put OI)
    const putOIByStrike = {}
    optionChain.puts?.forEach(p => {
      putOIByStrike[p.strike] = p.openInterest || 0
    })
    const support = Object.entries(putOIByStrike)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strike, oi]) => ({ strike: parseInt(strike), oi }))

    // Find resistance (high call OI)
    const callOIByStrike = {}
    optionChain.calls?.forEach(c => {
      callOIByStrike[c.strike] = c.openInterest || 0
    })
    const resistance = Object.entries(callOIByStrike)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strike, oi]) => ({ strike: parseInt(strike), oi }))

    return { maxPain: parseInt(maxPainStrike), support, resistance }
  }, [optionChain, underlyingPrice])

  // ==================== VOLATILITY ANALYSIS ====================
  const volatilityAnalysis = useMemo(() => {
    if (!optionChain) return null

    const callIVs = optionChain.calls?.map(c => c.impliedVolatility || 0.2).filter(Boolean) || []
    const putIVs = optionChain.puts?.map(p => p.impliedVolatility || 0.2).filter(Boolean) || []

    const avgCallIV = callIVs.length ? callIVs.reduce((a, b) => a + b, 0) / callIVs.length : 0.2
    const avgPutIV = putIVs.length ? putIVs.reduce((a, b) => a + b, 0) / putIVs.length : 0.2

    const ivRank = Math.min(100, Math.max(0, (avgCallIV / 0.35) * 100))
    const ivPercentile = Math.min(100, Math.max(0, (avgCallIV - 0.08) / 0.28 * 100))

    return {
      avgCallIV: (avgCallIV * 100).toFixed(1),
      avgPutIV: (avgPutIV * 100).toFixed(1),
      ivRank: ivRank.toFixed(0),
      ivPercentile: ivPercentile.toFixed(0),
      ivCrushRisk: avgCallIV > 0.25 ? 'HIGH' : avgCallIV > 0.18 ? 'MEDIUM' : 'LOW',
      recommendation: ivRank > 70 ? 'SELL VOL' : ivRank < 30 ? 'BUY VOL' : 'NEUTRAL'
    }
  }, [optionChain])

  // ==================== EXPIRY CALENDAR ====================
  const expiryCalendar = useMemo(() => {
    const now = new Date()
    const expiries = []
    const currentExpiry = expiry ? new Date(expiry) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    for (let i = 0; i < 6; i++) {
      const expDate = new Date(currentExpiry)
      expDate.setDate(expDate.getDate() + i * 7)
      const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))

      expiries.push({
        date: expDate.toISOString().split('T')[0],
        display: expDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        daysLeft,
        theta: Math.pow(0.94, daysLeft * 0.5) * 100
      })
    }
    return expiries
  }, [expiry])

  // ==================== PROBABILITY CALCULATOR ====================
  const [probabilityParams, setProbabilityParams] = useState({
    daysToExpiry: 7,
    volatility: 18,
    targetPrice: null
  })

  const probabilityAnalysis = useMemo(() => {
    const { daysToExpiry, volatility } = probabilityParams
    const r = 0.07 // Risk-free rate
    const t = daysToExpiry / 365

    // Calculate standard deviation
    const sd = (volatility / 100) * Math.sqrt(t)

    // 1 SD range
    const oneSDUp = underlyingPrice * Math.exp((r - 0.5 * Math.pow(volatility/100, 2)) * t + sd)
    const oneSDDown = underlyingPrice * Math.exp((r - 0.5 * Math.pow(volatility/100, 2)) * t - sd)

    // 2 SD range
    const twoSDUp = underlyingPrice * Math.exp((r - 0.5 * Math.pow(volatility/100, 2)) * t + 2 * sd)
    const twoSDDown = underlyingPrice * Math.exp((r - 0.5 * Math.pow(volatility/100, 2)) * t - 2 * sd)

    // Probabilities using normal distribution approximation
    const probOneSD = 0.6826
    const probTwoSD = 0.9545

    return {
      oneSDRange: [Math.round(oneSDDown), Math.round(oneSDUp)],
      twoSDRange: [Math.round(twoSDDown), Math.round(twoSDUp)],
      probOneSD: (probOneSD * 100).toFixed(1),
      probTwoSD: (probTwoSD * 100).toFixed(1),
      impliedMove: Math.round(underlyingPrice * (volatility / 100) * Math.sqrt(daysToExpiry / 365))
    }
  }, [underlyingPrice, probabilityParams])

  // ==================== HEATMAP DATA ====================
  const heatmapData = useMemo(() => {
    if (!optionChain) return []

    const data = []
    availableStrikes.slice(0, 15).forEach(strike => {
      const call = optionChain.calls?.find(c => c.strike === strike)
      const put = optionChain.puts?.find(p => p.strike === strike)

      data.push({
        strike,
        callOI: call?.openInterest || 0,
        putOI: put?.openInterest || 0,
        callVolume: call?.volume || 0,
        putVolume: put?.volume || 0,
        callIV: (call?.impliedVolatility || 0.2) * 100,
        putIV: (put?.impliedVolatility || 0.2) * 100,
        callChange: ((call?.volume || 0) - (call?.openInterest || 0) / 10),
        putChange: ((put?.volume || 0) - (put?.openInterest || 0) / 10)
      })
    })
    return data
  }, [optionChain, availableStrikes])

  // ==================== RENDER ====================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Options Trading Platform</h2>
              <p className="text-slate-400 text-sm">Advanced Strategy Builder & Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 text-sm backdrop-blur"
            >
              {niftyStocks.map(s => (
                <option key={s.symbol} value={s.symbol} className="text-slate-800">
                  {s.name} (₹{s.lotSize})
                </option>
              ))}
            </select>

            <div className="bg-emerald-500/20 px-4 py-2 rounded-lg border border-emerald-500/30">
              <p className="text-xs text-emerald-300">Underlying</p>
              <p className="font-bold text-lg">₹{underlyingPrice.toLocaleString('en-IN')}</p>
            </div>

            <div className="bg-blue-500/20 px-4 py-2 rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-300">Lot Size</p>
              <p className="font-bold text-lg">{lotSize}</p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {[
            { id: 'builder', label: '🏗️ Builder', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
            { id: 'chain', label: '⛓️ Option Chain', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
            { id: 'oi', label: '📊 OI Analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { id: 'pcr', label: '📈 PCR', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { id: 'volatility', label: '🎯 Volatility', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { id: 'probability', label: '🎲 Probability', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'heatmap', label: '🔥 Heatmap', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
            { id: 'positions', label: '💼 Positions', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== STRATEGY BUILDER ==================== */}
      {activeTab === 'builder' && (
        <div className="space-y-4">
          {/* Quick Strategies */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">Quick Strategies</h3>
              <button onClick={clearLegs} className="text-sm text-red-500 hover:underline">Clear All</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {presetStrategies.map(strategy => (
                <button
                  key={strategy.name}
                  onClick={() => applyStrategy(strategy)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition border border-slate-200 hover:border-slate-300"
                >
                  <span className={`text-${strategy.color}-600`}>●</span> {strategy.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Option Chain - Strike Selection */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 mb-3">Select Strikes</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                <div>
                  <p className="text-xs font-bold text-green-600 mb-2">CALLS (Buy)</p>
                  {availableStrikes.slice(0, 12).map(strike => (
                    <button
                      key={`call-${strike}`}
                      onClick={() => addLeg('buy', strike, 'call')}
                      className="w-full p-2 text-left hover:bg-green-50 rounded-lg border border-slate-100 mb-1 transition text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800">₹{strike}</span>
                        <span className="text-green-600">₹{getPremiumForStrike(strike, 'call').toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold text-red-600 mb-2">PUTS (Buy)</p>
                  {availableStrikes.slice(0, 12).map(strike => (
                    <button
                      key={`put-${strike}`}
                      onClick={() => addLeg('buy', strike, 'put')}
                      className="w-full p-2 text-left hover:bg-red-50 rounded-lg border border-slate-100 mb-1 transition text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800">₹{strike}</span>
                        <span className="text-red-600">₹{getPremiumForStrike(strike, 'put').toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Legs */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 mb-3">Strategy Legs ({legs.length})</h3>

              {legs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">Click strikes to add legs</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {legs.map((leg, idx) => (
                    <div key={leg.id} className={`p-3 rounded-lg border-2 ${
                      leg.type === 'buy' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={leg.type}
                            onChange={(e) => updateLeg(leg.id, 'type', e.target.value)}
                            className={`text-xs font-bold px-2 py-1 rounded border-0 ${
                              leg.type === 'buy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            leg.optionType === 'call' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {leg.optionType.toUpperCase()}
                          </span>
                          <span className="font-bold text-slate-800">₹{leg.strike}</span>
                        </div>
                        <button onClick={() => removeLeg(leg.id)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500">Premium</label>
                          <input
                            type="number"
                            value={leg.premium}
                            onChange={(e) => updateLeg(leg.id, 'premium', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Lots</label>
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
            <div className="lg:col-span-6 space-y-4">
              {/* Analysis Cards */}
              {analysis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-3 text-white">
                    <p className="text-green-100 text-xs">Max Profit</p>
                    <p className="font-bold text-lg">{analysis.maxProfit}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-3 text-white">
                    <p className="text-red-100 text-xs">Max Loss</p>
                    <p className="font-bold text-lg">{analysis.maxLoss}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-3 text-white">
                    <p className="text-blue-100 text-xs">Breakeven</p>
                    <p className="font-bold text-lg">{analysis.breakevens.map(b => `₹${b}`).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl p-3 text-white">
                    <p className="text-purple-100 text-xs">Net Premium</p>
                    <p className="font-bold text-lg">{analysis.netPremium >= 0 ? '+' : ''}₹{Math.abs(analysis.netPremium).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Greeks */}
              {analysis && showGreeks && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800">Portfolio Greeks</h3>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={showGreeks}
                        onChange={(e) => setShowGreeks(e.target.checked)}
                        className="rounded"
                      />
                      Show Greeks
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Δ Delta</p>
                      <p className="text-lg font-bold text-blue-800">{analysis.netDelta}</p>
                      <p className="text-xs text-blue-400">Direction</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium">Γ Gamma</p>
                      <p className="text-lg font-bold text-purple-800">{analysis.netGamma}</p>
                      <p className="text-xs text-purple-400">Accel</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-600 font-medium">Θ Theta</p>
                      <p className="text-lg font-bold text-amber-800">{analysis.netTheta}</p>
                      <p className="text-xs text-amber-400">Time Decay</p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-lg">
                      <p className="text-xs text-pink-600 font-medium">ν Vega</p>
                      <p className="text-lg font-bold text-pink-800">{analysis.netVega}</p>
                      <p className="text-xs text-pink-400">Volatility</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payoff Chart with Strategy Lines */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="font-bold text-slate-800">Payoff Diagram with Strategy Lines</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setChartType('payoff')}
                      className={`px-3 py-1 text-sm rounded ${chartType === 'payoff' ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}
                    >
                      Payoff
                    </button>
                    <button
                      onClick={() => setChartType('pnl')}
                      className={`px-3 py-1 text-sm rounded ${chartType === 'pnl' ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}
                    >
                      P&L
                    </button>
                  </div>
                </div>

                {/* Strategy Lines Controls */}
                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-slate-50 rounded-lg">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showBreakeven}
                      onChange={(e) => setStrategyLines({...strategyLines, showBreakeven: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    Breakeven
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showMaxPain}
                      onChange={(e) => setStrategyLines({...strategyLines, showMaxPain: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Max Pain
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showSupport}
                      onChange={(e) => setStrategyLines({...strategyLines, showSupport: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Support
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showResistance}
                      onChange={(e) => setStrategyLines({...strategyLines, showResistance: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Resistance
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showTrendLine}
                      onChange={(e) => setStrategyLines({...strategyLines, showTrendLine: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Trend Line
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showMA}
                      onChange={(e) => setStrategyLines({...strategyLines, showMA: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    Moving Avg
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={strategyLines.showBollinger}
                      onChange={(e) => setStrategyLines({...strategyLines, showBollinger: e.target.checked})}
                      className="rounded"
                    />
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    Bollinger
                  </label>
                </div>

                {/* Add Custom Line */}
                <div className="flex flex-wrap items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xs font-medium text-blue-700">Add Custom Line:</span>
                  <input
                    type="number"
                    placeholder="Price"
                    className="w-20 px-2 py-1 text-xs border rounded"
                    id="customLinePrice"
                  />
                  <select className="px-2 py-1 text-xs border rounded" id="customLineColor">
                    <option value="#ff6b6b">Red</option>
                    <option value="#4ecdc4">Teal</option>
                    <option value="#ffe66d">Yellow</option>
                    <option value="#95e1d3">Mint</option>
                    <option value="#dda0dd">Plum</option>
                  </select>
                  <button
                    onClick={() => {
                      const price = parseFloat(document.getElementById('customLinePrice').value)
                      const color = document.getElementById('customLineColor').value
                      if (price) {
                        setStrategyLines({
                          ...strategyLines,
                          customLines: [...strategyLines.customLines, { price, color, label: `₹${price}` }]
                        })
                        document.getElementById('customLinePrice').value = ''
                      }
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    + Add
                  </button>
                  {strategyLines.customLines.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {strategyLines.customLines.map((line, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full cursor-pointer"
                          style={{ backgroundColor: line.color, color: '#fff' }}
                          onClick={() => {
                            setStrategyLines({
                              ...strategyLines,
                              customLines: strategyLines.customLines.filter((_, i) => i !== idx)
                            })
                          }}
                        >
                          {line.label} ×
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={payoffData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="price" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip
                      formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                      labelFormatter={(val) => `Price: ₹${val}`}
                    />

                    {/* Zero Line */}
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />

                    {/* Current Price */}
                    <ReferenceLine x={underlyingPrice} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'CMP', position: 'top', fill: '#3b82f6', fontSize: 10 }} />

                    {/* Breakeven Lines */}
                    {strategyLines.showBreakeven && analysis?.breakevens.map((be, idx) => (
                      <ReferenceLine key={`be-${idx}`} x={be} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2} label={{ value: `BE: ₹${be}`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 9 }} />
                    ))}

                    {/* Max Pain Line */}
                    {strategyLines.showMaxPain && oiAnalysis.maxPain > 0 && (
                      <ReferenceLine x={oiAnalysis.maxPain} stroke="#8b5cf6" strokeDasharray="2 2" strokeWidth={2} label={{ value: `Max Pain: ₹${oiAnalysis.maxPain}`, position: 'insideBottomRight', fill: '#8b5cf6', fontSize: 9 }} />
                    )}

                    {/* Support Lines */}
                    {strategyLines.showSupport && oiAnalysis.support.slice(0, 2).map((s, idx) => (
                      <ReferenceLine key={`sup-${idx}`} x={s.strike} stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" label={{ value: `S${idx+1}: ₹${s.strike}`, position: 'insideBottomLeft', fill: '#10b981', fontSize: 9 }} />
                    ))}

                    {/* Resistance Lines */}
                    {strategyLines.showResistance && oiAnalysis.resistance.slice(0, 2).map((r, idx) => (
                      <ReferenceLine key={`res-${idx}`} x={r.strike} stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" label={{ value: `R${idx+1}: ₹${r.strike}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 9 }} />
                    ))}

                    {/* Strike Lines */}
                    {legs.map((leg) => (
                      <ReferenceLine key={`leg-${leg.id}`} x={leg.strike} stroke={leg.type === 'buy' ? (leg.optionType === 'call' ? '#10b981' : '#ef4444') : (leg.optionType === 'call' ? '#065f46' : '#991b1b')} strokeWidth={1} strokeDasharray="2 2" label={{ value: `${leg.type.toUpperCase()} ${leg.optionType.toUpperCase()} ₹${leg.strike}`, position: 'insideTopRight', fill: '#64748b', fontSize: 8 }} />
                    ))}

                    {/* Custom Lines */}
                    {strategyLines.customLines.map((line, idx) => (
                      <ReferenceLine key={`custom-${idx}`} x={line.price} stroke={line.color} strokeWidth={2} strokeDasharray="5 3" label={{ value: line.label, position: 'insideTopRight', fill: line.color, fontSize: 10, fontWeight: 'bold' }} />
                    ))}

                    {/* Main Area */}
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      strokeWidth={2}
                      name="P/L"
                    />

                    {/* Bollinger Bands */}
                    {strategyLines.showBollinger && (() => {
                      const prices = payoffData.map(p => p.profit)
                      const avg = prices.reduce((a, b) => a + b, 0) / prices.length
                      const stdDev = Math.sqrt(prices.map(p => Math.pow(p - avg, 2)).reduce((a, b) => a + b, 0) / prices.length)
                      const upperBand = avg + 2 * stdDev
                      const lowerBand = avg - 2 * stdDev
                      return (
                        <>
                          <Line type="monotone" dataKey={() => upperBand} stroke="#ec4899" strokeDasharray="3 3" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey={() => avg} stroke="#ec4899" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey={() => lowerBand} stroke="#ec4899" strokeDasharray="3 3" strokeWidth={1} dot={false} />
                        </>
                      )
                    })()}

                    {/* Moving Average */}
                    {strategyLines.showMA && (() => {
                      const maData = payoffData.map(p => p.profit)
                      const maPeriod = 5
                      const maValues = maData.map((_, idx) => {
                        if (idx < maPeriod - 1) return null
                        const sum = maData.slice(idx - maPeriod + 1, idx + 1).reduce((a, b) => a + b, 0)
                        return sum / maPeriod
                      })
                      return (
                        <Line
                          type="monotone"
                          dataKey={(d, idx) => maValues[idx]}
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={false}
                          name="MA(5)"
                        />
                      )
                    })()}
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-slate-500"></span> ₹0 (Zero)</span>
                  <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-blue-500 dash"></span> Current</span>
                  {strategyLines.showBreakeven && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-500 dash"></span> Breakeven</span>}
                  {strategyLines.showMaxPain && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-500 dash"></span> Max Pain</span>}
                  {strategyLines.showSupport && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-green-500 dash"></span> Support</span>}
                  {strategyLines.showResistance && <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-500 dash"></span> Resistance</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== OPTION CHAIN ==================== */}
      {activeTab === 'chain' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Option Chain - {symbol}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th colSpan={5} className="text-center py-2 text-red-600 font-bold">PUTS</th>
                  <th className="text-center py-2 px-4 bg-slate-200 text-slate-800 font-bold">STRIKE</th>
                  <th colSpan={5} className="text-center py-2 text-green-600 font-bold">CALLS</th>
                </tr>
                <tr className="text-xs text-slate-500">
                  <th className="px-2 py-2">OI</th>
                  <th className="px-2 py-2">Vol</th>
                  <th className="px-2 py-2">IV</th>
                  <th className="px-2 py-2">Bid</th>
                  <th className="px-2 py-2">Ask</th>
                  <th className="px-2 py-2 bg-slate-100"></th>
                  <th className="px-2 py-2">Ask</th>
                  <th className="px-2 py-2">Bid</th>
                  <th className="px-2 py-2">IV</th>
                  <th className="px-2 py-2">Vol</th>
                  <th className="px-2 py-2">OI</th>
                </tr>
              </thead>
              <tbody>
                {availableStrikes.slice(5, 20).map((strike, idx) => {
                  const call = optionChain?.calls?.find(c => c.strike === strike)
                  const put = optionChain?.puts?.find(p => p.strike === strike)
                  const isATM = Math.abs(strike - underlyingPrice) < 50

                  return (
                    <tr key={strike} className={`border-b border-slate-100 ${isATM ? 'bg-emerald-50' : ''}`}>
                      {/* Puts */}
                      <td className="px-2 py-2 text-right font-medium">{put?.openInterest ? (put.openInterest / 100000).toFixed(1) + 'L' : '-'}</td>
                      <td className="px-2 py-2 text-right">{put?.volume ? (put.volume / 100000).toFixed(1) + 'L' : '-'}</td>
                      <td className="px-2 py-2 text-right text-slate-500">{put?.impliedVolatility ? (put.impliedVolatility * 100).toFixed(0) + '%' : '-'}</td>
                      <td className="px-2 py-2 text-right text-red-600 font-medium">₹{put?.bid?.toFixed(2) || '-'}</td>
                      <td className="px-2 py-2 text-right text-green-600 font-medium">₹{put?.ask?.toFixed(2) || '-'}</td>

                      {/* Strike */}
                      <td className="px-4 py-2 text-center font-bold bg-slate-100 text-slate-800">
                        ₹{strike}
                        {isATM && <span className="ml-1 text-xs text-emerald-600">ATM</span>}
                      </td>

                      {/* Calls */}
                      <td className="px-2 py-2 text-right text-green-600 font-medium">₹{call?.ask?.toFixed(2) || '-'}</td>
                      <td className="px-2 py-2 text-right text-red-600 font-medium">₹{call?.bid?.toFixed(2) || '-'}</td>
                      <td className="px-2 py-2 text-right text-slate-500">{call?.impliedVolatility ? (call.impliedVolatility * 100).toFixed(0) + '%' : '-'}</td>
                      <td className="px-2 py-2 text-right">{call?.volume ? (call.volume / 100000).toFixed(1) + 'L' : '-'}</td>
                      <td className="px-2 py-2 text-right font-medium">{call?.openInterest ? (call.openInterest / 100000).toFixed(1) + 'L' : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== OI ANALYSIS ==================== */}
      {activeTab === 'oi' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">Max Pain</h4>
              <p className="text-3xl font-bold text-emerald-600">₹{oiAnalysis.maxPain}</p>
              <p className="text-sm text-slate-500">Strike where most options expire worthless</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">Support Levels</h4>
              <div className="space-y-1">
                {oiAnalysis.support.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">₹{s.strike}</span>
                    <span className="text-slate-500">{(s.oi / 100000).toFixed(1)}L OI</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">Resistance Levels</h4>
              <div className="space-y-1">
                {oiAnalysis.resistance.map((r, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">₹{r.strike}</span>
                    <span className="text-slate-500">{(r.oi / 100000).toFixed(1)}L OI</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3">Open Interest Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={heatmapData.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="callOI" fill="#10b981" name="Call OI" />
                <Bar dataKey="putOI" fill="#ef4444" name="Put OI" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ==================== PCR ANALYSIS ==================== */}
      {activeTab === 'pcr' && pcrAnalysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">PCR (OI)</p>
              <p className="text-3xl font-bold text-slate-800">{pcrAnalysis.pcr}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">PCR (Volume)</p>
              <p className="text-3xl font-bold text-slate-800">{pcrAnalysis.pcrVolume}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Call OI</p>
              <p className="text-3xl font-bold text-green-600">{(pcrAnalysis.totalCallOI / 1000000).toFixed(2)}M</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Total Put OI</p>
              <p className="text-3xl font-bold text-red-600">{(pcrAnalysis.totalPutOI / 1000000).toFixed(2)}M</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">PCR Signal</h4>
              <div className={`p-4 rounded-xl text-center ${
                pcrAnalysis.signal === 'Bearish' ? 'bg-red-100' :
                pcrAnalysis.signal === 'Bullish' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <p className={`text-2xl font-bold ${
                  pcrAnalysis.signal === 'Bearish' ? 'text-red-700' :
                  pcrAnalysis.signal === 'Bullish' ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {pcrAnalysis.signal}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {pcrAnalysis.signal === 'Bearish' ? 'High put OI suggests market fear' :
                   pcrAnalysis.signal === 'Bullish' ? 'High call OI suggests bullish sentiment' :
                   'Balanced OI distribution'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">PCR Interpretation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">&lt; 0.7</span>
                  <span className="font-medium text-green-600">Strong Bullish</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">0.7 - 1.0</span>
                  <span className="font-medium text-green-500">Bullish</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">1.0</span>
                  <span className="font-medium text-yellow-600">Neutral</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">1.0 - 1.3</span>
                  <span className="font-medium text-red-500">Bearish</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">&gt; 1.3</span>
                  <span className="font-medium text-red-600">Strong Bearish</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VOLATILITY ==================== */}
      {activeTab === 'volatility' && volatilityAnalysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
              <p className="text-blue-100 text-sm">IV Rank</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.ivRank}%</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
              <p className="text-purple-100 text-sm">IV Percentile</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.ivPercentile}%</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <p className="text-green-100 text-sm">Call IV</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.avgCallIV}%</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-rose-500 rounded-xl p-4 text-white">
              <p className="text-red-100 text-sm">Put IV</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.avgPutIV}%</p>
            </div>
            <div className={`rounded-xl p-4 text-white ${
              volatilityAnalysis.ivCrushRisk === 'HIGH' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
              volatilityAnalysis.ivCrushRisk === 'MEDIUM' ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
              'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              <p className="text-white/80 text-sm">IV Crush Risk</p>
              <p className="text-2xl font-bold">{volatilityAnalysis.ivCrushRisk}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3">Volatility Recommendation</h4>
            <div className={`p-4 rounded-xl text-center ${
              volatilityAnalysis.recommendation === 'BUY VOL' ? 'bg-green-100' :
              volatilityAnalysis.recommendation === 'SELL VOL' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <p className={`text-xl font-bold ${
                volatilityAnalysis.recommendation === 'BUY VOL' ? 'text-green-700' :
                volatilityAnalysis.recommendation === 'SELL VOL' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {volatilityAnalysis.recommendation}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {volatilityAnalysis.recommendation === 'BUY VOL' ? 'Low IV - Buy options before IV expands' :
                 volatilityAnalysis.recommendation === 'SELL VOL' ? 'High IV - Sell options before IV contracts' :
                 'Normal IV - No clear volatility trade'}
              </p>
            </div>
          </div>

          {/* IV Surface (simplified) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3">IV by Strike</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={heatmapData.slice(3, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 40]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="callIV" stroke="#10b981" name="Call IV" strokeWidth={2} />
                <Line type="monotone" dataKey="putIV" stroke="#ef4444" name="Put IV" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ==================== PROBABILITY ==================== */}
      {activeTab === 'probability' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">Days to Expiry</label>
              <input
                type="range"
                min="1"
                max="30"
                value={probabilityParams.daysToExpiry}
                onChange={(e) => setProbabilityParams({...probabilityParams, daysToExpiry: parseInt(e.target.value)})}
                className="w-full"
              />
              <p className="text-center font-bold text-slate-800 mt-2">{probabilityParams.daysToExpiry} days</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">Implied Volatility</label>
              <input
                type="range"
                min="5"
                max="40"
                value={probabilityParams.volatility}
                onChange={(e) => setProbabilityParams({...probabilityParams, volatility: parseInt(e.target.value)})}
                className="w-full"
              />
              <p className="text-center font-bold text-slate-800 mt-2">{probabilityParams.volatility}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Implied Move</p>
              <p className="text-2xl font-bold text-slate-800">±₹{probabilityAnalysis.impliedMove}</p>
              <p className="text-xs text-slate-500">1 SD expected move</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">Price Probability Ranges</h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">68% Probability (1 SD)</span>
                    <span className="text-green-700 font-bold">₹{probabilityAnalysis.oneSDRange[0]} - ₹{probabilityAnalysis.oneSDRange[1]}</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">95% Probability (2 SD)</span>
                    <span className="text-blue-700 font-bold">₹{probabilityAnalysis.twoSDRange[0]} - ₹{probabilityAnalysis.twoSDRange[1]}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-3">Visual Representation</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={[
                  { price: probabilityAnalysis.twoSDRange[0], prob: 2.3 },
                  { price: probabilityAnalysis.oneSDRange[0], prob: 16 },
                  { price: underlyingPrice, prob: 68 },
                  { price: probabilityAnalysis.oneSDRange[1], prob: 16 },
                  { price: probabilityAnalysis.twoSDRange[1], prob: 2.3 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="price" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="prob" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                  <ReferenceLine x={underlyingPrice} stroke="#10b981" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ==================== HEATMAP ==================== */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3">Options Activity Heatmap</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Call OI Heatmap */}
              <div>
                <h5 className="text-sm font-medium text-green-600 mb-2">CALL OI Intensity</h5>
                <div className="grid grid-cols-5 gap-1">
                  {heatmapData.slice(0, 15).map((item, idx) => {
                    const intensity = Math.min(100, (item.callOI / 5000000) * 100)
                    return (
                      <div
                        key={idx}
                        className="p-2 text-center text-xs rounded"
                        style={{ backgroundColor: `rgba(16, 185, 129, ${intensity / 100})` }}
                      >
                        <div className="font-bold">{item.strike.toString().slice(-4)}</div>
                        <div className="text-[10px]">{(item.callOI / 100000).toFixed(0)}L</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* Put OI Heatmap */}
              <div>
                <h5 className="text-sm font-medium text-red-600 mb-2">PUT OI Intensity</h5>
                <div className="grid grid-cols-5 gap-1">
                  {heatmapData.slice(0, 15).map((item, idx) => {
                    const intensity = Math.min(100, (item.putOI / 5000000) * 100)
                    return (
                      <div
                        key={idx}
                        className="p-2 text-center text-xs rounded"
                        style={{ backgroundColor: `rgba(239, 68, 68, ${intensity / 100})` }}
                      >
                        <div className="font-bold">{item.strike.toString().slice(-4)}</div>
                        <div className="text-[10px]">{(item.putOI / 100000).toFixed(0)}L</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h4 className="font-bold text-slate-800 mb-3">Volume Analysis</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={heatmapData.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="strike" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="callVolume" fill="#10b981" name="Call Vol" />
                <Bar dataKey="putVolume" fill="#ef4444" name="Put Vol" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ==================== POSITIONS ==================== */}
      {activeTab === 'positions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Paper Trading Positions</h4>
              <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                + Add Position
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Strike</th>
                    <th className="px-3 py-2 text-right">Premium</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Current</th>
                    <th className="px-3 py-2 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No positions. Start paper trading!
                      </td>
                    </tr>
                  ) : positions.map((pos, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{pos.symbol}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pos.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pos.type.toUpperCase()} {pos.optionType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">₹{pos.strike}</td>
                      <td className="px-3 py-2 text-right">₹{pos.premium}</td>
                      <td className="px-3 py-2 text-right">{pos.quantity}</td>
                      <td className="px-3 py-2 text-right">₹{(pos.premium * pos.quantity * lotSize).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">₹{(pos.premium * 1.1 * pos.quantity * lotSize).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-green-600 font-medium">+₹{(pos.premium * 0.1 * pos.quantity * lotSize).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>⚠️ Disclaimer:</strong> This is an educational simulation tool. All options data is simulated/estimated.
          Not intended for actual trading. Always consult with a certified financial advisor before trading.
        </p>
      </div>
    </div>
  )
}

export default OptionsTradingPlatform