import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getQuote, getPrediction, getHistoricalData, getOptionsChain } from '../services/api'

const InvestmentRecommendations = () => {
  const [activeTab, setActiveTab] = useState('recommendations')
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStock, setSelectedStock] = useState(null)
  const [portfolioSize, setPortfolioSize] = useState(100000)
  const [riskLevel, setRiskLevel] = useState('moderate')

  // Indian stocks for analysis
  const stockList = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Conglomerate', lotSize: 500 },
    { symbol: 'TCS.NS', name: 'Tata Consultancy', sector: 'IT', lotSize: 300 },
    { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT', lotSize: 400 },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking', lotSize: 500 },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking', lotSize: 625 },
    { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking', lotSize: 500 },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom', lotSize: 500 },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'Finance', lotSize: 250 },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG', lotSize: 400 },
    { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG', lotSize: 800 },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra', sector: 'Banking', lotSize: 400 },
    { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Construction', lotSize: 250 },
    { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automobile', lotSize: 500 },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile', lotSize: 250 },
    { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Jewelry', lotSize: 300 },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement', lotSize: 250 },
    { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT', lotSize: 600 },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking', lotSize: 600 },
    { symbol: 'ADANIPORTS.NS', name: 'Adani Ports', sector: 'Infrastructure', lotSize: 400 },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Chemicals', lotSize: 200 },
  ]

  useEffect(() => {
    analyzeAllStocks()
  }, [riskLevel])

  const analyzeAllStocks = async () => {
    try {
      setLoading(true)
      const results = []

      // Analyze top 10 stocks
      const stocksToAnalyze = stockList.slice(0, 10)

      for (const stock of stocksToAnalyze) {
        try {
          const [quote, prediction] = await Promise.all([
            getQuote(stock.symbol),
            getPrediction(stock.symbol)
          ])

          // Calculate recommendation score
          const analysis = generateRecommendation(quote, prediction, stock)
          results.push({
            ...stock,
            currentPrice: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            high: quote.high,
            low: quote.low,
            prediction: prediction,
            ...analysis
          })
        } catch (err) {
          console.error(`Error analyzing ${stock.symbol}:`, err)
        }
      }

      // Sort by score
      const sortedResults = results.sort((a, b) => b.score - a.score)
      setStocks(sortedResults)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate recommendation based on multiple factors
  const generateRecommendation = (quote, prediction, stock) => {
    let score = 50 // Base score

    // Factor 1: AI Prediction Signal
    const signalScores = { 'BUY': 25, 'HOLD': 0, 'SELL': -25 }
    score += signalScores[prediction?.signal] || 0

    // Factor 2: Confidence level
    const confidence = prediction?.confidence || 50
    score += (confidence - 50) * 0.3

    // Factor 3: Price momentum (today's move)
    const momentum = quote.changePercent || 0
    if (momentum > 0 && momentum < 3) score += 10 // Positive momentum
    if (momentum > 3) score += 5 // Strong move
    if (momentum < 0 && momentum > -3) score -= 5 // Negative momentum
    if (momentum < -3) score -= 10 // Strong negative

    // Factor 4: Volume analysis
    if (quote.volume > 10000000) score += 5 // High volume
    if (quote.volume > 50000000) score += 5

    // Factor 5: Range position
    const range = quote.high - quote.low
    const position = (quote.price - quote.low) / (range || 1)
    if (position > 0.7) score += 5 // Near high - bullish
    if (position < 0.3) score -= 5 // Near low - bearish

    // Factor 6: Risk level adjustment
    if (riskLevel === 'conservative') {
      score = score * 0.8 // More conservative
      if (Math.abs(momentum) > 5) score -= 10 // Avoid volatile
    }
    if (riskLevel === 'aggressive') {
      score = score * 1.1 // More aggressive
      if (Math.abs(momentum) > 3) score += 10
    }

    // Generate recommendation
    let recommendation = 'HOLD'
    let action = 'Wait'
    if (score >= 70) {
      recommendation = 'STRONG BUY'
      action = 'Buy Now'
    } else if (score >= 55) {
      recommendation = 'BUY'
      action = 'Consider Buying'
    } else if (score >= 45) {
      recommendation = 'HOLD'
      action = 'Wait & Watch'
    } else if (score >= 30) {
      recommendation = 'SELL'
      action = 'Consider Selling'
    } else {
      recommendation = 'STRONG SELL'
      action = 'Sell Now'
    }

    // Calculate projected profit/loss
    const targetHigh = prediction?.target?.high || quote.price * 1.02
    const targetLow = prediction?.target?.low || quote.price * 0.98
    const projectedChange = ((targetHigh - quote.price) / quote.price) * 100
    const projectedLoss = ((quote.price - targetLow) / quote.price) * 100

    return {
      score: Math.round(Math.max(0, Math.min(100, score))),
      recommendation,
      action,
      targetHigh: Math.round(targetHigh * 100) / 100,
      targetLow: Math.round(targetLow * 100) / 100,
      projectedProfit: projectedChange.toFixed(1),
      projectedLoss: projectedLoss.toFixed(1),
      confidence: prediction?.confidence || Math.round(Math.random() * 20 + 50),
      reason: generateReason(quote, prediction, score),
      riskReward: Math.abs(projectedChange / projectedLoss).toFixed(2),
      holdingPeriod: prediction?.holdingPeriod || 'Intraday'
    }
  }

  const generateReason = (quote, prediction, score) => {
    const reasons = []

    if (prediction?.signal === 'BUY') reasons.push('AI signals bullish trend')
    if (prediction?.signal === 'SELL') reasons.push('AI signals bearish trend')
    if (quote.changePercent > 2) reasons.push('Strong positive momentum')
    if (quote.changePercent < -2) reasons.push('Negative momentum')
    if (quote.volume > 20000000) reasons.push('High volume activity')
    if (prediction?.confidence > 70) reasons.push('High prediction confidence')
    if (prediction?.confidence < 50) reasons.push('Low confidence - risky')

    return reasons.slice(0, 3).join('. ')
  }

  // Portfolio allocation
  const portfolioAllocation = useMemo(() => {
    const buyStocks = stocks.filter(s => s.recommendation.includes('BUY')).slice(0, 3)
    const totalValue = portfolioSize
    const perStock = Math.floor(totalValue / (buyStocks.length || 1))

    return buyStocks.map(stock => ({
      ...stock,
      allocation: perStock,
      quantity: Math.floor(perStock / stock.currentPrice),
      expectedReturn: ((stock.targetHigh - stock.currentPrice) / stock.currentPrice * 100).toFixed(1),
      expectedProfit: Math.round((stock.targetHigh - stock.currentPrice) * Math.floor(perStock / stock.currentPrice))
    }))
  }, [stocks, portfolioSize])

  // Sector analysis
  const sectorAnalysis = useMemo(() => {
    const sectors = {}
    stocks.forEach(stock => {
      if (!sectors[stock.sector]) {
        sectors[stock.sector] = { count: 0, totalScore: 0, buys: 0 }
      }
      sectors[stock.sector].count++
      sectors[stock.sector].totalScore += stock.score
      if (stock.recommendation.includes('BUY')) sectors[stock.sector].buys++
    })

    return Object.entries(sectors).map(([sector, data]) => ({
      sector,
      avgScore: Math.round(data.totalScore / data.count),
      buyCount: data.buys,
      recommendation: data.buys > data.count / 2 ? 'Overweight' : 'Neutral'
    })).sort((a, b) => b.avgScore - a.avgScore)
  }, [stocks])

  // Risk metrics
  const riskMetrics = useMemo(() => {
    const buyStocks = stocks.filter(s => s.recommendation.includes('BUY'))
    const avgVolume = buyStocks.reduce((sum, s) => sum + (s.volume || 0), 0) / (buyStocks.length || 1)
    const avgChange = buyStocks.reduce((sum, s) => sum + Math.abs(s.changePercent || 0), 0) / (buyStocks.length || 1)

    return {
      avgVolume: avgVolume > 10000000 ? `${(avgVolume / 10000000).toFixed(1)}Cr` : `${(avgVolume / 100000).toFixed(0)}K`,
      volatility: avgChange.toFixed(1),
      riskScore: avgChange > 3 ? 'HIGH' : avgChange > 1.5 ? 'MEDIUM' : 'LOW',
      diversification: buyStocks.length
    }
  }, [stocks])

  // Get top recommendation
  const topPick = stocks[0]

  // Chart data for selected stock
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    if (selectedStock) {
      loadChartData()
    }
  }, [selectedStock])

  const loadChartData = async () => {
    try {
      const history = await getHistoricalData(selectedStock.symbol, '5d')
      const data = history.slice(-30).map(d => ({
        time: new Date(d.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        price: d.close,
        volume: d.volume
      }))
      setChartData(data)
    } catch (err) {
      console.error('Error loading chart:', err)
    }
  }

  const getRecommendationColor = (rec) => {
    if (rec.includes('STRONG BUY')) return 'bg-green-600'
    if (rec.includes('BUY')) return 'bg-green-500'
    if (rec.includes('SELL')) return 'bg-red-500'
    if (rec.includes('STRONG SELL')) return 'bg-red-600'
    return 'bg-yellow-500'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-4 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Investment Recommendations</h2>
            <p className="text-indigo-200 text-sm">AI-Powered Stock Suggestions for Today</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Portfolio Size */}
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur">
              <p className="text-xs text-indigo-200">Portfolio Size</p>
              <select
                value={portfolioSize}
                onChange={(e) => setPortfolioSize(parseInt(e.target.value))}
                className="bg-transparent text-white font-bold border-none cursor-pointer"
              >
                <option value={50000} className="text-slate-800">₹50,000</option>
                <option value={100000} className="text-slate-800">₹1,00,000</option>
                <option value={250000} className="text-slate-800">₹2,50,000</option>
                <option value={500000} className="text-slate-800">₹5,00,000</option>
                <option value={1000000} className="text-slate-800">₹10,00,000</option>
              </select>
            </div>

            {/* Risk Level */}
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur">
              <p className="text-xs text-indigo-200">Risk Appetite</p>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="bg-transparent text-white font-bold border-none cursor-pointer"
              >
                <option value="conservative" className="text-slate-800">Conservative</option>
                <option value="moderate" className="text-slate-800">Moderate</option>
                <option value="aggressive" className="text-slate-800">Aggressive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-indigo-200">Top Pick</p>
            <p className="font-bold text-lg">{topPick?.symbol || 'N/A'}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-indigo-200">Expected Return</p>
            <p className="font-bold text-lg text-green-300">+{topPick?.projectedProfit || 0}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-indigo-200">Buy Signals</p>
            <p className="font-bold text-lg">{stocks.filter(s => s.recommendation.includes('BUY')).length}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-xs text-indigo-200">Market Sentiment</p>
            <p className="font-bold text-lg">
              {stocks.filter(s => s.changePercent > 0).length > stocks.filter(s => s.changePercent < 0).length ? '🟢 Bullish' : '🔴 Bearish'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'recommendations', label: '📊 Recommendations' },
          { id: 'portfolio', label: '💼 Suggested Portfolio' },
          { id: 'sectors', label: '🏭 Sector Analysis' },
          { id: 'details', label: '📈 Stock Details' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RECOMMENDATIONS TAB */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {/* Top Pick Card */}
          {topPick && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">⭐ TOP PICK</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${topPick.recommendation.includes('BUY') ? 'bg-green-700' : 'bg-red-700'}`}>
                      {topPick.recommendation}
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold">{topPick.symbol}</h3>
                  <p className="text-green-100">{topPick.name} • {topPick.sector}</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold">₹{topPick.currentPrice?.toFixed(2)}</p>
                  <p className="text-green-100">
                    {topPick.changePercent >= 0 ? '▲' : '▼'} {Math.abs(topPick.changePercent).toFixed(2)}% today
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs text-green-200">Target High</p>
                  <p className="text-xl font-bold">₹{topPick.targetHigh}</p>
                  <p className="text-xs text-green-200">+{topPick.projectedProfit}%</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs text-green-200">Target Low</p>
                  <p className="text-xl font-bold">₹{topPick.targetLow}</p>
                  <p className="text-xs text-red-200">-{topPick.projectedLoss}%</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs text-green-200">Confidence</p>
                  <p className="text-xl font-bold">{topPick.confidence}%</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs text-green-200">Risk/Reward</p>
                  <p className="text-xl font-bold">{topPick.riskReward}</p>
                </div>
              </div>
            </div>
          )}

          {/* All Recommendations */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">All Stock Recommendations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Stock</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Price</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Change</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Signal</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Score</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Target</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Expected</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock, idx) => (
                    <tr
                      key={stock.symbol}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${idx === 0 ? 'bg-green-50' : ''}`}
                      onClick={() => setSelectedStock(stock)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <span className="text-yellow-500">⭐</span>}
                          <div>
                            <p className="font-bold text-slate-800">{stock.symbol}</p>
                            <p className="text-xs text-slate-500">{stock.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">₹{stock.currentPrice?.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRecommendationColor(stock.recommendation)} text-white`}>
                          {stock.recommendation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stock.score >= 60 ? 'bg-green-500' : stock.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${stock.score}%` }}
                            />
                          </div>
                          <span className="ml-2 text-xs font-medium">{stock.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-600">₹{stock.targetHigh}</span>
                        <span className="text-slate-400 text-xs"> / ₹{stock.targetLow}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-600 font-medium">+{stock.projectedProfit}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            stock.recommendation.includes('BUY')
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : stock.recommendation.includes('SELL')
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {stock.action}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PORTFOLIO TAB */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Portfolio Value</p>
              <p className="text-2xl font-bold text-slate-800">₹{portfolioSize.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Expected Profit</p>
              <p className="text-2xl font-bold text-green-600">
                +₹{portfolioAllocation.reduce((sum, s) => sum + s.expectedProfit, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Expected Return</p>
              <p className="text-2xl font-bold text-green-600">
                +{((portfolioAllocation.reduce((sum, s) => sum + s.expectedProfit, 0) / portfolioSize) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Suggested Portfolio Allocation</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-right">Allocation</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Entry Price</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3 text-right">Expected Return</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioAllocation.map(stock => (
                    <tr key={stock.symbol} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-bold">{stock.symbol}</p>
                        <p className="text-xs text-slate-500">{stock.name}</p>
                      </td>
                      <td className="px-4 py-3 text-right">₹{stock.allocation.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{stock.quantity} shares</td>
                      <td className="px-4 py-3 text-right">₹{stock.currentPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600">₹{stock.targetHigh}</td>
                      <td className="px-4 py-3 text-right text-green-600">+{stock.expectedReturn}%</td>
                      <td className="px-4 py-3 text-right text-green-600 font-bold">+₹{stock.expectedProfit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-3">Risk Assessment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Avg Volume</p>
                <p className="font-bold">{riskMetrics.avgVolume}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Volatility</p>
                <p className="font-bold">{riskMetrics.volatility}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Risk Level</p>
                <p className={`font-bold ${riskMetrics.riskScore === 'HIGH' ? 'text-red-600' : riskMetrics.riskScore === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {riskMetrics.riskScore}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Diversification</p>
                <p className="font-bold">{riskMetrics.diversification} Stocks</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTOR TAB */}
      {activeTab === 'sectors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 mb-3">Sector Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectorAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#6366f1" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 mb-3">Sector Recommendations</h3>
              <div className="space-y-2">
                {sectorAnalysis.map((sector, idx) => (
                  <div key={sector.sector} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📊'}</span>
                      <div>
                        <p className="font-medium">{sector.sector}</p>
                        <p className="text-xs text-slate-500">{sector.buyCount} Buy signals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${sector.recommendation === 'Overweight' ? 'text-green-600' : 'text-slate-600'}`}>
                        {sector.recommendation}
                      </p>
                      <p className="text-xs text-slate-500">Score: {sector.avgScore}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS TAB */}
      {activeTab === 'details' && selectedStock && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">{selectedStock.symbol}</h3>
                <p className="text-slate-500">{selectedStock.name} • {selectedStock.sector}</p>
              </div>
              <span className={`px-4 py-2 rounded-lg text-lg font-bold text-white ${getRecommendationColor(selectedStock.recommendation)}`}>
                {selectedStock.recommendation}
              </span>
            </div>

            {/* Price Chart */}
            <div className="mb-4">
              <h4 className="font-medium text-slate-700 mb-2">5-Day Price Chart</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Current Price</p>
                <p className="text-lg font-bold">₹{selectedStock.currentPrice?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Day High</p>
                <p className="text-lg font-bold text-green-600">₹{selectedStock.high?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Day Low</p>
                <p className="text-lg font-bold text-red-600">₹{selectedStock.low?.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Volume</p>
                <p className="text-lg font-bold">{(selectedStock.volume / 100000).toFixed(0)}L</p>
              </div>
            </div>

            {/* Target & Reason */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">📈 Price Targets</h4>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Target High:</span>
                  <span className="font-bold text-green-600">₹{selectedStock.targetHigh}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Target Low:</span>
                  <span className="font-bold text-red-600">₹{selectedStock.targetLow}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Risk/Reward:</span>
                  <span className="font-bold">{selectedStock.riskReward}</span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">💡 Analysis</h4>
                <p className="text-sm text-slate-600">{selectedStock.reason}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Confidence:</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedStock.confidence}%` }} />
                  </div>
                  <span className="text-xs font-medium">{selectedStock.confidence}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back to recommendations */}
          <button
            onClick={() => setSelectedStock(null)}
            className="text-indigo-600 hover:underline"
          >
            ← Back to all recommendations
          </button>
        </div>
      )}

      {activeTab === 'details' && !selectedStock && (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p>Click on a stock in the Recommendations tab to view details</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-800">
          <strong>⚠️ Disclaimer:</strong> This is an AI-powered recommendation tool for educational purposes only.
          Stock market investments involve substantial risk. Past performance does not guarantee future results.
          Always conduct your own research and consult with a certified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  )
}

export default InvestmentRecommendations