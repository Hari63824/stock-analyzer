import axios from 'axios';

const API_BASE = 'https://stock-analyzer-zfyb.onrender.com/api';

// Create axios instance with defaults
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ============ AUTH API ============

export const register = async (email, password, name) => {
  const response = await api.post('/auth/register', { email, password, name });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

// ============ PAYMENT API ============

export const createStripeCheckout = async () => {
  const response = await api.post('/payment/create-checkout-session');
  return response.data;
};

export const createRazorpayOrder = async () => {
  const response = await api.post('/payment/create-razorpay-order');
  return response.data;
};

export const verifyRazorpayPayment = async (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const response = await api.post('/payment/verify-razorpay', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  });
  return response.data;
};

export const verifyStripePayment = async (sessionId) => {
  const response = await api.post('/payment/verify-stripe', { sessionId });
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await api.get('/payment/subscription');
  return response.data;
};

// ============ PREMIUM PREDICTIONS API ============

export const getAdvancedPrediction = async (symbol) => {
  const response = await api.get(`/premium/predictions/advanced/${symbol}`);
  return response.data;
};

// Basic prediction (non-premium)
export const getPrediction = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/prediction/${symbol}`, {
    params: { period, interval }
  });
  return response.data;
};

// ============ PREMIUM ALERTS API ============

export const createAlert = async (symbol, targetPrice, condition = 'above') => {
  const response = await api.post('/premium/alerts', { symbol, targetPrice, condition });
  return response.data;
};

export const getAlerts = async () => {
  const response = await api.get('/premium/alerts');
  return response.data;
};

export const deleteAlert = async (alertId) => {
  const response = await api.delete(`/premium/alerts/${alertId}`);
  return response.data;
};

// ============ PREMIUM PORTFOLIO API ============

export const getPremiumPortfolio = async () => {
  const response = await api.get('/premium/portfolio');
  return response.data;
};

export const addToPortfolio = async (symbol, quantity, price) => {
  const response = await api.post('/premium/portfolio', { symbol, quantity, price });
  return response.data;
};

export const sellFromPortfolio = async (symbol, quantity) => {
  const response = await api.post('/premium/portfolio/sell', { symbol, quantity });
  return response.data;
};

export const getPortfolioHistory = async (period = '1mo') => {
  const response = await api.get('/premium/portfolio/history', { params: { period } });
  return response.data;
};

export const getPortfolioTransactions = async (limit = 50) => {
  const response = await api.get('/premium/portfolio/transactions', { params: { limit } });
  return response.data;
};

// ============ PREMIUM REPORTS API ============

export const getTechnicalReport = async (symbol) => {
  const response = await api.get(`/premium/report/${symbol}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getPortfolioReport = async () => {
  const response = await api.get('/premium/report/portfolio', {
    responseType: 'blob'
  });
  return response.data;
};

// ============ STANDARD API (existing) ============

export const getQuote = async (symbol) => {
  const response = await api.get(`/quote/${symbol}`);
  return response.data;
};

export const getHistoricalData = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/historical/${symbol}`, {
    params: { period, interval }
  });
  return response.data;
};

export const searchSymbols = async (query) => {
  const response = await api.get('/search', { params: { q: query } });
  return response.data;
};

export const getOptionsChain = async (symbol) => {
  const response = await api.get(`/options/${symbol}`);
  return response.data;
};

export const getIndicators = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/indicators/${symbol}`, {
    params: { period, interval }
  });
  return response.data;
};

export const calculateOptionPrice = async (params) => {
  const response = await api.post('/options/price', params);
  return response.data;
};

export const calculateImpliedVolatility = async (params) => {
  const response = await api.post('/options/implied-volatility', params);
  return response.data;
};

export const getStrategySignals = async (symbol, period = '1y', interval = '1d') => {
  const response = await api.get(`/strategies/${symbol}`, {
    params: { period, interval }
  });
  return response.data;
};

export const getNews = async (symbol, limit = 20) => {
  const response = await api.get('/news', { params: { symbol, limit } });
  return response.data;
};

export const analyzeSentiment = async (text) => {
  const response = await api.post('/news/sentiment', { text });
  return response.data;
};

export const getDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const getPortfolio = async () => {
  const response = await api.get('/portfolio');
  return response.data;
};

export const buyStock = async (symbol, quantity) => {
  const response = await api.post('/trade/buy', { symbol, quantity });
  return response.data;
};

export const sellStock = async (symbol, quantity) => {
  const response = await api.post('/trade/sell', { symbol, quantity });
  return response.data;
};

export const getOrderBook = async (symbol) => {
  const response = await api.get(`/orderbook/${symbol}`);
  return response.data;
};

export const resetPortfolio = async () => {
  const response = await api.post('/portfolio/reset');
  return response.data;
};

export default api;