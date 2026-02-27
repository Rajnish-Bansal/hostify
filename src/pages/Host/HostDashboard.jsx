import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHost } from '../../context/HostContext';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { ChevronLeft, ChevronRight, Download, Trash2, Camera, Upload, Link2, Star, Eye } from 'lucide-react';
import './HostDashboard.css';
import { generateICalData } from '../../utils/icalGenerator';
import ConfirmationModal from '../../components/molecules/ConfirmationModal/ConfirmationModal';
import SubscriptionModal from '../../components/molecules/SubscriptionModal/SubscriptionModal';
import LimitManagementModal from '../../components/molecules/LimitManagementModal/LimitManagementModal';

const HostDashboard = () => {
  const { listings, updateListingStatus, loadListingForEdit, deleteListing, resetListingData, extendSubscription } = useHost();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [listingFilter, setListingFilter] = useState('All'); // New state for filtering listings

  const [selectedListingId, setSelectedListingId] = useState('all');
  const selectedListing = selectedListingId === 'all' ? null : listings.find(l => l.id === selectedListingId);

  // Unsaved Changes State for Calendar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handlePriceChange = () => {
     setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
     // In a real app, this would trigger an API call to save all modified dates
     setHasUnsavedChanges(false);
     
     if (selectedDatesToBlock.length > 0) {
        if (selectedListingId === 'all') {
           alert("Please select a specific listing to block dates for.");
           return;
        }

         const listingUnitCount = selectedListing ? (selectedListing.unitCount || 1) : 1;

         // Double Booking Check based on unit count
         const hasConflict = selectedDatesToBlock.some(dateStr => {
            const blockDate = new Date(dateStr);
            blockDate.setHours(0,0,0,0);
            
            // Count existing reservations/blocks for this date
            const existingCount = reservations.filter(res => {
               if (res.listingId !== Number(selectedListingId)) return false;
               
               const start = new Date(res.startDate);
               start.setHours(0,0,0,0);
               const end = new Date(res.endDate);
               end.setHours(0,0,0,0);
               
               return blockDate >= start && blockDate <= end;
            }).length;

            return existingCount >= listingUnitCount;
         });

         if (hasConflict) {
            alert("Double Booking Prevented: One or more of the selected dates already have a guest reservation. Please deselect them and try again.");
            return;
         }

        const newBlocks = selectedDatesToBlock.map((dateStr, i) => ({
           id: Date.now() + i,
           listingId: Number(selectedListingId),
           guest: 'Unavailable',
           dates: format(new Date(dateStr), 'MMM dd'),
           startDate: dateStr,
           endDate: dateStr,
           price: '-',
           status: 'Unavailable'
        }));

        setReservations(prev => [...prev, ...newBlocks]);
        setIsBlockingMode(false);
        setSelectedDatesToBlock([]);
     }

     alert("Changes saved successfully!");
  };

  const handleCancelChanges = () => {
     // In a real app, this would reset the local state arrays to match the server data
     setHasUnsavedChanges(false);
     setIsBlockingMode(false);
     setSelectedDatesToBlock([]);
  };

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);

  const handleDeleteClick = (id) => {
    setListingToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (listingToDelete) {
      deleteListing(listingToDelete);
      setIsDeleteModalOpen(false);
      setListingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setListingToDelete(null);
  };

  // Subscription Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [listingToSubscribe, setListingToSubscribe] = useState(null);
  
  // Limit Manager State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  
  // Inventory Management State
  const [inventoryLimits, setInventoryLimits] = useState({}); // Map of listingId -> limit
  const [pendingAddOn, setPendingAddOn] = useState(null); // { units: number, cost: number }
  
  // Messages State
  const [mockMessages, setMockMessages] = useState([
    { id: 1, guest: 'Alice Johnson', text: 'Hi, is early check-in possible?', time: '10:00 AM', isHost: false },
    { id: 2, guest: 'Charlie Brown', text: 'Thank you for the wonderful stay!', time: 'Yesterday', isHost: false },
  ]);
  const [activeMessageGuest, setActiveMessageGuest] = useState('Alice Johnson');
  const [newMessageText, setNewMessageText] = useState('');

  const handleSendMessage = () => {
    if (!newMessageText.trim()) return;
    setMockMessages(prev => [...prev, {
      id: Date.now(),
      guest: activeMessageGuest,
      text: newMessageText,
      time: 'Just now',
      isHost: true
    }]);
    setNewMessageText('');
  };

  // iCal Automated Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncedCalendars, setSyncedCalendars] = useState([]); // Array of URLs

  const handleMockAutoSync = (url) => {
    if (selectedListingId === 'all') {
      alert("Please select a specific listing to enable auto-sync.");
      return;
    }

    const today = new Date();
    const mockBlockStart = new Date(today);
    mockBlockStart.setDate(mockBlockStart.getDate() + 14); // 2 weeks out
    
    const mockBlockEnd = new Date(mockBlockStart);
    mockBlockEnd.setDate(mockBlockEnd.getDate() + 2); // 3 days block

    const newBlocks = eachDayOfInterval({start: mockBlockStart, end: mockBlockEnd}).map((day, i) => ({
       id: Date.now() + i + 2000,
       listingId: Number(selectedListingId),
       guest: 'Auto Synced',
       dates: format(new Date(day), 'MMM dd'),
       startDate: day.toISOString(),
       endDate: day.toISOString(),
       price: '-',
       status: 'Unavailable'
    }));

    setReservations(prev => [...prev, ...newBlocks]);
    try {
      alert(`Successfully synced events from ${new URL(url).hostname}. Added 3 blocked dates.`);
    } catch {
      alert(`Successfully synced events from external calendar. Added 3 blocked dates.`);
    }
  };

  const getListingLimit = (id) => inventoryLimits[id] || 1;

  const handleSubscribe = (id, addOnDetails = null) => {
     const listing = listings.find(l => l.id === id);
     if (listing) {
        setListingToSubscribe(listing);
        if (addOnDetails) {
           setPendingAddOn(addOnDetails);
        } else {
           setPendingAddOn(null); // Standard subscription
        }
        setIsSubModalOpen(true);
     }
  };

  const openLimitManager = (id) => {
     const listing = listings.find(l => l.id === id);
     if(listing) {
        setListingToSubscribe(listing);
        setIsLimitModalOpen(true);
     }
  }

  const handleProceedToPay = (data) => {
     // data = { units, cost, newLimit }
     // Trigger subscription modal
     setPendingAddOn({ units: data.units, cost: data.cost, targetTotal: data.newLimit });
     setIsLimitModalOpen(false);
     setIsSubModalOpen(true);
  };

  const handleUpdateActiveUnits = (newUnitCount) => {
      if (listingToSubscribe) {
          setLocalUnits(prev => ({
             ...prev,
             [listingToSubscribe.id]: newUnitCount
          }));
          alert(`Success! Active units updated to ${newUnitCount}.`);
      }
  };

  const handlePaymentSuccess = (data) => {
     if (pendingAddOn) {
         // Inventory Add-on Success (from Manage Modal)
         const targetId = listingToSubscribe.id;
         setInventoryLimits(prev => ({
             ...prev,
             [targetId]: (prev[targetId] || 1) + pendingAddOn.units
         }));
         
         if (pendingAddOn.targetTotal) {
             setLocalUnits(prev => ({
                 ...prev,
                 [targetId]: pendingAddOn.targetTotal
             }));
         }
         
         alert(`Success! Inventory limit increased by ${pendingAddOn.units}.`);
         setPendingAddOn(null);
     } else if (listingToSubscribe) {
         // Recharge Success (with optional Upgrade)
         const targetId = listingToSubscribe.id;
         
         // If upgraded during recharge
         if (data && data.newLimit) {
            setInventoryLimits(prev => ({
                ...prev,
                [targetId]: data.newLimit
            }));
             // Also auto-update active units if they paid for more space
             setLocalUnits(prev => ({
                 ...prev,
                 [targetId]: data.newLimit
             }));
         }

         setListings(prev => prev.map(l => {
             if (l.id === listingToSubscribe.id) {
                 return { ...l, status: 'Active' }; // Reactivate
             }
             return l;
         }));
         alert(`Subscription renewed for ${listingToSubscribe.title}!`);
         setListingToSubscribe(null);
     }
     
     setIsSubModalOpen(false);
     setListingToSubscribe(null);
  };

  const handleEdit = (listing) => {
    loadListingForEdit(listing);
    navigate('/become-a-host/step1');
  };

  const handleUpdateUnits = (listingId, change) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    const currentUnits = localUnits[listingId] || listing.units || 1;
    const newUnits = currentUnits + change;

    if (newUnits < 1) return; // Cannot have less than 1 unit

    // Check against inventory limit
    // Note: We check if the NEW total across ALL listings would exceed limit.
    // For simplicity in this demo, we assume this 'units' field acts as the aggregate or we check per listing.
    // Assuming 'newUnits' is the target size for THIS listing.
    
    // In a real app with multiple listings, we'd sum all (l.units) - l.current + newUnits.
    // Here we just check if this specific increment pushes THIS listing beyond the "limit" if we treat limit as "max units per listing" 
    // OR if we treat limit as "total units allowed in account".
    // User asked "if host has same 10 properties", implying 1 listing record with '10' units.
    // So 'newUnits' is the total inventory count.
    
    const currentLimit = getListingLimit(listingId);
    if (change > 0 && newUnits > currentLimit) {
       // Open Bulk Manager instead of inline add-on
       openLimitManager(listingId);
       return;
    }

    // Update local state
    setLocalUnits(prev => ({
       ...prev,
       [listingId]: newUnits
    }));
  };


  const [localUnits, setLocalUnits] = useState({});

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTxnTab, setActiveTxnTab] = useState('bookings');
  const [txnStartDate, setTxnStartDate] = useState('');
  const [txnEndDate, setTxnEndDate] = useState('');

  // Profile State
  const [profile, setProfile] = useState({
    name: user?.name || 'Host User',
    email: user?.email || 'host@example.com',
    phone: '+91 98765 43210',
    bio: 'Superhost since 2023. I love hosting travelers from around the world!',
    avatar: null 
  });

  const handleProfileUpdate = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfile(prev => ({ ...prev, avatar: URL.createObjectURL(file) }));
    }
  };


  // Financial Details State
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifsc: '',
    holderName: '',
    bankName: ''
  });

  const [taxInfo, setTaxInfo] = useState({
    pan: '',
    gstin: ''
  });

  // Host Type State
  const [hostType, setHostType] = useState('individual'); // 'individual' or 'company'
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    pan: '',
    gstin: ''
  });



  const handleTaxUpdate = (e) => {
    const { name, value } = e.target;
    setTaxInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCompanyUpdate = (e) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };

  const POPULAR_BANKS = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'IndusInd Bank',
    'IDFC First Bank',
    'Yes Bank'
  ];

  const handleBankUpdate = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({ ...prev, [name]: value }));
  };

  // Mock Data for "Interactive" feel
  const stats = {
    earnings: '₹45,000',
    views: 128,
    bookings: 3,
    rating: 4.8
  };

  // Mock Reservations with listingId (Now stateful so we can add blocks)
  const [reservations, setReservations] = useState([
    { id: 1, listingId: 1700001, guest: 'Alice Johnson', dates: 'Oct 12 - 15', startDate: '2025-10-12', endDate: '2025-10-15', price: '₹12,400', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=alice', rating: 4.9 },
    { id: 2, listingId: 1700001, guest: 'Bob Smith', dates: 'Nov 02 - 05', startDate: '2025-11-02', endDate: '2025-11-05', price: '₹8,200', status: 'Pending', img: 'https://i.pravatar.cc/150?u=bob', rating: 4.5 },
    { id: 3, listingId: 1700002, guest: 'Charlie Brown', dates: 'Feb 10 - 14', startDate: '2026-02-10', endDate: '2026-02-14', price: '₹34,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=charlie', rating: 5.0 },
    { id: 4, listingId: 1700003, guest: 'David Lee', dates: 'Feb 12 - 15', startDate: '2026-02-12', endDate: '2026-02-15', price: '₹30,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=david', rating: 4.2 },
    // Mock high-volume overlapping bookings
    { id: 5, listingId: 1700001, guest: 'Eve A', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹4,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=5', rating: 4.8 },
    { id: 6, listingId: 1700002, guest: 'Frank B', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹5,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=6', rating: 4.7 },
    { id: 7, listingId: 1700003, guest: 'Grace C', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹6,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=7', rating: 4.9 },
    { id: 8, listingId: 1700001, guest: 'Heidi D', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹4,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=8', rating: 5.0 },
    { id: 9, listingId: 1700002, guest: 'Ivan E', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹5,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=9', rating: 4.6 },
    { id: 10, listingId: 1700003, guest: 'Judy F', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹6,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=10', rating: 4.9 },
    { id: 11, listingId: 1700001, guest: 'Kevin G', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹4,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=11', rating: 4.8 },
    { id: 12, listingId: 1700002, guest: 'Liam H', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹5,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=12' },
    { id: 13, listingId: 1700003, guest: 'Mia I', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹6,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=13' },
    { id: 14, listingId: 1700001, guest: 'Noah J', dates: 'Mar 10 - 12', startDate: '2026-03-10', endDate: '2026-03-12', price: '₹4,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=14' },
  ]);

  // Inline Block Dates State
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [selectedDatesToBlock, setSelectedDatesToBlock] = useState([]);

  const toggleDateSelection = (dateString) => {
    setSelectedDatesToBlock(prev => 
      prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    );
  };





  const handleRemoveBlock = (blockId) => {
    setReservations(prev => prev.filter(res => res.id !== blockId));
  };

  // Mock Transactions Data
  const mockTransactions = [
    { id: 'TX-1001', date: '2025-10-15', type: 'Payout', description: 'Payout for Alice Johnson', amount: 12400, status: 'Completed', method: 'Bank Transfer •••• 4242' },
    { id: 'TX-1002', date: '2025-11-01', type: 'Payment', description: 'Professional Host Plan (Monthly)', amount: -999, status: 'Completed', method: 'Visa •••• 1234', propertyName: 'Seaside Villa', expiryDate: '2025-12-01' },
    { id: 'TX-1003', date: '2025-11-05', type: 'Payout', description: 'Payout for Bob Smith', amount: 8200, status: 'Completed', method: 'Bank Transfer •••• 4242' },
    { id: 'TX-1004', date: '2025-12-01', type: 'Payment', description: 'Professional Host Plan (Monthly)', amount: -999, status: 'Completed', method: 'Visa •••• 1234', propertyName: 'Seaside Villa', expiryDate: '2026-01-01' },
    { id: 'TX-1005', date: '2026-01-01', type: 'Payment', description: 'Professional Host Plan (Monthly)', amount: -999, status: 'Completed', method: 'Visa •••• 1234', propertyName: 'Seaside Villa', expiryDate: '2026-02-01' },
    { id: 'TX-1006', date: '2026-02-01', type: 'Payment', description: 'Professional Host Plan (Monthly)', amount: -999, status: 'Completed', method: 'Visa •••• 1234', propertyName: 'Mountain Retreat', expiryDate: '2026-03-01' },
    { id: 'TX-1007', date: '2026-02-14', type: 'Payout', description: 'Payout for Charlie Brown', amount: 34000, status: 'Completed', method: 'Bank Transfer •••• 4242' },
  ];

  /* Calendar Logic */
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDailyReservations = (day) => {
     return reservations.filter(res => {
        if (selectedListingId !== 'all' && res.listingId != selectedListingId) return false;
        
        // Hide unavailable blocks from the "All Listings" view
        if (selectedListingId === 'all' && res.status === 'Unavailable') return false;

        // Simple check if day matches start or is within range (simulated)
        const start = new Date(res.startDate);
        const end = new Date(res.endDate);
        // Reset times for accurate comparison
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        day.setHours(0,0,0,0);
        
        return day >= start && day <= end;
     });
  };

  const handleCreateNew = () => {
    resetListingData();
    navigate('/become-a-host/step1');
  };

  const handleExportCal = () => {
    const data = generateICalData(reservations, listings, selectedListingId);
    const blob = new Blob([data], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `airbnb_calendar_${selectedListingId === 'all' ? 'all' : selectedListingId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCal = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (selectedListingId === 'all') {
      alert("Please select a specific listing to import calendar data.");
      return;
    }

    // Mock importing logic - adds some blocks 7 days from now to simulate parsed external reservations
    const today = new Date();
    const mockBlockStart = new Date(today);
    mockBlockStart.setDate(mockBlockStart.getDate() + 7);
    
    const mockBlockEnd = new Date(mockBlockStart);
    mockBlockEnd.setDate(mockBlockEnd.getDate() + 3);

    const newBlocks = eachDayOfInterval({start: mockBlockStart, end: mockBlockEnd}).map((day, i) => ({
       id: Date.now() + i + 1000,
       listingId: Number(selectedListingId),
       guest: 'iCal Import',
       dates: format(new Date(day), 'MMM dd'),
       startDate: day.toISOString(),
       endDate: day.toISOString(),
       price: '-',
       status: 'Unavailable' // imported as unavailable chunk
    }));

    setReservations(prev => [...prev, ...newBlocks]);
    alert(`${file.name} imported successfully. 4 new blocks added.`);
    
    // reset file input
    e.target.value = null;
  };

  const filteredListings = listings.filter(listing => {
    if (listingFilter === 'All') return true;
    if (listingFilter === 'Active') return listing.status === 'Active';
    if (listingFilter === 'Inactive') return listing.status === 'Inactive' || listing.status === 'Payment Required';
    if (listingFilter === 'Pending Approval') return listing.status === 'Pending';
    return true;
  });

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
           <span className="brand-icon">🏠</span> Host Panel
        </div>
        
        <div className="sidebar-action">
           <button onClick={handleCreateNew} className="create-new-btn-sidebar">
             + Create New Listing
           </button>
        </div>

        <nav className="sidebar-nav">
           <button onClick={() => setActiveTab('overview')} className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}>
             Dashboard
           </button>
           <button onClick={() => setActiveTab('listings')} className={`nav-item ${activeTab === 'listings' ? 'active' : ''}`}>
             My Listings
           </button>
           <button onClick={() => setActiveTab('bookings')} className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}>
             Reservations <span className="badge-count">2</span>
           </button>
           <button onClick={() => setActiveTab('calendar')} className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}>
             Calendar
           </button>
           <button onClick={() => setActiveTab('monthly-plans')} className={`nav-item ${activeTab === 'monthly-plans' ? 'active' : ''}`}>
             Monthly Plans
           </button>
           <button onClick={() => setActiveTab('transactions')} className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}>
             Transactions
           </button>
           <button onClick={() => setActiveTab('payout-details')} className={`nav-item ${activeTab === 'payout-details' ? 'active' : ''}`}>
             Tax Profile
           </button>
           <button onClick={() => setActiveTab('messages')} className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}>
             Messages <span className="badge-count">1</span>
           </button>

        </nav>
        <div className="sidebar-footer">
           <Link to="/" className="exit-link">Exit to Airbnb</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="main-header">
           <h2>{activeTab === 'overview' ? 'Dashboard Overview' : activeTab === 'listings' ? 'My Listings' : activeTab === 'bookings' ? 'Reservations' : activeTab === 'calendar' ? 'Calendar & Availability' : activeTab === 'transactions' ? 'Transaction History' : activeTab === 'payout-details' ? 'Tax Profile' : activeTab === 'profile' ? 'My Profile' : 'Monthly Plans'}</h2>
           <div className="user-profile" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
              <div className="user-avatar">
                {profile.avatar ? <img src={profile.avatar} alt="" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : profile.name.charAt(0)}
              </div>
           </div>
        </header>

        {activeTab === 'overview' && (
           <div className="overview-content">
              {/* Stats Cards */}
              <div className="stats-grid">
                 <div className="stat-card">
                    <h3>Earnings (Oct)</h3>
                    <div className="stat-value">{stats.earnings}</div>
                    <div className="stat-trend positive">+12% vs last month</div>
                 </div>
                 <div className="stat-card">
                    <h3>30-day Views</h3>
                    <div className="stat-value">{stats.views}</div>
                 </div>
                 <div className="stat-card">
                    <h3>Overall Rating</h3>
                    <div className="stat-value">⭐ {stats.rating}</div>
                 </div>
              </div>

              {/* Recent Activity / Action Items */}
              <div className="section-container">
                 <h3>Pending Actions</h3>
                 <div className="action-list">
                    {listings.filter(l => l.status === 'Payment Required').map(l => (
                      <div key={l.id} className="action-item warning">
                         <span className="action-icon">💳</span>
                         <div className="action-text">
                            <strong>Subscription Required</strong>
                            <p>Activate "{l.title}" to start receiving bookings.</p>
                         </div>
                         <button className="action-btn" onClick={() => handleSubscribe(l.id)}>Pay Now</button>
                      </div>
                    ))}
                    {listings.filter(l => l.status === 'Pending').length > 0 && (
                      <div className="action-item warning">
                         <span className="action-icon">⏳</span>
                         <div className="action-text">
                            <strong>Listing Pending Approval</strong>
                            <p>Your listing "{listings.find(l => l.status === 'Pending')?.title}" is under review.</p>
                         </div>
                      </div>
                    )}
                    <div className="action-item">
                       <span className="action-icon">📱</span>
                       <div className="action-text">
                          <strong>Verify Phone Number</strong>
                          <p>Add a phone number to get 30% more bookings.</p>
                       </div>
                       <button className="action-btn">Verify</button>
                    </div>
                 </div>
              </div>

               {/* Recent Bookings Section */}
               <div className="section-container" style={{ marginTop: '32px' }}>
                  <div className="section-header-row">
                     <h3>Recent Bookings</h3>
                     <button className="btn-link" onClick={() => setActiveTab('bookings')}>View All</button>
                  </div>
                  <div className="recent-bookings-list">
                     {reservations.slice(0, 3).map(res => (
                        <div key={res.id} className="recent-booking-item">
                           <div className="rb-guest">
                              <div className="user-avatar small">{res.guest.charAt(0)}</div>
                              <div>
                                 <span className="rb-name">{res.guest}</span>
                                 <span className="rb-sub">{res.dates}</span>
                              </div>
                           </div>
                           <div className="rb-property">
                              {listings.find(l => l.id === res.listingId)?.title || 'Listing'}
                           </div>
                           <div className={`rb-status ${res.status.toLowerCase()}`}>
                              {res.status}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
        )}

        {activeTab === 'listings' && (
             <div className="listings-content">
                <div className="listings-header-wrapper">
                   <div className="listings-header-row">
                      <p>{filteredListings.length} Listings found</p>
                   </div>
                   
                   <div className="listing-filters-tabs">
                     {['All', 'Active', 'Inactive', 'Pending Approval'].map(filter => (
                       <button
                         key={filter}
                         className={`filter-tab-pill ${listingFilter === filter ? 'active' : ''}`}
                         onClick={() => setListingFilter(filter)}
                       >
                         {filter}
                       </button>
                     ))}
                   </div>
                </div>
                
                <div className="listings-grid-v2">
                       {filteredListings.map(listing => {
                        const createdAt = listing.createdAt ? new Date(listing.createdAt) : new Date();
                        const expiryDate = new Date(createdAt);
                        expiryDate.setFullYear(createdAt.getFullYear() + 1);
                        
                        const isValidDate = !isNaN(expiryDate.getTime());
                        const diffInDays = isValidDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                        const isExpiringSoon = listing.status === 'Active' && diffInDays > 0 && diffInDays <= 7;
                        

                        // Calculate pending requests
                        const pendingRequests = reservations.filter(r => r.listingId === listing.id && r.status === 'Pending').length;

                        return (
                           <div key={listing.id} className="listing-card-v2">
                              <div className="card-image">
                                 {listing.photos && listing.photos[0] ? (
                                   <img src={listing.photos[0] instanceof File ? URL.createObjectURL(listing.photos[0]) : listing.photos[0]} alt="" />
                                 ) : (
                                   <div className="placeholder">No Img</div>
                                 )}
                                 <span className={`status-pill ${listing.status.toLowerCase().replace(' ', '-')}`}>
                                    {listing.status === 'Pending' ? 'Pending Approval' : listing.status} {listing.status === 'Active' ? '(Annual)' : ''}
                                 </span>
                                 <button 
                                    className="btn-delete-icon" 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleDeleteClick(listing.id);
                                    }}
                                    title="Delete Listing"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                              <div className="card-body">
                                 <div className="card-type-guests">
                                    {listing.type || 'Property'} • {listing.guests || 2} guests
                                 </div>
                                 <h4 className="card-title">{listing.title || 'Untitled Listing'}</h4>
                                 <div className="card-rating-location">
                                    <p className="card-location">{listing.location}</p>
                                    {listing.rating > 0 && (
                                       <div className="card-rating-badge">
                                          <Star size={14} fill="#222" />
                                          <span className="rating-value">{listing.rating.toFixed(1)}</span>
                                          <span className="rating-count">({listing.reviewsCount})</span>
                                       </div>
                                    )}
                                 </div>
                                 
                                 <div className="card-pricing-summary">
                                    <span className="price-bold">₹{listing.price || 0}</span>
                                    <span className="price-label"> / night</span>
                                 </div>
                                 
                                 <div className="card-metrics-v2">
                                    {(listing.status === 'Active' || listing.status === 'Payment Required') && (
                                      <div className={`expiry-info ${isExpiringSoon ? 'expiring-soon' : listing.status === 'Payment Required' ? 'expiring-soon' : ''}`}>
                                         {listing.status === 'Payment Required' ? '⚠️ Plan expired on: ' + expiryDate.toLocaleDateString() : isExpiringSoon ? '⚠️ Expiring in ' + diffInDays + ' days' : '⏳ Valid until: ' + expiryDate.toLocaleDateString()}
                                      </div>
                                    )}
                                    <div className="metrics-row">
                                       <span title="Total Views">👁️ 0 views</span>
                                    </div>
                                    {listing.status === 'Active' && (
                                       <div className="limit-manager-wrapper">
                                          <span className="limit-badge" title="Your Current Capacity">
                                             Subscription Slots: {getListingLimit(listing.id)}
                                          </span>
                                          <button 
                                             onClick={(e) => { e.stopPropagation(); openLimitManager(listing.id); }}
                                             className="btn-manage-limit"
                                          >
                                             Manage
                                          </button>
                                       </div>
                                    )}
                                 </div>



                                 <div className="card-actions-v2">
                                    <div className="action-buttons-row">
                                       {listing.status === 'Payment Required' ? (
                                          <>
                                             <button className="btn-activate-full" onClick={() => handleSubscribe(listing.id)}>Activate</button>
                                             <button className="btn-action-outline" onClick={() => handleEdit(listing)}>Edit</button>
                                          </>
                                       ) : isExpiringSoon ? (
                                          <>
                                             <button className="btn-recharge" onClick={() => handleSubscribe(listing.id)}>Recharge</button>
                                             <button className="btn-action-outline" onClick={() => handleEdit(listing)}>Edit</button>
                                          </>
                                       ) : (
                                          <button className="btn-action-outline" style={{width: '100%'}} onClick={() => handleEdit(listing)}>Edit Listing</button>
                                       )}
                                    </div>
                                    <Link to={`/rooms/${listing.id}`} className="btn-public-view" target="_blank">
                                       <Eye size={14} /> Public View
                                    </Link>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                       {filteredListings.length === 0 && <div className="no-data">No listings match the selected filter.</div>}
                </div>
             </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          title="Delete Listing"
          message="Are you sure you want to delete this listing? This action cannot be undone."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDestructive={true}
        />

        <SubscriptionModal 
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          onConfirm={handlePaymentSuccess}
          listingTitle={listingToSubscribe?.title}
          currentLimit={listingToSubscribe ? getListingLimit(listingToSubscribe.id) : 1}
        />

        {activeTab === 'bookings' && (
           <div className="bookings-content">
              <div className="bookings-table">
                 <div className="table-header">
                    <div>Sl No.</div>
                    <div>Guest</div>
                    <div>Dates</div>
                    <div>Listing</div>
                    <div>Price</div>
                    <div>Status</div>
                    <div>Action</div>
                 </div>
                 {reservations.map((res, index) => (
                    <div key={res.id} className="table-row">
                       <div className="col-sl">{index + 1}</div>
                       <div className="col-guest">
                          <img src={res.img} alt="" className="guest-avatar" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span style={{ fontWeight: '600' }}>{res.guest}</span>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#717171' }}>
                                <Star size={10} fill="#ff385c" color="#ff385c" />
                                <span>{res.rating || 'New'}</span>
                             </div>
                          </div>
                       </div>
                       <div className="col-date">{res.dates}</div>
                       <div className="col-listing">{listings[0]?.title || 'Seaside Villa'}</div>
                       <div className="col-price">{res.price}</div>
                       <div className="col-status"><span className={`status-dot ${res.status.toLowerCase()}`}></span> {res.status}</div>
                       <div className="col-action">
                          {res.status === 'Pending' ? (
                             <>
                               <button className="btn-accept">Accept</button>
                               <button className="btn-decline">Decline</button>
                             </>
                          ) : (
                             <button className="btn-link">Message</button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'calendar' && (
           <div className="calendar-content">
              <div className="calendar-container">
                 <div className="calendar-controls">
                    <div className="cal-header-left">
                       <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
                       <div className="cal-nav-btns">
                          <button onClick={prevMonth} className="btn-icon"><ChevronLeft size={20}/></button>
                          <button onClick={nextMonth} className="btn-icon"><ChevronRight size={20}/></button>
                       </div>
                    </div>
                    


                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                       <div className="cal-listing-selector">
                           <select 
                              value={selectedListingId} 
                              onChange={(e) => setSelectedListingId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                              className="listing-dropdown"
                           >
                              <option value="all">All Listings</option>
                              {listings.map(l => (
                                 <option key={l.id} value={l.id}>{l.title}</option>
                              ))}
                           </select>
                       </div>

                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                             className="btn-outline-small" 
                             onClick={handleExportCal}
                             title="Export iCal"
                          >
                             <Download size={16} /> Export
                          </button>

                          <button 
                             className="btn-outline-small" 
                             onClick={() => {
                               if (selectedListingId === 'all') {
                                 alert("Please select a specific listing to setup automated sync.");
                               } else {
                                 setIsSyncModalOpen(true);
                               }
                             }}
                             title="Add Sync Link"
                          >
                             <Link2 size={16} /> Sync Link
                          </button>

                          <label className="btn-outline-small" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                             <Upload size={16} /> Import
                             <input 
                                type="file" 
                                accept=".ics" 
                                style={{ display: 'none' }}
                                onChange={handleImportCal}
                             />
                          </label>
                       </div>
                    </div>

                     <div className="cal-legend">
                        <span className="legend-item"><span className="dot booked"></span> Booked</span>
                        <span className="legend-item"><span className="dot available"></span> Available</span>
                        <span className="legend-item"><span className="dot offline"></span> Unavailable</span>
                        
                        {!isBlockingMode && (
                           <button className="btn-block-dates" style={{marginLeft: 'auto'}} onClick={() => setIsBlockingMode(true)}>
                             Mark dates as unavailable
                           </button>
                        )}
                     </div>
                 </div>
                 
                        <div className="weekdays-grid">
                           {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="weekday-header">{day}</div>
                           ))}
                        </div>
                        
                        <div className="days-grid">
                            {calendarDays.map((day, idx) => {
                              const dailyReservations = getDailyReservations(new Date(day));
                              const listingUnitCount = selectedListing ? (selectedListing.unitCount || 1) : 1;
                              const isToday = isSameDay(day, new Date());
                              const isPastDay = day < new Date(new Date().setHours(0,0,0,0));
                              const isCurrentMonth = isSameMonth(day, currentMonth);
                              const totalBlocks = dailyReservations.length;
                              const hasBooking = totalBlocks > 0;
                              const isFull = totalBlocks >= listingUnitCount;
                              
                              return (
                                 <div key={day.toString()} className={`day-cell ${!isCurrentMonth ? 'outside' : ''} ${hasBooking ? 'booked' : ''} ${isFull ? 'fully-booked' : ''} ${isToday ? 'today' : ''} ${isBlockingMode ? 'blocking-mode-cell' : ''} ${isPastDay ? 'past-day' : ''}`}>
                                    {isBlockingMode && !isPastDay && !isFull && (
                                      <input 
                                        type="checkbox" 
                                        className="day-block-checkbox"
                                        checked={selectedDatesToBlock.includes(day.toISOString())}
                                        onChange={() => toggleDateSelection(day.toISOString())}
                                      />
                                    )}
                                    <div className="day-number">{format(day, 'd')}</div>
                                    {listingUnitCount > 1 && (
                                        <div className="unit-counter" style={{ fontSize: '11px', color: isFull ? '#fff' : '#ff385c', fontWeight: 'bold', marginTop: '2px' }}>
                                          {totalBlocks}/{listingUnitCount} Booked
                                        </div>
                                    )}
                                    <div className="day-price">
                                       {selectedListingId === 'all' ? (
                                          ''
                                       ) : (
                                          <div className="month-price-input-wrapper">
                                             <span className="currency-symbol">₹</span>
                                             <input 
                                                type="number" 
                                                className="month-price-input" 
                                                defaultValue={selectedListing?.price || '0'} 
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={handlePriceChange}
                                                disabled={isPastDay}
                                             />
                                          </div>
                                       )}
                                    </div>
                                    
                                    <div className="bookings-stack">
                                       {dailyReservations.map((res, i) => (
                                           <div 
                                             key={res.id} 
                                             className={`booking-strip ${res.status === 'Unavailable' ? 'blocked-strip' : ''}`} 
                                             style={{
                                                backgroundColor: res.status === 'Unavailable' ? '#a3a3a3' : (i % 2 === 0 ? '#ff385c' : '#222'),
                                             }}
                                           >
                                             {res.status === 'Unavailable' ? (
                                                <div className="booking-strip-unavailable">
                                                   <span className="unavailable-text-label">
                                                      Unavailable
                                                   </span>
                                                   {!isPastDay && (
                                                      <button 
                                                         className="unblock-text-btn" 
                                                         onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveBlock(res.id);
                                                         }}
                                                      >
                                                         Mark available
                                                      </button>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="booking-strip-title">
                                                   {selectedListingId === 'all' 
                                                      ? (listings.find(l => l.id === res.listingId)?.title?.split(' ').slice(0, 2).join(' ') || 'Listing')
                                                      : res.guest.split(' ')[0]}
                                                </span>
                                             )}
                                           </div>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>

                  {/* Save Changes Floating Action Bar */}
                  {(hasUnsavedChanges || selectedDatesToBlock.length > 0) && (
                     <div className="save-action-bar">
                        <div className="save-action-content">
                           <span>You have unsaved changes to your calendar.</span>
                           <div className="save-action-btns">
                              <button className="btn-cancel" onClick={handleCancelChanges}>Discard</button>
                              <button className="btn-save" onClick={handleSaveChanges}>Save Changes</button>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
           </div>
        )}

        {activeTab === 'monthly-plans' && (
           <div className="monthly-plans-content">
               <div className="pricing-container-single">
                  <div className="pricing-card premium-featured">
                     <div className="plan-badge">Most Popular</div>
                     <div className="plan-header-redesign">
                        <h3>Host Premium</h3>
                        <div className="price-stack">
                           <span className="currency">₹</span>
                           <span className="amount">499</span>
                           <span className="period">/ month</span>
                        </div>
                        <p className="plan-subtitle">Everything you need to host like a pro.</p>
                     </div>
                     
                     <div className="plan-divider"></div>

                     <div className="features-grid">
                        <ul className="plan-features-list">
                           <li>
                              <span className="check-icon">✓</span>
                              <span><strong>24/7 Priority Support</strong> (Phone & Chat)</span>
                           </li>
                           <li>
                              <span className="check-icon">✓</span>
                              <span><strong>Add-on Inventory</strong> (Pay as you grow)</span>
                           </li>
                        </ul>
                        <ul className="plan-features-list">
                           <li>
                              <span className="check-icon">✓</span>
                              <span><strong>Advanced Analytics</strong> & Insights</span>
                           </li>
                           <li>
                              <span className="check-icon">✓</span>
                              <span><strong>Smart Pricing Tools</strong> & Automation</span>
                           </li>
                        </ul>
                     </div>

                     <div className="plan-action-area">
                        <button className="btn-activate-premium" onClick={() => setIsSubModalOpen(true)}>
                           Get Started with Premium
                        </button>
                     </div>
                  </div>
               </div>
           </div>
        )}



         {activeTab === 'transactions' && (
            <div className="transactions-content">
               {/* Financial Experience */}
               <div className="stats-grid">
                  <div className="stat-card">
                     <h3>Net Earnings (YTD)</h3>
                     <div className="stat-value">₹54,600</div>
                     <div className="stat-trend positive">+8% vs last year</div>
                  </div>
                  <div className="stat-card">
                     <h3>Pending Payouts</h3>
                     <div className="stat-value">₹8,200</div>
                     <div className="stat-trend">Est. arrival: Nov 07</div>
                  </div>
                  <div className="stat-card">
                     <h3>Total Expenses</h3>
                     <div className="stat-value">₹3,996</div>
                     <div className="stat-trend negative">Subscription Fees</div>
                  </div>
               </div>

               <div className="section-container" style={{ marginTop: '32px' }}>
                  <div className="section-header-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <h3>Transaction History</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                           <button className="btn-action-outline" onClick={() => { setTxnStartDate(''); setTxnEndDate(''); }}><Trash2 size={14} style={{ marginRight: '6px' }} /> Clear Filter</button>
                           <button className="btn-action-outline"><Download size={14} style={{ marginRight: '6px' }} /> Export CSV</button>
                        </div>
                     </div>

                     <div className="txn-controls-row">
                        <div className="txn-tabs">
                           <button 
                              className={`txn-tab ${activeTxnTab === 'bookings' ? 'active' : ''}`}
                              onClick={() => setActiveTxnTab('bookings')}
                           >
                              Booking History
                           </button>
                           <button 
                              className={`txn-tab ${activeTxnTab === 'recharges' ? 'active' : ''}`}
                              onClick={() => setActiveTxnTab('recharges')}
                           >
                              Recharge History
                           </button>
                        </div>
                        
                        <div className="txn-date-filters">
                           <div className="date-input-wrapper">
                              <label>From</label>
                              <input 
                                 type="date" 
                                 value={txnStartDate} 
                                 onChange={(e) => setTxnStartDate(e.target.value)} 
                                 className="txn-date-input"
                              />
                           </div>
                           <div className="date-input-wrapper">
                              <label>To</label>
                              <input 
                                 type="date" 
                                 value={txnEndDate} 
                                 onChange={(e) => setTxnEndDate(e.target.value)} 
                                 className="txn-date-input"
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="host-txn-table">
                     <div className="host-txn-header">
                        <div style={{ flex: 1 }}>Date</div>
                        {activeTxnTab === 'recharges' && <div style={{ flex: 2 }}>Property</div>}
                        <div style={{ flex: 3 }}>Description</div>
                        {activeTxnTab === 'recharges' && <div style={{ flex: 1.5 }}>Expiry Date</div>}
                        <div style={{ flex: 1, textAlign: 'right' }}>Amount</div>
                        <div style={{ flex: 1, textAlign: 'right' }}>Status</div>
                     </div>
                     {mockTransactions
                        .filter(tx => {
                           // Type Filter
                           if (activeTxnTab === 'bookings' && tx.amount <= 0) return false;
                           if (activeTxnTab === 'recharges' && tx.amount >= 0) return false;
                           
                           // Date Filter
                           const txDate = new Date(tx.date);
                           if (txnStartDate && txDate < new Date(txnStartDate)) return false;
                           if (txnEndDate && txDate > new Date(txnEndDate)) return false;
                           
                           return true;
                        })
                        .sort((a,b) => new Date(b.date) - new Date(a.date))
                        .map(tx => (
                        <div key={tx.id} className="host-txn-row">
                           <div style={{ flex: 1, color: '#717171', fontSize: '14px' }}>{tx.date}</div>
                           {activeTxnTab === 'recharges' && <div style={{ flex: 2, fontWeight: 500, fontSize: '14px' }}>{tx.propertyName || '-'}</div>}
                           <div style={{ flex: 3 }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#222' }}>{tx.description}</div>
                              <div style={{ fontSize: '12px', color: '#717171' }}>{tx.type} • {tx.id}</div>
                           </div>
                           {activeTxnTab === 'recharges' && <div style={{ flex: 1.5, fontSize: '14px', color: '#717171' }}>{tx.expiryDate || '-'}</div>}
                           <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, color: tx.amount > 0 ? '#047857' : '#222' }}>
                              {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }).replace('₹', '₹ ')}
                           </div>
                           <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                              <span className={`status-pill ${tx.status.toLowerCase() === 'completed' ? 'active' : 'pending'}`} style={{ position: 'static', transform: 'none' }}>
                                 {tx.status}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
         {activeTab === 'profile' && (
            <div className="profile-content">
              <div className="profile-card">
                 <div className="profile-header-section">
                    <div className="profile-avatar-wrapper">
                       <div className="profile-avatar-large">
                          {profile.avatar ? <img src={profile.avatar} alt="Profile" /> : profile.name.charAt(0)}
                       </div>
                       <label className="btn-upload-avatar">
                          <Camera size={16} />
                          <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                       </label>
                    </div>
                    <div className="profile-title">
                       <h3>{profile.name}</h3>
                       <span className="profile-tag">Superhost</span>
                    </div>
                 </div>

                 <div className="profile-form-grid">
                    <div className="form-group">
                       <label>Full Name</label>
                       <input type="text" name="name" value={profile.name} onChange={handleProfileUpdate} />
                    </div>
                    <div className="form-group">
                       <label>Email Address</label>
                       <input type="email" name="email" value={profile.email} onChange={handleProfileUpdate} />
                       <span className="field-note">Verified ✔</span>
                    </div>
                    <div className="form-group">
                       <label>Phone Number</label>
                       <input type="tel" name="phone" value={profile.phone} onChange={handleProfileUpdate} />
                    </div>
                    <div className="form-group full-width">
                       <label>Bio</label>
                       <textarea name="bio" rows="4" value={profile.bio} onChange={handleProfileUpdate} />
                    </div>
                 </div>

                 <div className="profile-actions">
                    <button className="btn-primary">Save Changes</button>
                 </div>
              </div>
              
              <div className="profile-stats-sidebar">
                 <div className="insight-card">
                    <h4>Host Insights</h4>
                    <div className="insight-row">
                       <span>Joined</span>
                       <strong>Oct 2023</strong>
                    </div>
                    <div className="insight-row">
                       <span>Response Rate</span>
                       <strong>100%</strong>
                    </div>
                    <div className="insight-row">
                       <span>Identity</span>
                       <strong className="verified-text">Verified</strong>
                    </div>
                 </div>
              </div>
            </div>
         )}
         {activeTab === 'payout-details' && (
            <div className="financials-content">
               <div className="financials-card">
                  <div className="financials-header">
                     <div className="header-icon-wrapper">
                        <span className="secure-lock">🔒</span>
                     </div>
                     <div className="header-text">
                        <h3>Tax Profile</h3>
                        <p>Securely manage your payout and tax details. These are never shared with guests.</p>
                     </div>
                  </div>

                  <div className="financials-section">
                     <h4>Tax Information</h4>
                     
                     <div className="host-type-selector">
                        <label className={`type-option ${hostType === 'individual' ? 'active' : ''}`}>
                           <input type="radio" name="hostType" value="individual" checked={hostType === 'individual'} onChange={() => setHostType('individual')} />
                           Individual
                        </label>
                        <label className={`type-option ${hostType === 'company' ? 'active' : ''}`}>
                           <input type="radio" name="hostType" value="company" checked={hostType === 'company'} onChange={() => setHostType('company')} />
                           Company / Business
                        </label>
                     </div>

                     <div className="financials-form-grid">
                        {hostType === 'individual' ? (
                           <>
                              <div className="form-group">
                                 <label>PAN Number</label>
                                 <input type="text" name="pan" value={taxInfo.pan} onChange={handleTaxUpdate} placeholder="e.g. ABCDE1234F" />
                              </div>
                              <div className="form-group">
                                 <label>GSTIN (Optional)</label>
                                 <input type="text" name="gstin" value={taxInfo.gstin} onChange={handleTaxUpdate} placeholder="GST Number" />
                              </div>
                           </>
                        ) : (
                           <>
                              <div className="form-group full-width">
                                 <label>Company Name</label>
                                 <input type="text" name="name" value={companyDetails.name} onChange={handleCompanyUpdate} placeholder="Registered Company Name" />
                              </div>
                              <div className="form-group">
                                 <label>Company PAN</label>
                                 <input type="text" name="pan" value={companyDetails.pan} onChange={handleCompanyUpdate} placeholder="Company PAN" />
                              </div>
                              <div className="form-group">
                                 <label>GSTIN (Mandatory)</label>
                                 <input type="text" name="gstin" value={companyDetails.gstin} onChange={handleCompanyUpdate} placeholder="GST Number" />
                              </div>
                           </>
                        )}
                     </div>
                  </div>

                  <div className="separator-line"></div>

                   <div className="financials-section">
                      <h4>Bank Account Details</h4>
                      <div className="financials-form-grid">
                         <div className="form-group full-width">
                            <label>Account Holder Name</label>
                            <input type="text" name="holderName" value={bankDetails.holderName} onChange={handleBankUpdate} placeholder="Name as per bank records" />
                         </div>
                         <div className="form-group full-width">
                            <label>Bank Name</label>
                            <select 
                              name="bankName" 
                              value={bankDetails.bankName} 
                              onChange={handleBankUpdate}
                            >
                               <option value="">Select your bank</option>
                               {POPULAR_BANKS.map(bank => (
                                  <option key={bank} value={bank}>{bank}</option>
                               ))}
                            </select>
                         </div>
                         <div className="form-group">
                            <label>Account Number</label>
                            <input type="text" name="accountNumber" value={bankDetails.accountNumber} onChange={handleBankUpdate} placeholder="Enter account number" />
                         </div>
                         <div className="form-group">
                            <label>IFSC Code</label>
                            <input type="text" name="ifsc" value={bankDetails.ifsc} onChange={handleBankUpdate} placeholder="e.g. HDFC0001234" />
                         </div>
                      </div>
                   </div>

                  <div className="financials-actions">
                     <button className="btn-primary">Save Financial Details</button>
                  </div>
               </div>

               <div className="financials-sidebar">
                  <div className="secure-note-card">
                     <h4>Why is this needed?</h4>
                     <p>We need your bank details to send you payouts for your bookings. Tax info is required for regulatory compliance.</p>
                     <div className="secure-badge">
                        <span>🔒 256-bit SSL Encrypted</span>
                     </div>
                  </div>
               </div>
            </div>
         )}
         
         {activeTab === 'messages' && (
            <div className="messages-content">
               <div className="messages-sidebar-layout">
                  <div className="messages-list">
                     {['Alice Johnson', 'Charlie Brown'].map(guest => (
                       <div 
                         key={guest} 
                         className={`message-thread-item ${activeMessageGuest === guest ? 'active' : ''}`}
                         onClick={() => setActiveMessageGuest(guest)}
                       >
                         <div className="message-avatar">{guest.charAt(0)}</div>
                         <div className="message-preview">
                           <h4>{guest}</h4>
                           <p>Click to view conversation</p>
                         </div>
                       </div>
                     ))}
                  </div>
                  <div className="messages-chat-window">
                     <div className="chat-header">
                       <h4>{activeMessageGuest}</h4>
                     </div>
                     <div className="chat-history">
                       {mockMessages.filter(m => m.guest === activeMessageGuest).map(msg => (
                         <div key={msg.id} className={`chat-bubble-wrapper ${msg.isHost ? 'host' : 'guest'}`}>
                           <div className="chat-bubble">{msg.text}</div>
                           <span className="chat-time">{msg.time}</span>
                         </div>
                       ))}
                     </div>
                     <div className="chat-input-area">
                       <input 
                         type="text" 
                         value={newMessageText} 
                         onChange={(e) => setNewMessageText(e.target.value)}
                         placeholder="Type a message..."
                         onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                       />
                       <button className="btn-primary" onClick={handleSendMessage}>Send</button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </main>
      
      <LimitManagementModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        listingId={selectedListingId}
        currentLimit={getListingLimit(selectedListingId)}
        onSave={(newLimit) => setInventoryLimits(prev => ({...prev, [selectedListingId]: newLimit}))}
      />

      {/* iCal Automated Sync Modal */}
      {isSyncModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3>Automated Calendar Sync</h3>
            <p className="modal-desc">Paste an iCal (.ics) link from another platform (like VRBO or Booking.com) to automatically keep your availability in sync.</p>
            
            <div style={{ marginTop: '20px', marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Calendar URL</label>
              <input 
                type="url" 
                value={syncUrl} 
                onChange={(e) => setSyncUrl(e.target.value)} 
                placeholder="https://..." 
                className="modal-input"
              />
            </div>
            
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => { setIsSyncModalOpen(false); setSyncUrl(''); }}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  if (syncUrl) {
                    setSyncedCalendars(prev => [...prev, syncUrl]);
                    setIsSyncModalOpen(false);
                    handleMockAutoSync(syncUrl);
                    setSyncUrl('');
                  }
                }}
              >
                Add & Sync Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      <SubscriptionModal 
        isOpen={isSubModalOpen} 
        onClose={() => setIsSubModalOpen(false)} 
        onConfirm={handlePaymentSuccess} 
        listingTitle={listingToSubscribe?.title}
        planPrice={pendingAddOn ? pendingAddOn.cost : 999}
        itemName={pendingAddOn ? "Inventory Add-on" : "Annual Host Subscription"}
        description={pendingAddOn ? `Adding ${pendingAddOn.units} Unit(s) to Limit` : null}
      />


    </div>
  );
};

export default HostDashboard;
