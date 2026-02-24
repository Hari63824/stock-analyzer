import axios from 'axios'

const API_BASE = 'https://stock-analyzer-api.onrender.com/api'

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

// Stock data endpoints
export const getQuote = async (symbol) => {
  const response = await api.get(`/quote/${symbol}`)
  return response.data
}

export const getHistoricalData = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/historical/${symbol}`, {
    params: { period, interval }
  })
  return response.data
}

export const searchSymbols = async (query) => {
  const response = await api.get('/search', { params: { q: query } })
  return response.data
}

export const getOptionsChain = async (symbol) => {
  const response = await api.get(`/options/${symbol}`)
  return response.data
}

// Technical indicators
export const getIndicators = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/indicators/${symbol}`, {
    params: { period, interval }
  })
  return response.data
}

// Options pricing
export const calculateOptionPrice = async (params) => {
  const response = await api.post('/options/price', params)
  return response.data
}

export const calculateImpliedVolatility = async (params) => {
  const response = await api.post('/options/implied-volatility', params)
  return response.data
}

// Trading strategies
export const getStrategySignals = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/strategies/${symbol}`, {
    params: { period, interval }
  })
  return response.data
}

// News
export const getNews = async (symbol, limit = 20) => {
  const response = await api.get('/news', { params: { symbol, limit } })
  return response.data
}

export const analyzeSentiment = async (text) => {
  const response = await api.post('/news/sentiment', { text })
  return response.data
}

// Prediction
export const getPrediction = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/prediction/${symbol}`, {
    params: { period, interval }
  })
  return response.data
}

// Dashboard data
export const getDashboardData = async () => {
  const response = await api.get('/dashboard')
  return response.data
}

// Paper Trading
export const getPortfolio = async () => {
  const response = await api.get('/portfolio')
  return response.data
}

export const buyStock = async (symbol, quantity) => {
  const response = await api.post('/trade/buy', { symbol, quantity })
  return response.data
}

export const sellStock = async (symbol, quantity) => {
  const response = await api.post('/trade/sell', { symbol, quantity })
  return response.data
}

export const getOrderBook = async (symbol) => {
  const response = await api.get(`/orderbook/${symbol}`)
  return response.data
}

export const resetPortfolio = async () => {
  const response = await api.post('/portfolio/reset')
  return response.data
}

export default api