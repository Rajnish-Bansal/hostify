import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HostLayout from './layouts/HostLayout';
import HostLanding from './pages/Host/HostLanding';
import HostDashboard from './pages/Host/HostDashboard';
import HostStep1 from './pages/Host/HostStep1';
import HostStep2 from './pages/Host/HostStep2';
import HostStep3 from './pages/Host/HostStep3';
import HostStep4 from './pages/Host/HostStep4';
import HostStep5 from './pages/Host/HostStep5';
import HostStep6 from './pages/Host/HostStep6';
import HostStep7 from './pages/Host/HostStep7';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminListings from './pages/Admin/AdminListings';
import AdminLogin from './pages/Admin/AdminLogin';
import ProtectedAdminRoute from './components/atoms/ProtectedAdminRoute/ProtectedAdminRoute';
import ProtectedRoute from './components/atoms/ProtectedRoute/ProtectedRoute';
import { HostProvider } from './context/HostContext';
import { BookingProvider } from './context/BookingContext';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import Profile from './pages/Profile/Profile';
import Notifications from './pages/Notifications/Notifications';
import Bookings from './pages/Bookings/Bookings';
import Wishlist from './pages/Wishlist/Wishlist';
import Account from './pages/Account/Account';
import Wallet from './pages/Wallet/Wallet';
import RoomDetails from './pages/Rooms/RoomDetails';
import Checkout from './pages/Checkout/Checkout';
import Inbox from './pages/Inbox/Inbox';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import Terms from './pages/Legal/Terms';
import RefundPolicy from './pages/Legal/RefundPolicy';
import Contact from './pages/Legal/Contact';
import About from './pages/Legal/About';

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <HostProvider>
          <BookingProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rooms/:id" element={<RoomDetails />} />
                {/* Legal Pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />

              {/* Protected Routes - Require Login */}
              <Route element={<ProtectedRoute />}>
                <Route path="/booking" element={<Checkout />} />
                <Route path="/book/stays/:id" element={<Checkout />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/account" element={<Account />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/wishlists" element={<Wishlist />} />
                <Route path="/inbox" element={<Inbox />} />
              </Route>
              <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Routes - Protected */}
              <Route element={<ProtectedAdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="listings" element={<AdminListings />} />
                </Route>
              </Route>

            {/* Host Flow Routes */}
            <Route path="/become-a-host" element={<HostLayout />}>
              <Route index element={<HostLanding />} />
              <Route path="dashboard" element={<HostDashboard />} />
              <Route path="step1" element={<HostStep1 />} />
              <Route path="step2" element={<HostStep3 />} />
              <Route path="step3" element={<HostStep2 />} />
              <Route path="step4" element={<HostStep4 />} />
              <Route path="step5" element={<HostStep5 />} />
              <Route path="step6" element={<HostStep6 />} />
              <Route path="step7" element={<HostStep7 />} />
              {/* Future steps will go here */}
            </Route>
          </Routes>
        </BrowserRouter>
        </BookingProvider>
      </HostProvider>
      </SearchProvider>
    </AuthProvider>
  )
}

export default App
