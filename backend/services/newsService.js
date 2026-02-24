// News Service
// Fetches and analyzes news for stocks

import axios from 'axios';

// Sample news data (can be replaced with real API)
const sampleNews = [
  { title: 'Market Updates', source: 'Reuters', sentiment: 'neutral' },
  { title: 'Tech Stocks Rally', source: 'Bloomberg', sentiment: 'positive' },
  { title: 'Fed Rate Decision', source: 'CNBC', sentiment: 'neutral' },
  { title: 'Earnings Report', source: 'MarketWatch', sentiment: 'positive' },
  { title: 'Global Markets Down', source: 'WSJ', sentiment: 'negative' }
];

// Get news for a symbol
export async function getNews(symbol, limit = 20) {
  // In production, you would use a news API like:
  // - NewsAPI (newsapi.org)
  // - Finnhub (finnhub.io)
  // - Alpha Vantage

  try {
    // For demo purposes, return simulated news
    // In production, replace with actual API call

    // Simulate news based on market conditions
    const news = generateSimulatedNews(symbol, limit);
    return news;
  } catch (error) {
    console.error('Error fetching news:', error);
    // Return fallback news
    return generateSimulatedNews(symbol, limit);
  }
}

// Generate simulated news for demo
function generateSimulatedNews(symbol, limit) {
  const baseNews = [
    { title: `${symbol} Reports Strong Q4 Earnings`, category: 'earnings', sentiment: 0.6 },
    { title: `Analysts Upgrade ${symbol} to Buy`, category: 'analysis', sentiment: 0.7 },
    { title: `${symbol} Announces New Product Launch`, category: 'corporate', sentiment: 0.5 },
    { title: `Market Volatility Impacts ${symbol}`, category: 'market', sentiment: -0.3 },
    { title: `${symbol} Faces Regulatory Challenge`, category: 'regulatory', sentiment: -0.5 },
    { title: `Sector Rotation Benefits ${symbol}`, category: 'market', sentiment: 0.4 },
    { title: `${symbol} CEO Discusses Future Plans`, category: 'corporate', sentiment: 0.3 },
    { title: `Technical Analysis: ${symbol} at Support`, category: 'technical', sentiment: 0.2 },
    { title: `Institutional Investors Increase ${symbol} Holdings`, category: 'institutional', sentiment: 0.5 },
    { title: `${symbol} Dividend Announcement`, category: 'dividend', sentiment: 0.4 },
    { title: `Global Market Trends Affect ${symbol}`, category: 'market', sentiment: -0.1 },
    { title: `${symbol} Expands International Operations`, category: 'corporate', sentiment: 0.6 },
    { title: `Options Activity Surges for ${symbol}`, category: 'options', sentiment: 0.3 },
    { title: `${symbol} Supply Chain Update`, category: 'operational', sentiment: -0.2 },
    { title: `Economic Data Impacts ${symbol}`, category: 'economic', sentiment: -0.1 },
    { title: `${symbol} vs Competitors: Market Position`, category: 'analysis', sentiment: 0.2 },
    { title: `Inflation Concerns Affect ${symbol}`, category: 'economic', sentiment: -0.4 },
    { title: `${symbol} Customer Base Grows`, category: 'corporate', sentiment: 0.5 },
    { title: `Technical Breakout for ${symbol}`, category: 'technical', sentiment: 0.6 },
    { title: `${symbol} Management Outlook Positive`, category: 'corporate', sentiment: 0.5 }
  ];

  return baseNews.slice(0, limit).map((item, index) => ({
    id: index + 1,
    title: item.title,
    symbol,
    category: item.category,
    sentiment: item.sentiment,
    sentimentLabel: item.sentiment > 0.3 ? 'positive' : item.sentiment < -0.3 ? 'negative' : 'neutral',
    source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'WSJ'][Math.floor(Math.random() * 5)],
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
    url: '#'
  }));
}

