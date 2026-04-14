import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import AuthModal from '../../molecules/AuthModal/AuthModal';

/**
 * ProtectedRoute
 * Wraps any route that requires a logged-in user.
 * If not authenticated, opens the AuthModal and redirects back to home.
 * On successful login, the user is taken back to the page they tried to visit.
 */
const ProtectedRoute = () => {
  const { user, isAuthModalOpen, openAuthModal, closeAuthModal } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      openAuthModal();
    }
  }, [user]);

  if (!user) {
    return (
      <>
        {/* Show login modal, then redirect to home while modal is open */}
        <Navigate to="/" state={{ from: location }} replace />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={(userData) => {
            if (!userData) closeAuthModal();
          }}
        />
      </>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
