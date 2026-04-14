import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { HostProvider, useHost } from '../context/HostContext';
import { useAuth } from '../context/AuthContext';
import { Menu, User, Bell, Check } from 'lucide-react';
import Toast from '../components/atoms/Toast/Toast';
import './HostLayout.css';

const HostLayoutContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { listingData, updateListingData } = useHost();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const isDashboardOrLanding = location.pathname === '/become-a-host/dashboard' || location.pathname === '/become-a-host';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const steps = [
    { path: '/become-a-host/step1', name: 'Basics', description: 'Property type' },
    { path: '/become-a-host/step2', name: 'Amenities', description: 'What you offer' },
    { path: '/become-a-host/step3', name: 'Location', description: 'Where is it?' },
    { path: '/become-a-host/step4', name: 'Booking Settings', description: 'How guests book' },
    { path: '/become-a-host/step5', name: 'Photos & Title', description: 'Showcase your place' },
    { path: '/become-a-host/step6', name: 'Pricing', description: 'Set your rates' },
    { path: '/become-a-host/step7', name: 'Review', description: 'Finalize and post' }
  ];

  const currentStepIndex = steps.findIndex(step => step.path === location.pathname);
  const isHostStep = currentStepIndex !== -1;

  return (
      <div className="host-layout">
        <header className="host-header">
           <Link to="/" className="host-logo">
             <span className="logo-text">Hostify</span>
           </Link>
           <div className="host-header-actions">
             {isDashboardOrLanding && (
                <Link to="/" className="host-switch-btn">Switch to Traveling</Link>
             )}
             
             {/* Notification Icon */}
             <div className="user-menu-button" style={{ marginRight: '0px', border: 'none', padding: '10px', borderRadius: '50%', marginLeft: '8px' }}>
               <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                 <Bell size={18} />
                 <span style={{ position: 'absolute', top: '-1px', right: '0px', width: '8px', height: '8px', backgroundColor: '#ea0b2a', borderRadius: '50%', border: '1.5px solid white' }}></span>
               </div>
             </div>

             {/* User Menu */}
             <div className="user-menu-container" style={{ position: 'relative', marginLeft: '8px' }}>
                <div 
                  className="user-menu-button" 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px 5px 16px', border: '1px solid #ddd', borderRadius: '21px', cursor: 'pointer', background: 'white' }}
                >
                   {user ? (
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#222' }}>
                        {user.name?.split(' ')[0]}
                      </span>
                   ) : (
                      <User size={18} className="user-icon" />
                   )}
                   <Menu size={18} />
                </div>

                {isUserMenuOpen && (
                  <div className="user-dropdown-menu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', padding: '8px 0', width: '240px', zIndex: 100 }}>
                      <div className="menu-item" style={{ fontWeight: '600', cursor: 'default', paddingBottom: '4px' }}>{user?.name || 'User'}</div>
                      <div className="menu-item" style={{ cursor: 'default', paddingTop: '0', fontSize: '12px', color: '#717171' }}>{user?.email}</div>
                      <div style={{ height: '1px', background: '#ebebeb', margin: '8px 0' }}></div>
                      <div 
                        className="menu-item" 
                        style={{ padding: '10px 16px', cursor: 'pointer' }}
                        onClick={() => {
                          navigate('/become-a-host/dashboard?tab=profile');
                          setIsUserMenuOpen(false);
                        }}
                      >
                        Profile
                      </div>
                      <div className="menu-item" onClick={handleLogout} style={{ padding: '10px 16px', cursor: 'pointer' }}>Log out</div>
                  </div>
                )}
             </div>
           </div>
        </header>

        {/* Premium Step Indicator - Moved below Navbar */}
        {isHostStep && (
          <div className="step-indicator-strip">
            <div className="premium-step-indicator">
              {steps.map((step, index) => {
                const state = index < currentStepIndex ? 'completed' : 
                              index === currentStepIndex ? 'active' : 'future';
                return (
                  <React.Fragment key={step.path}>
                    <Link 
                      to={step.path}
                      className={`step-node ${state}`} 
                      style={{ cursor: 'pointer', textDecoration: 'none' }}
                      title={`Go to ${step.name}`}
                    >
                      <div className="node-icon">
                        {state === 'completed' && <Check size={14} color="white" strokeWidth={4} style={{ position: 'relative', top: '1px' }} />}
                        {state === 'active' && <div className="active-dot"></div>}
                      </div>
                        <div className="step-label">
                          {index < steps.length - 1 && <span className="step-number">Step {index + 1}</span>}
                          <span className="step-name">{step.name}</span>
                        </div>
                    </Link>
                    {index < steps.length - 1 && (
                      <div className={`step-connector ${index < currentStepIndex ? 'completed' : ''}`}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
        <main className="host-main">
          <Outlet />
        </main>

        <Toast 
          notification={listingData.notification} 
          onClear={() => updateListingData({ notification: null })} 
        />
      </div>
  );
};

export default HostLayoutContent;
