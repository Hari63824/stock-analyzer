import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { getQuote, getOrderBook } from '../services/api'

const FNOTrading = () => {
  const [activeSection, setActiveSection] = useState('learn')
  const [selectedStrategy, setSelectedStrategy] = useState(null)
  const [spotPrice, setSpotPrice] = useState(22000)
  const [strikePrice, setStrikePrice] = useState(22000)
  const [premium, setPremium] = useState(150)
  const [quantity, setQuantity] = useState(1)
  const [strategyResult, setStrategyResult] = useState(null)
  const [strategies, setStrategies] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [showEducation, setShowEducation] = useState(true)

  useEffect(() => {
    fetchStrategies()
  }, [])

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/fno/strategies')
      const data = await response.json()
      setStrategies(data.strategies)
    } catch (err) {
      console.error('Error fetching strategies:', err)
    }
  }

  const calculateStrategy = async () => {
    try {
      const response = await fetch('/api/fno/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: selectedStrategy,
          spotPrice: spotPrice,
          strikePrice: strikePrice,
          premium: premium,
          quantity: quantity
        })
      })
      const data = await response.json()
      setStrategyResult(data)
    } catch (err) {
      console.error('Error calculating strategy:', err)
    }
  }

  const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Education content for beginners
  const educationContent = {
    basics: {
      title: "What is F&O?",
      content: `F&O (Futures and Options) are derivative instruments that allow you to trade stocks without actually owning them.

📌 FUTURES: Agreement to buy/sell at a fixed price on a future date
📌 OPTIONS: Right to buy/sell at a fixed price (without obligation)

Key Terms:
• Strike Price: The price at which you can exercise the option
• Premium: The price you pay for buying an option
• Lot Size: Number of shares per contract (Nifty = 75, Bank Nifty = 25)
• Expiry: The date when the contract expires`
    },
    call: {
      title: "Call Option (Buy)",
      content: `A CALL option gives you the RIGHT to buy a stock at a fixed price.

🟢 When to Use: When you expect the stock price to GO UP

Example:
• Stock: Nifty @ 22,000
• Buy 22000 Call @ ₹150
• If Nifty goes to 23,000:
  - Your profit = 23,000 - 22,000 - 150 = ₹850 per lot
  - Profit = ₹850 × 75 = ₹63,750

Maximum Loss: Premium paid (₹150 × 75 = ₹11,250)
Maximum Profit: Unlimited!`
    },
    put: {
      title: "Put Option (Sell)",
      content: `A PUT option gives you the RIGHT to sell a stock at a fixed price.

🔴 When to Use: When you expect the stock price to GO DOWN

Example:
• Stock: Nifty @ 22,000
• Buy 22000 Put @ ₹150
• If Nifty goes to 21,000:
  - Your profit = 22,000 - 21,000 - 150 = ₹850 per lot
  - Profit = ₹850 × 75 = ₹63,750

Maximum Loss: Premium paid (₹150 × 75 = ₹11,250)
Maximum Profit: Up to Strike Price × Lot Size`
    },
    strategies: {
      title: "Trading Strategies",
      content: `Choose the right strategy based on your market view:

📈 BULLISH (Going Up):
• Long Call - Unlimited profit, limited loss
• Bull Call Spread - Limited profit, limited loss

📉 BEARISH (Going Down):
• Long Put - High profit, limited loss
• Bear Put Spread - Limited profit, limited loss

⚖️ NEUTRAL (Range Bound):
• Iron Condor - Profit if stays in range
• Iron Butterfly - Max profit at one price

📊 HIGH VOLATILITY:
• Long Straddle - Profit from big move either direction
• Long Strangle - Cheaper than straddle, needs bigger move`
    },
    margins: {
      title: "Margin Requirements",
      content: `Margin is the money you need to trade F&O:

📌 Options Buying:
• Only pay premium (no margin needed)
• Example: Buy Nifty Call @ ₹150 = Pay ₹11,250

📌 Options Selling:
• Requires margin (typically 20-50% of value)
• Example: Sell Nifty Call = ₹1-2 lakhs margin

📌 Futures Trading:
• Requires margin (varies by broker)
• Nifty: ₹1-1.5 lakhs per lot
• Bank Nifty: ₹1.5-2 lakhs per lot

💡 Tip: Always maintain extra margin for emergencies!`
    },
    risks: {
      title: "Risk Management",
      content: `Golden Rules for F&O Trading:

1️⃣ NEVER risk more than 2% per trade
   If account = ₹10 lakhs, max risk = ₹20,000

2️⃣ Always use STOP LOSS
   Exit if price moves against you by 20-30%

3️⃣ Start with Paper Trading
   Practice with virtual money first

4️⃣ Don't Overtrade
   Quality over quantity

5️⃣ Understand Leverage
   Small moves = Big profits OR Big losses

⚠️ Remember: F&O can wipe out your capital if not managed properly!`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">F&O Trading Academy</h2>
            <p className="text-purple-200 mt-1">Learn and Trade Futures & Options</p>
          </div>
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30"
          >
            {showEducation ? 'Hide Education' : 'Show Education'}
          </button>
        </div>
      </div>

      {showEducation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(educationContent).map(([key, value]) => (
            <div
              key={key}
              onClick={() => setActiveSection(key)}
              className={`p-4 rounded-xl cursor-pointer transition ${
                activeSection === key
                  ? 'bg-violet-100 border-2 border-violet-500'
                  : 'bg-white border border-slate-200 hover:border-violet-300'
              }`}
            >
              <h3 className="font-bold text-slate-800">{value.title}</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{value.content.substring(0, 80)}...</p>
            </div>
          ))}
        </div>
      )}

      {/* Education Panel */}
      {showEducation && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">
            {educationContent[activeSection]?.title}
          </h3>
          <div className="prose max-w-none">
            {educationContent[activeSection]?.content.split('\n').map((line, i) => {
              if (line.startsWith('📌') || line.startsWith('🟢') || line.startsWith('🔴') ||
                  line.startsWith('📈') || line.startsWith('📉') || line.startsWith('⚖️') ||
                  line.startsWith('📊') || line.startsWith('💡') || line.startsWith('⚠️')) {
                return <p key={i} className="font-bold text-violet-700 mt-3">{line}</p>
              }
              if (line.startsWith('•')) {
                return <p key={i} className="ml-4 text-slate-600">• {line.substring(1)}</p>
              }
              if (line.startsWith('Example:') || line.startsWith('Maximum')) {
                return <p key={i} className="font-semibold text-slate-700 mt-2">{line}</p>
              }
              return <p key={i} className="text-slate-600">{line}</p>
            })}
          </div>
        </div>
      )}

      {/* Strategy Selector */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Choose a Strategy</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {strategies.map(strategy => (
            <button
              key={strategy.id}
              onClick={() => {
                setSelectedStrategy(strategy.id)
                setActiveSection('calculator')
              }}
              className={`p-3 rounded-xl text-left transition ${
                selectedStrategy === strategy.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-50 hover:bg-violet-50 border border-slate-200'
              }`}
            >
              <p className="font-medium text-sm">{strategy.name}</p>
              <p className={`text-xs mt-1 ${
                selectedStrategy === strategy.id ? 'text-violet-200' : 'text-slate-500'
              }`}>{strategy.type}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Calculator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Strategy Calculator</h3>

          <div className="space-y-4">
            {/* Spot Price */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Spot Price (₹)</label>
              <input
                type="number"
                value={spotPrice}
                onChange={(e) => {
                  setSpotPrice(parseFloat(e.target.value))
                  setStrikePrice(parseFloat(e.target.value))
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Strike Price */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Strike Price (₹)</label>
              <input
                type="number"
                value={strikePrice}
                onChange={(e) => setStrikePrice(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Premium */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Option Premium (₹)</label>
              <input
                type="number"
                value={premium}
                onChange={(e) => setPremium(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Number of Lots</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500 mt-1">1 Lot = 75 shares (Nifty)</p>
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateStrategy}
              disabled={!selectedStrategy}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-bold hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
            >
              Calculate Profit/Loss
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Strategy Analysis</h3>

          {strategyResult ? (
            <div className="space-y-4">
              {/* Strategy Info */}
              <div className="p-4 bg-violet-50 rounded-xl">
                <h4 className="font-bold text-violet-800">{strategyResult.name}</h4>
                <p className="text-sm text-violet-600">{strategyResult.description}</p>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                  strategyResult.type === 'Bullish' ? 'bg-green-100 text-green-700' :
                  strategyResult.type === 'Bearish' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {strategyResult.type}
                </span>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Breakeven</p>
                  <p className="font-bold text-slate-800">
                    {Array.isArray(strategyResult.breakeven)
                      ? `${formatCurrency(strategyResult.breakeven[0])} - ${formatCurrency(strategyResult.breakeven[1])}`
                      : formatCurrency(strategyResult.breakeven)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Max Loss</p>
                  <p className="font-bold text-red-600">{formatCurrency(strategyResult.maxLoss)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Max Profit</p>
                  <p className="font-bold text-green-600">{strategyResult.maxProfit}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Risk/Reward</p>
                  <p className="font-bold text-slate-800">{strategyResult.riskReward}</p>
                </div>
              </div>

              {/* Payoff Chart */}
              {strategyResult.payoffChart && (
                <div className="mt-4">
                  <h4 className="font-medium text-slate-700 mb-2">Payoff at Expiry</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={strategyResult.payoffChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="price" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>Select a strategy and enter values to see analysis</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Trade Section for F&O */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick F&O Trade</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Nifty */}
          <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">NIFTY</p>
                <p className="text-xs text-slate-500">Lot: 75</p>
              </div>
              <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded">Index</span>
            </div>
            <button
              onClick={() => { setSelectedStrategy('longCall'); setSpotPrice(22000); setStrikePrice(22000); setActiveSection('calculator'); }}
              className="w-full mt-3 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600"
            >
              Trade Now
            </button>
          </div>

          {/* Bank Nifty */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">BANKNIFTY</p>
                <p className="text-xs text-slate-500">Lot: 25</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Index</span>
            </div>
            <button
              onClick={() => { setSelectedStrategy('longCall'); setSpotPrice(48000); setStrikePrice(48000); setActiveSection('calculator'); }}
              className="w-full mt-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Trade Now
            </button>
          </div>

          {/* Nifty IT */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">NIFTY IT</p>
                <p className="text-xs text-slate-500">Lot: 50</p>
              </div>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">Index</span>
            </div>
            <button
              onClick={() => { setSelectedStrategy('longCall'); setSpotPrice(42000); setStrikePrice(42000); setActiveSection('calculator'); }}
              className="w-full mt-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
            >
              Trade Now
            </button>
          </div>

          {/* Stock Options */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">Stock F&O</p>
                <p className="text-xs text-slate-500">Various Lots</p>
              </div>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Stocks</span>
            </div>
            <button
              onClick={() => setActiveSection('calculator')}
              className="w-full mt-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
            >
              Browse Stocks
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-800">
          <strong>⚠️ Disclaimer:</strong> F&O trading involves substantial risk. You can lose your entire investment.
          This is for educational purposes only. Always start with paper trading and consult a financial advisor.
        </p>
      </div>
    </div>
  )
}

export default FNOTrading