import React, { useState, useEffect } from 'react'

const LiveTicker = ({ stocks }) => {
  const [prices, setPrices] = useState({})
  const [prevPrices, setPrevPrices] = useState({})

  useEffect(() => {
    // Initial fetch
    fetchAllPrices()

    // Update every 10 seconds for live feel
    const interval = setInterval(fetchAllPrices, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllPrices = async () => {
    if (!stocks || stocks.length === 0) return

    try {
      const pricePromises = stocks.slice(0, 12).map(async (stock) => {
        try {
          const response = await fetch(`/api/quote/${stock.symbol}`)
          return { symbol: stock.symbol, data: await response.json() }
        } catch {
          return null
        }
      })

      const results = await Promise.all(pricePromises)
      const validResults = results.filter(Boolean)

      // Store previous prices for animation
      setPrevPrices(prices)

      // Update new prices
      const newPrices = {}
      validResults.forEach(({ symbol, data }) => {
        newPrices[symbol] = data
      })
      setPrices(newPrices)
    } catch (err) {
      console.error('Error fetching prices:', err)
    }
  }

  const formatPrice = (price) => (price || 0).toFixed(2)
  const formatChange = (change) => (change || 0) >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2)

  const getAnimationClass = (symbol, field) => {
    const current = prices[symbol]?.[field]
    const prev = prevPrices[symbol]?.[field]

    if (!prev || !current || prev === current) return ''

    return current > prev ? 'price-up' : 'price-down'
  }

  if (!stocks || stocks.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 overflow-hidden">
      <div className="flex animate-ticker">
        {[...stocks.slice(0, 12), ...stocks.slice(0, 12)].map((stock, idx) => {
          const priceData = prices[stock.symbol]
          const isUp = (priceData?.change || 0) >= 0

          return (
            <div
              key={`${stock.symbol}-${idx}`}
              className="flex items-center space-x-3 px-4 py-2 border-r border-slate-700/50 min-w-[200px]"
            >
              <div className={`w-2 h-2 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-red-500'} ${priceData ? 'animate-pulse' : ''}`}></div>
              <div>
                <span className="text-white font-bold text-sm">{stock.symbol.replace('.NS', '')}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'} ${getAnimationClass(stock.symbol, 'price')}`}>
                    ₹{formatPrice(priceData?.price)}
                  </span>
                  <span className={`text-xs font-medium ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                    {priceData ? formatChange(priceData.change) : '--'} ({priceData?.changePercent?.toFixed(2) || '--'}%)
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
        @keyframes priceUp {
          0% { background-color: rgba(16, 185, 129, 0.3); }
          100% { background-color: transparent; }
        }
        @keyframes priceDown {
          0% { background-color: rgba(239, 68, 68, 0.3); }
          100% { background-color: transparent; }
        }
        .price-up {
          animation: priceUp 1s ease-out;
        }
        .price-down {
          animation: priceDown 1s ease-out;
        }
      `}</style>
    </div>
  )
}

export default LiveTicker