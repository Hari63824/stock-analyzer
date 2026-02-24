// Technical Analysis Report Service
// Generate PDF reports for premium users

import PDFDocument from 'pdfkit';
import { getQuote, getHistoricalData } from './yahooFinance.js';
import { calculateAllIndicators } from './technicalIndicators.js';
import { getPrediction } from './predictionEngine.js';
import { getAdvancedPrediction } from './predictionPremium.js';

// Generate a comprehensive technical analysis PDF
export async function generateTechnicalReport(symbol, isPremium = false) {
  // Get all data
  const quote = await getQuote(symbol);
  const historical = await getHistoricalData(symbol, '6mo', '1d');
  const indicators = calculateAllIndicators(historical);
  const basicPrediction = await getPrediction(historical, symbol);

  let premiumPrediction = null;
  if (isPremium) {
    try {
      premiumPrediction = await getAdvancedPrediction(symbol);
    } catch (e) {
      console.error('Premium prediction unavailable:', e);
    }
  }

  // Create PDF document
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve({
        pdf: pdfBuffer,
        filename: `${symbol}_analysis_${new Date().toISOString().split('T')[0]}.pdf`
      });
    });
    doc.on('error', reject);

    // Title
    doc.fontSize(24).fillColor('#1a365d').text('Technical Analysis Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#4a5568').text(`${symbol} - ${quote.shortName || quote.longName || symbol}`, { align: 'center' });
    doc.fontSize(12).fillColor('#718096').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Current Price Section
    doc.fontSize(16).fillColor('#1a365d').text('Current Market Data');
    doc.moveDown(0.5);

    const currentPrice = quote.regularMarketPrice || quote.currentPrice;
    const change = quote.regularMarketChange || quote.change || 0;
    const changePercent = quote.regularMarketChangePercent || quote.changePercent || 0;

    doc.fontSize(12).fillColor('#2d3748');
    doc.text(`Current Price: ₹${currentPrice?.toFixed(2) || 'N/A'}`);
    doc.text(`Day Change: ${change >= 0 ? '+' : ''}${change?.toFixed(2) || 0} (${changePercent?.toFixed(2) || 0}%)`);
    doc.text(`Day High: ₹${quote.regularMarketDayHigh?.toFixed(2) || 'N/A'}`);
    doc.text(`Day Low: ₹${quote.regularMarketDayLow?.toFixed(2) || 'N/A'}`);
    doc.text(`52 Week High: ₹${quote.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}`);
    doc.text(`52 Week Low: ₹${quote.fiftyTwoWeekLow?.toFixed(2) || 'N/A'}`);
    doc.moveDown(2);

    // Technical Indicators
    doc.fontSize(16).fillColor('#1a365d').text('Technical Indicators');
    doc.moveDown(0.5);

    // Get latest indicator values
    const sma20 = indicators.sma20[indicators.sma20.length - 1];
    const sma50 = indicators.sma50[indicators.sma50.length - 1];
    const ema12 = indicators.ema12[indicators.ema12.length - 1];
    const ema26 = indicators.ema26[indicators.ema26.length - 1];
    const rsi = indicators.rsi[indicators.rsi.length - 1];
    const macd = indicators.macd.macd[indicators.macd.macd.length - 1];
    const macdSignal = indicators.macd.signal[indicators.macd.signal.length - 1];

    doc.fontSize(12).fillColor('#2d3748');
    doc.text(`SMA 20: ₹${sma20?.toFixed(2) || 'N/A'}`);
    doc.text(`SMA 50: ₹${sma50?.toFixed(2) || 'N/A'}`);
    doc.text(`EMA 12: ₹${ema12?.toFixed(2) || 'N/A'}`);
    doc.text(`EMA 26: ₹${ema26?.toFixed(2) || 'N/A'}`);
    doc.text(`RSI (14): ${rsi?.toFixed(2) || 'N/A'}`);
    doc.text(`MACD: ${macd?.toFixed(2) || 'N/A'}`);
    doc.text(`MACD Signal: ${macdSignal?.toFixed(2) || 'N/A'}`);
    doc.moveDown(2);

    // Basic Prediction
    doc.fontSize(16).fillColor('#1a365d').text('Price Prediction');
    doc.moveDown(0.5);

    doc.fontSize(12).fillColor('#2d3748');
    doc.text(`Signal: ${basicPrediction.signal || 'N/A'}`);
    doc.text(`Confidence: ${basicPrediction.confidence || 0}%`);
    doc.text(`Bullish Signals: ${basicPrediction.bullishPercent || 0}%`);

    if (basicPrediction.target) {
      doc.text(`Target High: ₹${basicPrediction.target.high?.toFixed(2) || 'N/A'}`);
      doc.text(`Target Low: ₹${basicPrediction.target.low?.toFixed(2) || 'N/A'}`);
    }
    doc.moveDown(2);

    // Premium Prediction (if available)
    if (isPremium && premiumPrediction) {
      doc.fontSize(16).fillColor('#1a365d').text('Advanced AI Prediction (Premium)');
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#2d3748');
      doc.text(`AI Signal: ${premiumPrediction.signal || 'N/A'}`);
      doc.text(`AI Confidence: ${premiumPrediction.confidence || 0}%`);
      doc.text(`Bullish Score: ${premiumPrediction.bullishPercent || 0}%`);

      if (premiumPrediction.recommendation) {
        const rec = premiumPrediction.recommendation;
        doc.moveDown(0.5);
        doc.fillColor('#2b6cb0').text('Trading Recommendation:');
        doc.fillColor('#2d3748');
        doc.text(`Action: ${rec.action}`);
        if (rec.entry) doc.text(`Entry: ₹${rec.entry?.toFixed(2)}`);
        if (rec.stopLoss) doc.text(`Stop Loss: ₹${rec.stopLoss?.toFixed(2)}`);
        if (rec.target1) doc.text(`Target 1: ₹${rec.target1?.toFixed(2)}`);
        if (rec.riskReward) doc.text(`Risk/Reward: ${rec.riskReward}`);
      }

      // Add pattern signals
      if (premiumPrediction.components?.patterns?.patterns) {
        doc.moveDown(0.5);
        doc.fillColor('#2b6cb0').text('Pattern Analysis:');
        doc.fillColor('#2d3748');
        premiumPrediction.components.patterns.patterns.forEach(p => {
          doc.text(`- ${p.name}: ${p.signal} (${p.confidence}% confidence)`);
        });
      }

      // Add Fibonacci levels
      if (premiumPrediction.components?.fibonacci?.levels) {
        doc.moveDown(0.5);
        doc.fillColor('#2b6cb0').text('Fibonacci Levels:');
        doc.fillColor('#2d3748');
        const fib = premiumPrediction.components.fibonacci.levels;
        doc.text(`Support (61.8%): ₹${fib.level618?.toFixed(2)}`);
        doc.text(`Resistance (38.2%): ₹${fib.level382?.toFixed(2)}`);
      }
    }

    // Disclaimer
    doc.moveDown(3);
    doc.fontSize(10).fillColor('#718096');
    doc.text('DISCLAIMER:', { underline: true });
    doc.text('This report is for educational purposes only and should not be considered as financial advice.');
    doc.text('Stock market investments involve risk. Past performance does not guarantee future results.');
    doc.text('Always consult with a qualified financial advisor before making investment decisions.');

    doc.end();
  });
}

