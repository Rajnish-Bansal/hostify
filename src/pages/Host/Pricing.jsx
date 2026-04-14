import React, { useState, useEffect } from 'react';
import { Check, Zap, Shield, Crown, Loader2, Sparkles } from 'lucide-react';
import { fetchPlans, subscribeToPlan, fetchSubscriptionStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Pricing.css';

const Pricing = ({ listingId, onSubscribed }) => {
  const { updateUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plansData = await fetchPlans();
        setPlans(plansData);
      } catch (err) {
        console.error('Failed to load subscription plans:', err);
      }

      if (listingId) {
        try {
          const statusData = await fetchSubscriptionStatus(listingId);
          setCurrentSubscription(statusData);
        } catch (err) {
          console.error('Failed to load subscription status:', err);
        }
      }
      
      setLoading(false);
    };
    loadPlans();
  }, [listingId]);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    setMessage(null);
    try {
      const result = await subscribeToPlan(planId, listingId);
      setCurrentSubscription(result.subscription);
      if (onSubscribed) onSubscribed(result.subscription);
      setMessage({ type: 'success', text: `Successfully upgraded to ${planId}!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="pricing-loading">
        <Loader2 className="animate-spin" />
        <span>Loading plans...</span>
      </div>
    );
  }

  return (
    <div className="pricing-container aesthetic-bg">

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="plans-grid">
        {plans.map((plan) => {
          const isActive = currentSubscription?.plan === plan.id && currentSubscription?.status === 'Active';
          
          return (
            <div key={plan.id} className={`plan-card ${plan.id.toLowerCase()} ${isActive ? 'current' : ''}`}>
              {isActive && <div className="current-badge">Active Listing</div>}
              
              <div className="plan-icon">
                <Shield size={32} />
              </div>

              <h2 className="plan-name">{plan.name}</h2>
              <div className="plan-price">
                <span className="currency">₹</span>
                <span className="amount">{plan.price}</span>
                <span className="period">/30 days</span>
              </div>

              <div className="plan-limits">
                <div className="limit-item">
                  <strong>30 Days</strong> Placement
                </div>
                <div className="limit-item">
                  <strong>{plan.commission}%</strong> Commission
                </div>
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                className={`plan-btn ${isActive ? 'btn-current' : ''}`}
                disabled={isActive || subscribing}
                onClick={() => handleSubscribe(plan.id)}
              >
                {subscribing === plan.id ? 'Activating...' : isActive ? 'Active' : 'Activate Now'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pricing-footer">
        <p>Questions about listing? <a href="#">Chat with Support</a></p>
      </div>
    </div>
  );
};

export default Pricing;
