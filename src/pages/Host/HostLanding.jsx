import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Home, ChevronRight, X } from 'lucide-react';
import { useHost } from '../../context/HostContext';
import './HostLanding.css';
import hostHero from '../../assets/host_hero.png';

const HostLanding = () => {
  const { listings, importAirbnbListing } = useHost();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (listings && listings.length > 0) {
      navigate('/become-a-host/dashboard');
    }
  }, [listings, navigate]);

  const handleImport = async () => {
    if (!airbnbUrl) return;
    setIsImporting(true);
    setError(null);
    try {
      await importAirbnbListing(airbnbUrl);
      navigate('/become-a-host/step1');
    } catch (err) {
      setError(err.message || 'Failed to import listing. Please check the URL.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="host-landing-container">
      {/* Hero Section */}
      <section className="host-hero-section">
        <div className="hero-background">
          <img src={hostHero} alt="Luxury Cabin" />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <h1 className="hero-title">Hostify it.</h1>
          <p className="hero-subtitle">Turn your space into a premium retreat and start earning.</p>
        </div>
      </section>

      {/* Onboarding Options */}
      <section className="onboarding-options-section">
        <div className="options-grid">
          {/* Manual Setup */}
          <Link to="/become-a-host/step1" className="premium-setup-card manual-setup">
            <div className="card-icon-wrapper">
              <Home size={32} />
            </div>
            <div className="card-text">
              <h3>Hostify Setup</h3>
              <p>Craft your perfect listing manually with our expert guidance and best-in-class tools.</p>
            </div>
            <div className="card-action-hint">
              Start manual setup <ChevronRight size={18} />
            </div>
          </Link>

          {/* Magic Import */}
          <div className="premium-setup-card magic-setup" onClick={() => setIsModalOpen(true)}>
            <div className="card-icon-wrapper">
              <Sparkles size={32} />
            </div>
            <div className="card-text">
              <h3>Magic Import</h3>
              <p>Coming from another platform? Onboard instantly by importing your existing listing details in one click.</p>
            </div>
            <div className="card-action-hint">
              Try magic import <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* Magic Import Modal */}
      {isModalOpen && (
        <div className="import-modal-overlay">
          <div className="import-modal-content">
            <button className="close-btn-modal" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '32px', right: '32px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={24} />
            </button>
            
            <div className="modal-header-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ background: '#fff7ed', color: '#f97316', padding: '20px', borderRadius: '24px' }}>
                <Sparkles size={40} />
              </div>
            </div>
            
            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>Magic Import</h2>
            <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '40px', lineHeight: '1.6' }}>
              Paste your existing listing URL below. Our AI will handle the rest, syncing your photos, description, and amenities.
            </p>

            {isImporting ? (
              <div className="importing-state">
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <p style={{ fontWeight: '600', color: '#0f172a' }}>Synthesizing listing data...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div className="import-form">
                <input 
                  type="text" 
                  placeholder="https://www.platform.com/rooms/..." 
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  className="modal-input"
                />
                {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '20px', fontWeight: '500' }}>{error}</p>}
                <button 
                  onClick={handleImport}
                  disabled={!airbnbUrl}
                  className="btn-magic-start"
                  style={{ opacity: airbnbUrl ? 1 : 0.6 }}
                >
                  Confirm & Sync
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostLanding;
