import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import StockChart from './components/StockChart'
import PredictionPanel from './components/PredictionPanel'
import NewsFeed from './components/NewsFeed'
import OptionsChain from './components/OptionsChain'
import Portfolio from './components/Portfolio'
import FNOTrading from './components/FNOTrading'
import LiveTicker from './components/LiveTicker'
import AnalyzerDashboard from './components/AnalyzerDashboard'
import OptionStrategyBuilder from './components/OptionStrategyBuilder'
import OptionsAnalytics from './components/OptionsAnalytics'
import OptionsTradingPlatform from './components/OptionsTradingPlatform'
import InvestmentRecommendations from './components/InvestmentRecommendations'

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS')
  const [market, setMarket] = useState('india')

  const indianStocks = [
    // Nifty 50 Stocks
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Conglomerate' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
    { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'Finance' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
    { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Construction' },
    { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automobile' },
    { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile' },
    { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Jewelry' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
    { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
    { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking' },
    { symbol: 'ADANIPORTS.NS', name: 'Adani Ports', sector: 'Infrastructure' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Chemicals' },
    { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Labs', sector: 'Pharma' },
    { symbol: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT' },
    { symbol: 'TECHM.NS', name: 'Tech Mahindra', sector: 'IT' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma', sector: 'Pharma' },
    { symbol: 'NTPC.NS', name: 'NTPC', sector: 'Power' },
    { symbol: 'ONGC.NS', name: 'ONGC', sector: 'Oil & Gas' },
    { symbol: 'POWERGRID.NS', name: 'Power Grid', sector: 'Power' },
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Steel' },
    { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Steel' },
    { symbol: 'CIPLA.NS', name: 'Cipla', sector: 'Pharma' }
  ]

  const usStocks = [
    // Tech Giants
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'E-Commerce' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    // Finance
    { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Finance' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
    { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail' },
    { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer' },
    { symbol: 'MA', name: 'Mastercard', sector: 'Finance' },
    { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
    { symbol: 'HD', name: 'Home Depot', sector: 'Retail' },
    { symbol: 'DIS', name: 'Walt Disney', sector: 'Entertainment' },
    { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment' },
    { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology' },
    { symbol: 'CRM', name: 'Salesforce', sector: 'Technology' },
    { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
    { symbol: 'CSCO', name: 'Cisco Systems', sector: 'Technology' },
    { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology' },
    { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Finance' },
    { symbol: 'COST', name: 'Costco Wholesale', sector: 'Retail' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer' },
    { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer' },
    { symbol: 'NKE', name: 'Nike Inc.', sector: 'Apparel' },
    { symbol: 'BA', name: 'Boeing Company', sector: 'Aerospace' },
    { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' }
  ]

  const stocks = market === 'india' ? indianStocks : usStocks

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Live Ticker */}
      <LiveTicker stocks={stocks} />

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Stock Analizer
                </h1>
                <p className="text-xs text-slate-400">AI-Powered Market Prediction</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Market Toggle */}
              <div className="flex bg-slate-700/50 rounded-xl p-1 backdrop-blur-sm">
                <button
                  onClick={() => { setMarket('india'); setSelectedSymbol('RELIANCE.NS'); }}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    market === 'india'
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  🇮🇳 India
                </button>
                <button
                  onClick={() => { setMarket('us'); setSelectedSymbol('AAPL'); }}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    market === 'us'
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  🇺🇸 US
                </button>
              </div>
            </div>
          </div>

          {/* Stock Selector */}
          <div className="mt-5 flex items-center space-x-4">
            <div className="flex-1 max-w-xl">
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full bg-slate-700/50 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur-sm"
              >
                <option value="" disabled>Select a stock</option>
                <optgroup label={market === 'india' ? "Nifty 50 Stocks" : "US Stocks"} className="bg-slate-800">
                  {stocks.map(stock => (
                    <option key={stock.symbol} value={stock.symbol} className="bg-slate-800">
                      {stock.symbol} - {stock.name} ({stock.sector})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
              <span className="px-3 py-1 bg-slate-700/50 rounded-full">NSE/BSE</span>
              <span className="px-3 py-1 bg-slate-700/50 rounded-full">Real-time</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { id: 'analyzer', label: 'Analyzer', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'chart', label: 'Charts', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
              { id: 'prediction', label: 'Prediction', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'news', label: 'News', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
              { id: 'trade', label: 'Trade', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { id: 'fno', label: 'F&O Academy', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'options', label: 'Options', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
              { id: 'strategy', label: 'Strategy', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { id: 'optionspro', label: 'Options Pro', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
              { id: 'invest', label: 'Invest', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-5 py-4 text-sm font-medium border-b-2 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard symbol={selectedSymbol} market={market} stocks={stocks} />
        )}
        {activeTab === 'analyzer' && (
          <AnalyzerDashboard symbol={selectedSymbol} stocks={stocks} />
        )}
        {activeTab === 'chart' && (
          <StockChart symbol={selectedSymbol} />
        )}
        {activeTab === 'prediction' && (
          <PredictionPanel symbol={selectedSymbol} />
        )}
        {activeTab === 'news' && (
          <NewsFeed symbol={selectedSymbol} />
        )}
        {activeTab === 'trade' && (
          <Portfolio symbol={selectedSymbol} stocks={stocks} />
        )}
        {activeTab === 'fno' && (
          <FNOTrading />
        )}
        {activeTab === 'options' && (
          <OptionsChain symbol={selectedSymbol} />
        )}
        {activeTab === 'strategy' && (
          <OptionStrategyBuilder />
        )}
        {activeTab === 'analytics' && (
          <OptionsAnalytics />
        )}
        {activeTab === 'optionspro' && (
          <OptionsTradingPlatform />
        )}
        {activeTab === 'invest' && (
          <InvestmentRecommendations />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="font-semibold text-white">Stock Analizer</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm">Stock Market Prediction System - For Educational Purposes Only</p>
              <p className="text-xs mt-1 text-slate-500">Trading involves risk. Past performance does not guarantee future results.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App