import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Globe, Menu, User, Bell } from 'lucide-react';
import { useHost } from '../../../context/HostContext';
import { useAuth } from '../../../context/AuthContext';
import AuthModal from '../../molecules/AuthModal/AuthModal';
import './Navbar.css';

const Navbar = ({ onSearch, onLogoClick, scrolled }) => {
  const { listings } = useHost();
  const { user, logout, isAuthModalOpen, openAuthModal, closeAuthModal, allUsers } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  
  const userMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const isHost = listings && listings.length > 0;
  const isHostMode = location.pathname.startsWith('/become-a-host');

  const handleAuthComplete = (userData) => {
    if (userData) {
      // Check if user is a host in DB, or was passed explicitly
      const userInDb = allUsers?.find(u => u.email === userData.email);
      const isHostUser = userInDb?.role === 'Host' || userData.isHost;
      userData.isHost = isHostUser;

      if (redirectAfterLogin) {
        navigate(redirectAfterLogin);
        setRedirectAfterLogin(null);
      } else if (isHostUser) {
        navigate('/become-a-host');
      }
    } else {
      closeAuthModal();
      setRedirectAfterLogin(null);
      navigate('/');
    }
  };
  
  // Close search when scrolling could be a nice touch, but let's stick to click-outside for now.

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-logo">
            <Link 
              to="/" 
              className="logo-wrapper"
              onClick={() => {
                if (onLogoClick) onLogoClick();
              }}
            >
               <span className="logo-icon">🌿</span>
               <span className="logo-text">Hostify</span>
            </Link>
            <span className="navbar-made-in-india"><span>🇮🇳</span> Made in India</span>
          </div>

          {/* Search Pill - Only visible on scroll */}
          {scrolled && (
            <div className="navbar-search-pill" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="search-pill-content">
                <span className="pill-text">Anywhere • Any week • Add guests</span>
                <div className="pill-search-icon">
                  <Menu size={12} className="pill-icon-inner" />
                </div>
              </div>
            </div>
          )}

          {/* User Menu */}
          <div className="navbar-user">
            {user ? (
               isHostMode ? (
                  <Link to="/" className="host-switch-btn">Switch to Traveling</Link>
               ) : isHost ? (
                  <Link to="/become-a-host/dashboard" className="host-link">Switch to hosting</Link>
               ) : (
                  <Link to="/become-a-host" className="host-link">Become a host</Link>
               )
            ) : (
               <div className="host-link" onClick={() => { setRedirectAfterLogin('/become-a-host'); openAuthModal(); }} style={{cursor: 'pointer'}}>Become a host</div>
            )}
            
            {/* Globe icon removed */}
            
            <Link to="/notifications" className="globe-button" style={{ marginLeft: '8px', cursor: 'pointer', color: 'inherit', textDecoration: 'none', padding: '12px' }}>
               <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                 <Bell size={18} />
               </span>
            </Link>

            <div className="user-menu-container" style={{ position: 'relative' }} ref={userMenuRef}>
                <div 
                  className="user-menu-button" 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                   {user ? (
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#222', marginLeft: '4px', marginRight: '8px' }}>
                        {user.name?.split(' ')[0]}
                      </span>
                   ) : (
                      <User size={18} className="user-icon" />
                   )}
                   <Menu size={18} />
                </div>

                {isUserMenuOpen && (
                  <div className="user-dropdown-menu">
                     {user ? (
                        <>
                      {/* Name Display */}
                      <Link to="/profile" className="menu-item-bold" style={{ cursor: 'pointer', paddingBottom: '4px', textDecoration: 'none', display: 'block', color: 'inherit' }}>{user.name || 'User'}</Link>
                      <div className="menu-item" style={{ cursor: 'default', paddingTop: '0', fontSize: '12px', color: '#717171' }}>{user.email}</div>
                      <div className="menu-divider"></div>
                      
                      <Link to="/inbox" className="menu-item-bold" style={{textDecoration: 'none', display: 'block', color: 'inherit'}} onClick={() => setIsUserMenuOpen(false)}>Messages</Link>
                      <Link to="/notifications" className="menu-item-bold" style={{textDecoration: 'none', display: 'block', color: 'inherit'}} onClick={() => setIsUserMenuOpen(false)}>Notifications</Link>
                      <Link to="/bookings" className="menu-item-bold" style={{textDecoration: 'none', display: 'block', color: 'inherit'}} onClick={() => setIsUserMenuOpen(false)}>My Bookings</Link>
                      <Link to="/wishlists" className="menu-item-bold" style={{textDecoration: 'none', display: 'block', color: 'inherit'}} onClick={() => setIsUserMenuOpen(false)}>Wishlists</Link>
                      <Link to="/wallet" className="menu-item-bold" style={{textDecoration: 'none', display: 'block', color: 'inherit'}} onClick={() => setIsUserMenuOpen(false)}>Wallet</Link>
                      <div className="menu-divider"></div>
                      <Link to="/account" className="menu-item" style={{textDecoration: 'none'}}>Account</Link>
                       <div className="menu-item" onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                       }}>Log out</div>
                        </>
                     ) : (
                        <>

                          <div className="menu-item-bold" onClick={() => { openAuthModal(); setIsUserMenuOpen(false); }}>Log in</div>
                          <div className="menu-item" onClick={() => { openAuthModal(); setIsUserMenuOpen(false); }}>Sign up</div>
                          <div className="menu-divider"></div>
                          <div className="menu-item" onClick={() => { setRedirectAfterLogin('/become-a-host'); openAuthModal(); setIsUserMenuOpen(false); }}>Become a host</div>
                          <div className="menu-item">Help Center</div>
                        </>
                     )}
                  </div>
                )}
            </div>
          </div>
        </div>
      </header>



      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={handleAuthComplete} 
      />
    </>
  );
};

export default Navbar;