// Generate portfolio summary report
export async function generatePortfolioReport(portfolioData, isPremium = false) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve({
        pdf: pdfBuffer,
        filename: `portfolio_${new Date().toISOString().split('T')[0]}.pdf`
      });
    });
    doc.on('error', reject);

    // Title
    doc.fontSize(24).fillColor('#1a365d').text('Portfolio Summary Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#718096').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    if (portfolioData.summary) {
      doc.fontSize(16).fillColor('#1a365d').text('Portfolio Summary');
      doc.moveDown(0.5);

      const s = portfolioData.summary;
      doc.fontSize(12).fillColor('#2d3748');
      doc.text(`Total Invested: ₹${s.totalInvested?.toFixed(2) || 0}`);
      doc.text(`Current Value: ₹${s.totalCurrentValue?.toFixed(2) || 0}`);
      doc.text(`Total P/L: ₹${s.totalProfitLoss?.toFixed(2) || 0} (${s.totalProfitLossPercent?.toFixed(2) || 0}%)`);
      doc.text(`Number of Positions: ${s.positionCount || 0}`);
      doc.moveDown(2);
    }

    // Positions
    if (portfolioData.positions && portfolioData.positions.length > 0) {
      doc.fontSize(16).fillColor('#1a365d').text('Holdings');
      doc.moveDown(0.5);

      // Table header
      doc.fontSize(10).fillColor('#4a5568');
      doc.text('Symbol', 50, doc.y, { width: 80 });
      doc.text('Qty', 130, doc.y, { width: 40 });
      doc.text('Avg Price', 170, doc.y, { width: 70 });
      doc.text('Current', 240, doc.y, { width: 70 });
      doc.text('P/L', 310, doc.y, { width: 70 });
      doc.text('P/L %', 380, doc.y, { width: 60 });
      doc.moveDown();

      // Table rows
      doc.fontSize(10).fillColor('#2d3748');
      portfolioData.positions.forEach(pos => {
        const plColor = pos.profitLoss >= 0 ? '#059669' : '#dc2626';
        doc.fillColor('#2d3748');
        doc.text(pos.symbol, 50, doc.y, { width: 80 });
        doc.text(pos.quantity.toString(), 130, doc.y, { width: 40 });
        doc.text(`₹${pos.avgPrice?.toFixed(2)}`, 170, doc.y, { width: 70 });
        doc.text(`₹${pos.currentPrice?.toFixed(2)}`, 240, doc.y, { width: 70 });
        doc.fillColor(plColor);
        doc.text(`₹${pos.profitLoss?.toFixed(2)}`, 310, doc.y, { width: 70 });
        doc.text(`${pos.profitLossPercent?.toFixed(2)}%`, 380, doc.y, { width: 60 });
        doc.moveDown();
      });
    }

    // Premium features
    if (isPremium && portfolioData.history) {
      doc.moveDown(2);
      doc.fontSize(16).fillColor('#1a365d').text('Performance History');
      doc.moveDown(0.5);

      if (portfolioData.history.summary) {
        const h = portfolioData.history.summary;
        doc.fontSize(12).fillColor('#2d3748');
        doc.text(`Period Start: ₹${h.startValue?.toFixed(2)}`);
        doc.text(`Period End: ₹${h.endValue?.toFixed(2)}`);
        doc.text(`Return: ₹${h.return?.toFixed(2)} (${h.returnPercent?.toFixed(2)}%)`);
      }
    }

    // Disclaimer
    doc.moveDown(3);
    doc.fontSize(10).fillColor('#718096');
    doc.text('DISCLAIMER: This report is for informational purposes only.');

    doc.end();
  });
}

export default {
  generateTechnicalReport,
  generatePortfolioReport
};