// Analyze sentiment of text
export function analyzeSentiment(text) {
  // Simple word-based sentiment analysis
  // In production, use a proper NLP library

  const positiveWords = [
    'gain', 'rise', 'up', 'bullish', 'buy', 'upgrade', 'strong', 'profit',
    'growth', 'positive', 'optimistic', 'increase', 'high', 'rally', 'surge',
    'boost', 'improve', 'success', 'breakout', 'opportunity'
  ];

  const negativeWords = [
    'loss', 'fall', 'down', 'bearish', 'sell', 'downgrade', 'weak', 'decline',
    'negative', 'pessimistic', 'decrease', 'low', 'drop', 'crash', 'warning',
    'risk', 'concern', 'fear', 'recession', 'volatile'
  ];

  const words = text.toLowerCase().split(/\W+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  let score = 0;
  let label = 'neutral';

  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
  }

  if (score > 0.3) {
    label = 'positive';
  } else if (score < -0.3) {
    label = 'negative';
  }

  return {
    score,
    label,
    positiveCount,
    negativeCount,
    confidence: Math.min(1, total / 5)
  };
}

// Analyze news sentiment for a symbol
export function analyzeNewsSentiment(news) {
  if (!news || news.length === 0) {
    return { score: 0, label: 'neutral', count: 0 };
  }

  const sentiments = news.map(n => n.sentiment || 0);
  const avgScore = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

  let label = 'neutral';
  if (avgScore > 0.3) {
    label = 'positive';
  } else if (avgScore < -0.3) {
    label = 'negative';
  }

  return {
    score: avgScore,
    label,
    count: news.length,
    positive: sentiments.filter(s => s > 0).length,
    negative: sentiments.filter(s => s < 0).length,
    neutral: sentiments.filter(s => s === 0).length
  };
}

// Correlate news sentiment with price movement
export function correlateNewsWithPrice(news, priceChanges) {
  if (!news || news.length === 0 || !priceChanges || priceChanges.length === 0) {
    return { correlation: 0, confidence: 0 };
  }

  // Simple correlation analysis
  const minLength = Math.min(news.length, priceChanges.length);
  const sentimentData = news.slice(0, minLength).map(n => n.sentiment || 0);
  const priceData = priceChanges.slice(0, minLength);

  // Calculate correlation coefficient
  const meanSentiment = sentimentData.reduce((a, b) => a + b, 0) / minLength;
  const meanPrice = priceData.reduce((a, b) => a + b, 0) / minLength;

  let numerator = 0;
  let denomSentiment = 0;
  let denomPrice = 0;

  for (let i = 0; i < minLength; i++) {
    const sDiff = sentimentData[i] - meanSentiment;
    const pDiff = priceData[i] - meanPrice;
    numerator += sDiff * pDiff;
    denomSentiment += sDiff * sDiff;
    denomPrice += pDiff * pDiff;
  }

  const correlation = numerator / Math.sqrt(denomSentiment * denomPrice);

  return {
    correlation: isNaN(correlation) ? 0 : correlation,
    confidence: Math.min(1, minLength / 10),
    interpretation: correlation > 0.5 ? 'Strong positive correlation' :
      correlation > 0.2 ? 'Moderate positive correlation' :
        correlation < -0.5 ? 'Strong negative correlation' :
          correlation < -0.2 ? 'Moderate negative correlation' :
            'No significant correlation'
  };
}

// Get market news (general)
export async function getMarketNews(limit = 20) {
  // Simulated market news
  const marketNews = [
    { title: 'Fed Signals Rate Decision', category: 'central_bank', sentiment: -0.2 },
    { title: 'Global Markets Mixed', category: 'market', sentiment: 0 },
    { title: 'Tech Sector Leads Rally', category: 'sector', sentiment: 0.5 },
    { title: 'Oil Prices Surge', category: 'commodity', sentiment: -0.3 },
    { title: 'Job Data Beats Expectations', category: 'economic', sentiment: 0.4 }
  ];

  return marketNews.slice(0, limit).map((item, index) => ({
    id: index + 1,
    title: item.title,
    category: item.category,
    sentiment: item.sentiment,
    sentimentLabel: item.sentiment > 0.3 ? 'positive' : item.sentiment < -0.3 ? 'negative' : 'neutral',
    source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'WSJ'][Math.floor(Math.random() * 5)],
    timestamp: new Date(Date.now() - index * 3600000).toISOString(),
    url: '#'
  }));
}