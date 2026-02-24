import React, { useState } from 'react';
import { createStripeCheckout, createRazorpayOrder, verifyRazorpayPayment, verifyStripePayment } from '../services/api';

const PremiumModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePayment = async () => {
    setError('');
    setLoading(true);

    try {
      if (paymentMethod === 'stripe') {
        const { url, demoMode } = await createStripeCheckout();
        if (demoMode) {
          // Demo mode - verify immediately
          await verifyStripePayment('demo_session', null);
          onSuccess();
          onClose();
        } else {
          window.location.href = url;
        }
      } else {
        const order = await createRazorpayOrder();

        if (order.demoMode) {
          // Demo mode - simulate successful payment
          await verifyRazorpayPayment(
            order.orderId,
            `demo_payment_${Date.now()}`,
            'demo_signature'
          );
          onSuccess();
          onClose();
        } else if (window.Razorpay) {
          // Open Razorpay checkout
          const rzp = new window.Razorpay({
            key: 'rzp_test_placeholder',
            order_id: order.orderId,
            amount: order.amount,
            currency: order.currency,
            name: 'Stock Analizer Premium',
            description: 'Full access to premium features - ₹499/month',
            handler: async (response) => {
              try {
                await verifyRazorpayPayment(
                  order.orderId,
                  response.razorpay_payment_id,
                  response.razorpay_signature
                );
                onSuccess();
                onClose();
              } catch (err) {
                setError('Payment verification failed');
              }
            },
            theme: {
              color: '#059669'
            }
          });
          rzp.open();
        } else {
          alert('Razorpay SDK not loaded. In production, this would open the Razorpay checkout.');
          onSuccess();
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: '🤖', title: 'Advanced AI Predictions', desc: 'Multi-timeframe analysis with pattern recognition' },
    { icon: '🔔', title: 'Real-time Alerts', desc: 'Get notified when prices hit your targets' },
    { icon: '📊', title: 'Premium Portfolio', desc: 'Track your investments with live prices' },
    { icon: '📄', title: 'Technical Reports', desc: 'Generate PDF analysis reports' },
    { icon: '🎯', title: 'Fibonacci Levels', desc: 'Professional support/resistance analysis' },
    { icon: '📈', title: 'Pattern Recognition', desc: 'Auto-detect chart patterns' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-white text-xs font-semibold">
            PREMIUM
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-4xl">👑</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Upgrade to Premium</h2>
          <p className="text-white/80 text-sm mt-1">Unlock all premium features</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Price */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-slate-900">
              ₹499<span className="text-lg font-normal text-slate-500">/month</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Cancel anytime</p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">{feature.title}</h4>
                  <p className="text-xs text-slate-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Payment method selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('razorpay')}
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === 'razorpay'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-900">Razorpay</div>
                <div className="text-xs text-slate-500">India (UPI/Cards)</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-900">Stripe</div>
                <div className="text-xs text-slate-500">International (Cards)</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 text-lg"
          >
            {loading ? 'Processing...' : `Pay ₹499 with ${paymentMethod === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
          </button>

          <p className="text-center text-slate-500 text-xs mt-4">
            By subscribing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PremiumModal;