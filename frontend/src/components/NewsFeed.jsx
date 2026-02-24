import React, { useState, useEffect } from 'react'
import { getNews, analyzeSentiment } from '../services/api'

const NewsFeed = ({ symbol }) => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sentimentAnalysis, setSentimentAnalysis] = useState(null)

  useEffect(() => {
    fetchNews()
  }, [symbol])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const newsData = await getNews(symbol, 20)
      setNews(newsData)
      analyzeOverallSentiment(newsData)
    } catch (err) {
      console.error('Error fetching news:', err)
      // Fallback demo news
      setNews([
        { id: 1, title: `${symbol} Reports Strong Q4 Earnings`, category: 'earnings', sentiment: 0.6, source: 'Reuters', timestamp: new Date().toISOString() },
        { id: 2, title: `Analysts Upgrade ${symbol} to Buy`, category: 'analysis', sentiment: 0.7, source: 'Bloomberg', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, title: `${symbol} Announces New Product Launch`, category: 'corporate', sentiment: 0.5, source: 'CNBC', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, title: `Market Volatility Impacts ${symbol}`, category: 'market', sentiment: -0.3, source: 'MarketWatch', timestamp: new Date(Date.now() - 10800000).toISOString() },
        { id: 5, title: `${symbol} Faces Regulatory Challenge`, category: 'regulatory', sentiment: -0.5, source: 'WSJ', timestamp: new Date(Date.now() - 14400000).toISOString() }
      ])
    } finally {
      setLoading(false)
    }
  }

  const analyzeOverallSentiment = (newsData) => {
    if (!newsData || newsData.length === 0) return

    const sentiments = newsData.map(n => n.sentiment || 0)
    const avgScore = sentiments.reduce((a, b) => a + b, 0) / sentiments.length

    let label = 'neutral'
    if (avgScore > 0.3) label = 'positive'
    else if (avgScore < -0.3) label = 'negative'

    setSentimentAnalysis({
      score: avgScore,
      label,
      positive: sentiments.filter(s => s > 0).length,
      negative: sentiments.filter(s => s < 0).length,
      neutral: sentiments.filter(s => s === 0).length
    })
  }

  const filteredNews = filter === 'all'
    ? news
    : news.filter(n => n.category === filter)

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.3) return 'text-green-600'
    if (sentiment < -0.3) return 'text-red-600'
    return 'text-gray-600'
  }

  const getSentimentBadge = (sentiment) => {
    if (sentiment > 0.3) return 'bg-green-100 text-green-700'
    if (sentiment < -0.3) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const categories = ['all', 'earnings', 'analysis', 'corporate', 'market', 'regulatory', 'technical']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sentiment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`rounded-lg p-6 text-white ${
          sentimentAnalysis?.label === 'positive' ? 'bg-gradient-to-br from-green-500 to-green-600' :
            sentimentAnalysis?.label === 'negative' ? 'bg-gradient-to-br from-red-500 to-red-600' :
              'bg-gradient-to-br from-gray-500 to-gray-600'
        }`}>
          <h3 className="text-sm font-medium opacity-90">Overall Sentiment</h3>
          <p className="text-3xl font-bold mt-2 capitalize">{sentimentAnalysis?.label || 'Neutral'}</p>
          <p className="text-sm opacity-80 mt-1">{news.length} articles</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500">Positive</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{sentimentAnalysis?.positive || 0}</p>
          <p className="text-sm text-gray-400">articles</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500">Neutral</h3>
          <p className="text-3xl font-bold text-gray-600 mt-2">{sentimentAnalysis?.neutral || 0}</p>
          <p className="text-sm text-gray-400">articles</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500">Negative</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{sentimentAnalysis?.negative || 0}</p>
          <p className="text-sm text-gray-400">articles</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 text-sm rounded-full transition ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {filteredNews.map(item => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 capitalize">
                    {item.category}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getSentimentBadge(item.sentiment)}`}>
                    {item.sentimentLabel || 'neutral'}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{item.source}</span>
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment > 0 ? '+' : ''}{(item.sentiment * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No news articles found for the selected category
        </div>
      )}
    </div>
  )
}

export default NewsFeed