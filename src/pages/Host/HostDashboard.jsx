import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useHost } from '../../context/HostContext';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { User as UserIcon, ChevronLeft, ChevronRight, Download, Trash2, Camera, Upload, Link2, Star, Eye, DollarSign, Calendar, TrendingUp, IndianRupee, Info, MessageSquare, CreditCard, ShieldCheck, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import './HostDashboard.css';
import { generateICalData } from '../../utils/icalGenerator';
import ConfirmationModal from '../../components/molecules/ConfirmationModal/ConfirmationModal';
import SubscriptionModal from '../../components/molecules/SubscriptionModal/SubscriptionModal';
import LimitManagementModal from '../../components/molecules/LimitManagementModal/LimitManagementModal';
import PricingModal from '../../components/molecules/PricingModal/PricingModal';
import Pricing from './Pricing';
import { fetchPayoutStats, fetchHostAnalytics, updateListingPricing, fetchHostBookings, updateBookingStatus, fetchConversations, fetchMessages, startConversation, sendMessage, fetchUserProfile, updateUserProfile, uploadImage, fetchTransactions } from '../../services/api';

const socket = io(window.location.origin); // Use the current host for Socket.io in production

const HostDashboard = () => {
  const { listings, updateListingStatus, loadListingForEdit, deleteListing, resetListingData, activateUnits, refreshListings } = useHost();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Performance Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Read from URL, fallback to defaults
  const activeTab = searchParams.get('tab') || 'overview';
  const listingFilter = searchParams.get('filter') || 'All';

  // Helper functions to update URL
  const setActiveTab = (tab) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    // Optional: Reset filter when switching away from listings tab
    if (tab !== 'listings') newParams.delete('filter');
    setSearchParams(newParams);
  };

  const setListingFilter = (filter) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('filter', filter);
    setSearchParams(newParams);
  };

  const [selectedListingId, setSelectedListingId] = useState('all');
  const selectedListing = selectedListingId === 'all' ? null : listings.find(l => l.id === selectedListingId || l._id === selectedListingId);

  // Pricing Selection State
  const [pricingRange, setPricingRange] = useState({ start: null, end: null });
  const [isPricingDrawerOpen, setIsPricingDrawerOpen] = useState(false);
  const [pendingPrice, setPendingPrice] = useState('');

  // Unsaved Changes State for Calendar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handlePriceChange = () => {
     setHasUnsavedChanges(true);
  };

  const handleBlockSelection = () => {
     if (selectedListingId === 'all') {
        showStatus("Selection Required", "Please select a specific listing to block dates for.");
        return;
     }
   }

  const handleSaveDraft = () => {
     // Save draft logic...
     showStatus("Success", "Changes saved successfully!");
   };

  const handleSaveChanges = () => {
     // In a real app, this would trigger an API call to save all modified dates
     setHasUnsavedChanges(false);
     
     if (selectedDatesToBlock.length > 0) {
        if (selectedListingId === 'all') {
           showStatus("Selection Required", "Please select a specific listing to block dates for.");
           return;
        }

         const activeLimit = selectedListingId === "all" ? listings.reduce((sum, l) => sum + (l.unitCount || 1), 0) : (selectedListing ? (selectedListing.unitCount || 1) : 1);

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

            return existingCount >= activeLimit;
         });

         if (hasConflict) {
            showStatus("Double Booking Prevented", "One or more of the selected dates already have a guest reservation. Please deselect them and try again.");
            return;
         }

         // Persistence logic
         const isMockId = String(selectedListingId).length < 12 || !selectedListingId.toString().match(/^[0-9a-fA-F]{24}$/);

         const saveBlocksToBackend = async () => {
           if (isMockId) {
             // For demo/mock listings, only update local state (already done by handleSaveChanges logic below if we had any)
             // We'll just populate the reservations for immediate feedback
             const newLocalBlocks = selectedDatesToBlock.map((dateStr, i) => ({
                id: `mock-block-${Date.now()}-${i}`,
                listingId: selectedListingId,
                startDate: dateStr,
                endDate: dateStr,
                status: 'Unavailable'
             }));
             setReservations(prev => [...prev, ...newLocalBlocks]);
             showStatus("Success (Demo)", "Dates marked locally. (Login with a real account to save to database)");
             return;
           }

           try {
             const response = await fetch(`/api/listings/${selectedListingId}/blocked-dates`, {
               method: 'PUT',
               headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${localStorage.getItem('hostify_token')}`
               },
               body: JSON.stringify({ dates: selectedDatesToBlock })
             });
             
             if (!response.ok) throw new Error("Failed to save blocked dates");
             
             if (refreshListings) await refreshListings();
             showStatus("Success", "Dates marked as unavailable successfully.");
           } catch (err) {
             console.error("Error saving blocks:", err);
             showStatus("Persistence Error", "Could not save blocked dates to the server.");
           }
         };

         saveBlocksToBackend();
         setIsBlockingMode(false);
         setSelectedDatesToBlock([]);
     }

     handleSaveDraft();
  };

  const handleCancelChanges = () => {
     // In a real app, this would reset the local state arrays to match the server data
     setHasUnsavedChanges(false);
     setIsBlockingMode(false);
     setSelectedDatesToBlock([]);
  };

  // Confirmation Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [blockToUnblock, setBlockToUnblock] = useState(null);
  const [isCalendarUnblockModalOpen, setIsCalendarUnblockModalOpen] = useState(false);
  const [pendingUnblockDates, setPendingUnblockDates] = useState([]);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isPricingConfirmOpen, setIsPricingConfirmOpen] = useState(false);
  const [pendingPricing, setPendingPricing] = useState(null);

  const handleDeleteClick = (id) => {
    setListingToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (listingToDelete) {
      deleteListing(listingToDelete);
      setIsDeleteModalOpen(false);
      setListingToDelete(null);
      showStatus("Deleted", "Listing has been successfully removed.");
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setListingToDelete(null);
  };

  const handleRemoveBlockClick = (resId) => {
    setBlockToUnblock(resId);
    setIsUnblockModalOpen(true);
  };

  const confirmUnblock = () => {
    handleRemoveBlock(blockToUnblock);
    setIsUnblockModalOpen(false);
    setBlockToUnblock(null);
  };

  const handleDiscardClick = () => {
    setIsDiscardModalOpen(true);
  };

  const confirmDiscard = () => {
    handleCancelChanges();
    setIsDiscardModalOpen(false);
  };

  // Subscription Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [listingToSubscribe, setListingToSubscribe] = useState(null);
  // Pricing Modal State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [listingToPrice, setListingToPrice] = useState(null);

  // Status Modal State (Replaces alert)
  const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const showStatus = (title, message, onConfirm = null) => {
    setStatusModal({ isOpen: true, title, message, onConfirm });
  };

  const closeStatus = () => {
    if (statusModal.onConfirm) statusModal.onConfirm();
    setStatusModal({ ...statusModal, isOpen: false });
  };

  // Limit Manager State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  
  // Inventory Management State (now driven by listing.activeSubscriptionUnits from HostContext)
  
  // Real Messaging State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const chatEndRef = useRef(null);

  // Fetch conversations on load
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      try {
        setLoadingConversations(true);
        const data = await fetchConversations();
        setConversations(data);
        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    };
    if (activeTab === 'messages') loadConversations();
  }, [user, activeTab]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation) return;
      try {
        const data = await fetchMessages(selectedConversation._id || selectedConversation.id);
        setMessages(data);
        socket.emit('join_conversation', selectedConversation._id || selectedConversation.id);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();
  }, [selectedConversation]);

  // Socket Listener
  useEffect(() => {
    const handlePrivateMessage = (data) => {
      if (selectedConversation && (data.conversationId === (selectedConversation._id || selectedConversation.id))) {
        setMessages(prev => [...prev, {
          _id: Date.now().toString(),
          sender: data.senderId,
          text: data.text,
          timestamp: data.timestamp
        }]);
      }
      
      setConversations(prev => prev.map(conv => {
          if ((conv._id || conv.id) === data.conversationId) {
              return { ...conv, lastMessage: data.text, updatedAt: new Date() };
          }
          return conv;
      }));
    };

    socket.on('receive_message', handlePrivateMessage);
    return () => socket.off('receive_message', handlePrivateMessage);
  }, [selectedConversation]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !selectedConversation) return;

    const messageText = newMessageText;
    setNewMessageText(''); // Clear input optimistically

    try {
      console.log('[HostDashboard] Sending message via API...');
      await sendMessage(
        selectedConversation._id || selectedConversation.id, 
        messageText, 
        user?.id || user?._id
      );
      // The socket broadcast (receive_message) will add it to the messages state
    } catch (err) {
      console.error('[HostDashboard] Failed to send message:', err);
      setNewMessageText(messageText); // Restore input on failure
      alert('Failed to send message. Please try again.');
    }
  };

  // iCal Automated Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncedCalendars, setSyncedCalendars] = useState([]); // Array of URLs

  const handleMockAutoSync = (url) => {
    if (selectedListingId === 'all') {
      showStatus("Selection Required", "Please select a specific listing to enable auto-sync.");
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
      showStatus("Sync Success", `Successfully synced events from ${new URL(url).hostname}. Added 3 blocked dates.`);
    } catch {
      showStatus("Sync Success", `Successfully synced events from external calendar. Added 3 blocked dates.`);
    }
  };

  // Replace faux state limits with real data logic
  const getListingLimit = (id) => {
     const listing = listings.find(l => l.id === id);
     return listing?.activeSubscriptionUnits || 0;
  };

  const getListingTotalInventory = (id) => {
     const listing = listings.find(l => l.id === id);
     if (!listing) return 1;
     // If listing has units defined directly, use that
     if (listing.unitCount) return listing.unitCount;
     // For hotels/complexes, calculate total physical inventory from rooms
     if (listing.rooms && listing.rooms.length > 0) {
        return listing.rooms.reduce((acc, room) => acc + (parseInt(room.quantity) || 0), 0);
     }
     return 1;
  };

  const handleSubscribe = (id) => {
     const listing = listings.find(l => l.id === id);
     if (listing) {
        setListingToSubscribe(listing);
        setIsSubModalOpen(true);
     }
  };

  const handleDownloadInvoice = (tx) => {
    // Generate a beautiful, printable invoice natively via DOM bridging
    const invoiceWindow = window.open('', '_blank');
    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${tx.metadata?.propertyName || 'Transaction'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111827; }
            .header { border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
            .logo { font-size: 28px; font-weight: 800; color: #db2777; letter-spacing: -0.5px; }
            .brand-name { font-size: 14px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
            .meta { color: #4b5563; margin-top: 8px; font-size: 14px; }
            .customer-details { margin-bottom: 40px; padding: 24px; background: #f9fafb; border-radius: 12px; }
            .line-items { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .line-items th { text-transform: uppercase; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            .line-items th, .line-items td { padding: 16px 8px; text-align: left; }
            .line-items td { border-bottom: 1px solid #f3f4f6; font-size: 15px; }
            .total-row { font-weight: bold; font-size: 18px; color: #111827; }
            .paid-stamp { color: #10b981; font-weight: 700; border: 2px solid #10b981; padding: 4px 12px; border-radius: 6px; display: inline-block; transform: rotate(-5deg); margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
             <div>
                 <div class="logo">Hostify</div>
                 <div class="brand-name">Platform Services</div>
             </div>
             <div style="text-align: right;">
                 <h2 style="margin: 0; font-size: 24px; color: #111827;">TAX INVOICE</h2>
                 <div class="meta">Date: ${new Date(tx.createdAt || tx.date).toLocaleDateString()}</div>
                 <div class="meta" style="font-family: monospace;">TXN: ${tx._id || tx.id}</div>
             </div>
          </div>
          
          <div class="customer-details">
             <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Billed To</div>
             <div style="font-weight: 600; font-size: 16px;">${user?.name || 'Valued Host'}</div>
             <div style="color: #4b5563; margin-top: 4px;">Host ID: ${user?.id || user?._id || 'N/A'}</div>
          </div>

          <table class="line-items">
             <tr>
               <th style="width: 70%;">Description</th>
               <th style="text-align: right;">Amount</th>
             </tr>
             <tr>
               <td>
                  <div style="font-weight: 600;">${tx.description || tx.category}</div>
                  <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Property: ${tx.metadata?.propertyName || tx.listingId?.title || 'Platform Subscription'}</div>
               </td>
               <td style="text-align: right; font-variant-numeric: tabular-nums;">₹${Math.abs(tx.amount || tx.netAmount || 0).toLocaleString('en-IN')}</td>
             </tr>
             <tr class="total-row">
               <td style="text-align: right; border-bottom: none; padding-top: 24px;">Total Paid</td>
               <td style="text-align: right; border-bottom: none; padding-top: 24px; font-variant-numeric: tabular-nums;">₹${Math.abs(tx.amount || tx.netAmount || 0).toLocaleString('en-IN')}</td>
             </tr>
          </table>
          <div style="text-align: right;">
             <div class="paid-stamp">COMPLETED ✓</div>
          </div>
          
          <p style="margin-top: 80px; text-align: center; color: #9ca3af; font-size: 12px;">This is a computer generated invoice and does not require a physical signature.</p>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
    setTimeout(() => {
      invoiceWindow.print();
    }, 800);
  };

  const handlePaymentSuccess = () => {
     refreshListings();
     setIsSubModalOpen(false);
     setListingToSubscribe(null);
     showStatus("Success", "Subscription activated successfully!");
  };

  const handleEdit = (listing) => {
    loadListingForEdit(listing);
    navigate('/become-a-host/step1');
  };

  const handleOpenPricing = (listing) => {
    setListingToPrice(listing);
    setIsPricingModalOpen(true);
  };

  const handleUpdatePricing = (listingId, pricingData) => {
    setPendingPricing({ listingId, pricingData });
    setIsPricingConfirmOpen(true);
  };

  const confirmUpdatePricing = async () => {
    if (!pendingPricing) return;
    const { listingId, pricingData } = pendingPricing;
    
    try {
      await updateListingPricing(listingId, pricingData);
      setIsPricingConfirmOpen(false);
      setPendingPricing(null);
      showStatus("Success", "Pricing updated successfully!", () => window.location.reload());
    } catch (err) {
      showStatus("Error", "Failed to update pricing: " + err.message);
    }
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTxnTab, setActiveTxnTab] = useState('bookings');
  const [txnStartDate, setTxnStartDate] = useState('');
  const [txnEndDate, setTxnEndDate] = useState('');

  // Profile State
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: '',
    avatar: user?.avatar || null 
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const data = await fetchUserProfile();
        setProfile({
           name: data.name || '',
           email: data.email || '',
           phone: data.phone || '',
           bio: data.bio || '',
           avatar: data.avatar || null
        });
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };
    if (activeTab === 'profile') loadProfile();
  }, [activeTab]);

  const handleProfileUpdate = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const updated = await updateUserProfile({
        name: profile.name,
        bio: profile.bio,
        phone: profile.phone,
        avatar: profile.avatar
      });
      setProfile(updated);
      showStatus("Profile Updated", "Your profile changes have been saved successfully.");
    } catch (err) {
      showStatus("Update Failed", err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { imageUrl } = await uploadImage(file);
        setProfile(prev => ({ ...prev, avatar: imageUrl }));
        // Automatically save to profile
        await updateUserProfile({ avatar: imageUrl });
      } catch (err) {
        showStatus("Upload Error", "Failed to upload profile picture.");
      }
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
  
  // Real Payout Data State
  const [payoutData, setPayoutData] = useState(null);
  const [loadingPayouts, setLoadingPayouts] = useState(true);

  React.useEffect(() => {
    const getPayoutStats = async () => {
      try {
        setLoadingPayouts(true);
        const [stats, txns] = await Promise.all([
          fetchPayoutStats(),
          fetchTransactions()
        ]);
        setPayoutData({
          ...stats,
          transactions: txns // Replace/Merge with real transactions from DB
        });
      } catch (err) {
        console.error("Failed to fetch payout stats:", err);
      } finally {
        setLoadingPayouts(false);
      }
    };
    if (activeTab === 'financials' || activeTab === 'overview') {
      getPayoutStats();
    }
  }, [activeTab]);

  React.useEffect(() => {
    const getAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const data = await fetchHostAnalytics();
        setAnalyticsData(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    if (activeTab === 'performance' || activeTab === 'overview') {
      getAnalytics();
    }
  }, [activeTab]);

  // Mock Data for "Interactive" feel
  const stats = {
    earnings: '₹45,000',
    views: 128,
    bookings: 3,
    rating: 4.8
  };

  // Reservations state — starts with mocks, replaced by real API data
  const [reservations, setReservations] = useState([
    { id: 1, listingId: 1700001, guest: 'Alice Johnson', dates: 'Oct 12 - 15', startDate: '2025-10-12', endDate: '2025-10-15', price: '₹12,400', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=alice', rating: 4.9 },
    { id: 2, listingId: 1700001, guest: 'Bob Smith', dates: 'Nov 02 - 05', startDate: '2025-11-02', endDate: '2025-11-05', price: '₹8,200', status: 'Pending', img: 'https://i.pravatar.cc/150?u=bob', rating: 4.5 },
    { id: 3, listingId: 1700002, guest: 'Charlie Brown', dates: 'Feb 10 - 14', startDate: '2026-02-10', endDate: '2026-02-14', price: '₹34,000', status: 'Confirmed', img: 'https://i.pravatar.cc/150?u=charlie', rating: 5.0 },
  ]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // Fetch real bookings from backend
  React.useEffect(() => {
    const getHostBookings = async () => {
      try {
        const data = await fetchHostBookings();
        if (data && data.length > 0) {
          // Map API bookings to the same shape used by the dashboard
          const mapped = data.map(b => ({
            id: b._id,
            listingId: b.listing?._id || b.listing?.id || b.listing,
            listingTitle: b.listing?.title || b.listing?.location || 'Property',
            guest: b.user?.name || b.user?.email || 'Guest',
            guestId: b.user?._id || b.user?.id || b.user,
            guestEmail: b.user?.email || '',
            guestPhone: b.user?.phone || '',
            guestAvatar: b.user?.avatar || '',
            dates: b.dates,
            startDate: b.startDate,
            endDate: b.endDate,
            price: `₹${b.totalPrice?.toLocaleString('en-IN')}`,
            totalPrice: b.totalPrice,
            status: b.status,
            code: b.code,
            img: b.user?.avatar || `https://i.pravatar.cc/150?u=${b._id}`,
            rating: null
          }));
          setReservations(mapped);
        }
      } catch (err) {
        console.warn('Could not load real bookings, showing mock data:', err.message);
      } finally {
        setLoadingReservations(false);
      }
    };
    getHostBookings();
  }, []);

  const handleUpdateReservationStatus = async (reservationId, newStatus) => {
    try {
      await updateBookingStatus(reservationId, newStatus);
      setReservations(prev => prev.map(r =>
        r.id === reservationId ? { ...r, status: newStatus } : r
      ));
    } catch (err) {
      showStatus("Error", 'Failed to update booking: ' + err.message);
    }
  };


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
    const target = new Date(day);
    target.setHours(0,0,0,0);

    const daily = (reservations || []).filter(res => {
      const start = new Date(res.startDate);
      start.setHours(0,0,0,0);
      const end = new Date(res.endDate);
      end.setHours(0,0,0,0);
      
      return target >= start && target <= end;
    });

    // Add manual blocks from listing document
    if (selectedListingId !== 'all' && selectedListing?.blockedDates) {
       const isBlocked = selectedListing.blockedDates.some(bd => {
          const d = new Date(bd);
          return d.getFullYear() === target.getFullYear() && 
                 d.getMonth() === target.getMonth() && 
                 d.getDate() === target.getDate();
       });
       if (isBlocked) {
          daily.push({ id: `block-${target.getTime()}`, status: 'Unavailable', guest: 'Unavailable' });
       }
    }
    return daily;
  };

  const getPriceForDay = (day) => {
    if (!selectedListing) return 0;
    
    const dayStr = day.toISOString().split('T')[0];
    
    // 1. Check for specific date override
    if (selectedListing.priceOverrides && Array.isArray(selectedListing.priceOverrides)) {
      const override = selectedListing.priceOverrides.find(ov => 
        new Date(ov.date).toISOString().split('T')[0] === dayStr
      );
      if (override) return override.price;
    }
    
    // 2. Check for weekend pricing (Fri/Sat)
    const dayOfWeek = day.getDay();
    if ((dayOfWeek === 5 || dayOfWeek === 6) && selectedListing.weekendPrice) {
      return selectedListing.weekendPrice;
    }
    
    // 3. Return base price
    return selectedListing.price || 0;
  };

  const resetPricingSelection = () => {
    setPricingRange({ start: null, end: null });
    setIsPricingDrawerOpen(false);
  };

   const handleDayClick = (day) => {
    if (isBlockingMode) {
      if (selectedListingId === 'all') {
        showStatus("Selection Required", "Please select a specific listing to block dates for.");
        return;
      }
      toggleDateSelection(day.toISOString());
      return;
    }
    
    if (selectedListingId === 'all') {
      showStatus("Select a listing", "Please select a specific listing to manage pricing.");
      return;
    }

    const clickedDay = new Date(day);
    clickedDay.setHours(0,0,0,0);

    if (!pricingRange.start || (pricingRange.start && pricingRange.end)) {
      setPricingRange({ start: clickedDay, end: null });
      setPendingPrice(String(getPriceForDay(clickedDay)));
      setIsPricingDrawerOpen(true);
    } else {
      const start = pricingRange.start;
      if (clickedDay < start) {
        setPricingRange({ start: clickedDay, end: start });
      } else {
        setPricingRange({ ...pricingRange, end: clickedDay });
      }
    }
  };

  const handleToggleSingleDateBlock = async () => {
    if (!pricingRange.start || selectedListingId === 'all') return;
    
    // Check if it's a mock ID
    const targetId = selectedListing?._id || selectedListing?.id || selectedListingId;
    const isMockId = String(targetId).length < 12 || !targetId.toString().match(/^[0-9a-fA-F]{24}$/);
    
    const datesToToggle = pricingRange.end 
      ? eachDayOfInterval({ start: pricingRange.start, end: pricingRange.end }).map(d => d.toISOString())
      : [pricingRange.start.toISOString()];

    if (isMockId) {
       showStatus("Demo Mode", "This is a placeholder listing. Real availability toggling requires an API-backed property.");
       return;
    }

    // If we're marking as AVAILABLE (i.e. currently blocked), we need confirmation
    const isCurrentlyBlocked = getDailyReservations(pricingRange.start).some(r => r.status === 'Unavailable');
    
    if (isCurrentlyBlocked) {
       setPendingUnblockDates(datesToToggle);
       setIsCalendarUnblockModalOpen(true);
       return;
    }

    try {
      const response = await fetch(`/api/listings/${targetId}/blocked-dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hostify_token')}`
        },
        body: JSON.stringify({ dates: datesToToggle })
      });
      
      if (!response.ok) throw new Error("Failed to update availability");
      
      if (refreshListings) await refreshListings();
      showStatus("Success", "Date availability updated.");
      setIsPricingDrawerOpen(false);
    } catch (err) {
      console.error("Error toggling block:", err);
      showStatus("Persistence Error", "Could not update availability.");
    }
  };

  const handleImmediateUnblock = async (day) => {
    if (selectedListingId === 'all') return;
    
    const dates = [day.toISOString()];
    setPendingUnblockDates(dates);
    setIsCalendarUnblockModalOpen(true);
  };

  const confirmCalendarUnblock = async () => {
    const targetId = selectedListing?._id || selectedListing?.id || selectedListingId;
    
    try {
      const response = await fetch(`/api/listings/${targetId}/blocked-dates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hostify_token')}`
        },
        body: JSON.stringify({ dates: pendingUnblockDates })
      });
      
      if (!response.ok) throw new Error("Failed to update availability");
      
      if (refreshListings) await refreshListings();
      setIsCalendarUnblockModalOpen(false);
      setPendingUnblockDates([]);
      setIsPricingDrawerOpen(false);
      showStatus("Success", "Dates are now available for booking.");
    } catch (err) {
      console.error("Error toggling block:", err);
      showStatus("Error", "Could not update availability.");
    }
  };

  const handleMessageGuest = async (res) => {
    // Normalizing IDs to strings
    const guestId = String(res.guestId?._id || res.guestId?.id || res.guestId || '');
    const listingId = String(res.listingId?._id || res.listingId?.id || res.listingId || '');
    
    if (!guestId || guestId === 'undefined' || !listingId || listingId === 'undefined') {
       console.warn("Incomplete booking data for messaging:", { guestId, listingId });
       setActiveTab('messages');
       return;
    }

    // Try to find an existing conversation with this guest for this specific listing
    let targetConv = conversations.find(conv => {
      const convListingId = String(conv.listing?._id || conv.listing?.id || conv.listing || '');
      const hasGuest = conv.participants?.some(p => String(p._id || p.id || p) === guestId);
      return hasGuest && convListingId === listingId;
    });

    if (!targetConv) {
       // Start a new conversation via API
       try {
          const newConv = await startConversation(guestId, listingId);
          if (newConv) {
             setConversations(prev => [newConv, ...prev]);
             targetConv = newConv;
          }
       } catch (err) {
          console.error("Failed to start conversation:", err);
       }
    }

    // Fallback: If still no conversation (e.g. mock data or API failed), try finding any conversation with this guest name
    if (!targetConv) {
       targetConv = conversations.find(conv => 
         conv.participants?.some(p => p.name === res.guest)
       );
    }

    if (targetConv) {
      setSelectedConversation(targetConv);
    }

    setActiveTab('messages');
  };

  const handleBulkPriceUpdate = async () => {
    if (!pricingRange.start || !selectedListing || !pendingPrice) return;
    
    const startDate = pricingRange.start;
    const endDate = pricingRange.end || pricingRange.start;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/listings/${selectedListing._id || selectedListing.id}/price-overrides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          price: Number(pendingPrice)
        })
      });
      
      if (response.ok) {
        showStatus("Pricing Updated", "The new rates have been applied successfully.");
        if (refreshListings) await refreshListings();
        resetPricingSelection();
      }
    } catch (err) {
      showStatus("Update Failed", "Could not save pricing changes.");
    }
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
    link.setAttribute('download', `Hostify_calendar_${selectedListingId === 'all' ? 'all' : selectedListingId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCal = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (selectedListingId === 'all') {
      showStatus("Selection Required", "Please select a specific listing to import calendar data.");
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
     showStatus("Import Success", `${file.name} imported successfully. 4 new blocks added.`);
     e.target.value = null;
   };

   // Mock Guest Reviews Data
   const [guestReviews] = useState([
     {
        id: 'R-001',
        guestName: 'Sarah Jenkins',
        guestPhoto: '👩🏽',
        listingName: 'Luxury Seaside Villa',
        date: 'October 2025',
        rating: 5,
        text: 'Absolutely stunning property! The views were breathtaking and the host was incredibly responsive. We will definitely be coming back next summer.',
        responseTime: 'Responded in 1 hour'
     },
     {
        id: 'R-002',
        guestName: 'David Chen',
        guestPhoto: '👨🏻',
        listingName: 'Mountain Retreat in Manali',
        date: 'November 2025',
        rating: 4,
        text: 'Great cabin with lots of charm. It got a bit cold at night, but the fireplace made up for it. Perfect location for hiking.',
        responseTime: ''
     },
     {
        id: 'R-003',
        guestName: 'Emily & Tom',
        guestPhoto: '👫🏼',
        listingName: 'Cozy Downtown Apartment',
        date: 'December 2025',
        rating: 5,
        text: 'The best location! We walked everywhere. The apartment was spotless and exactly as pictured. Highly recommend for a city break.',
        responseTime: 'Responded in 30 mins'
     },
     {
        id: 'R-004',
        guestName: 'Michael Rossi',
        guestPhoto: '👨🏽‍rt',
        listingName: 'Luxury Seaside Villa',
        date: 'January 2026',
        rating: 5,
        text: 'Five stars across the board. The amenities were top-notch and the check-in process was seamless. A true luxury experience.',
        responseTime: ''
     }
   ]);

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
           <button onClick={() => setActiveTab('performance')} className={`nav-item ${activeTab === 'performance' ? 'active' : ''}`}>
                         Performance
                     </button>
           <button onClick={() => setActiveTab('bookings')} className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}>
             Reservations <span className="badge-count">2</span>
           </button>
           <button onClick={() => setActiveTab('calendar')} className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}>
             Calendar
           </button>
            <button onClick={() => setActiveTab('financials')} className={`nav-item ${activeTab === 'financials' ? 'active' : ''}`}>
             Financials & Payouts
            </button>
           <button onClick={() => setActiveTab('messages')} className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}>
             Messages <span className="badge-count">1</span>
           </button>
            <button onClick={() => setActiveTab('reviews')} className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`}>
              Guest Reviews
            </button>
            <button onClick={() => setActiveTab('profile')} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
              My Profile
            </button>


        </nav>
        <div className="sidebar-footer">
           <Link to="/" className="exit-link">Exit to Hostify</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="main-header">
           <h2>
             {activeTab === 'overview' ? 'Dashboard Overview' : 
              activeTab === 'listings' ? 'My Listings' : 
              activeTab === 'bookings' ? 'Reservations' : 
              activeTab === 'calendar' ? 'Calendar & Availability' : 
              activeTab === 'performance' ? 'Performance Analytics' :
              activeTab === 'financials' ? 'Financials & Payouts' : 
              activeTab === 'messages' ? 'Guest Messages' :
              activeTab === 'reviews' ? 'Guest Reviews' : 
              activeTab === 'payout-details' ? 'Tax Profile' : 
              activeTab === 'profile' ? 'My Profile' : 
              'Monthly Plans'}
           </h2>
        </header>

        {activeTab === 'performance' && (
          <div className="performance-tab-content">
             <div className="performance-hero-stats">
               <div className="perf-metric-box">
                  <div className="p-label">Profile Views</div>
                  <div className="p-value">{analyticsData?.viewsCount?.toLocaleString() || '0'}</div>
                  <div className="p-trend positive">↑ {analyticsData?.viewsTrend}% vs last month</div>
               </div>
               <div className="perf-metric-box">
                  <div className="p-label">Conversion Rate</div>
                  <div className="p-value">{analyticsData?.conversionRate || '0'}%</div>
                  <div className="p-trend">Industry avg: 2.1%</div>
               </div>
               <div className="perf-metric-box">
                  <div className="p-label">Booking Lead Time</div>
                  <div className="p-value">{analyticsData?.bookingLeadTime || '0'} days</div>
                  <div className="p-trend">Average time guests book in advance</div>
               </div>
             </div>

             <div className="performance-charts-grid">
                <div className="chart-card-premium">
                   <h3>Views Over Time</h3>
                   <div className="css-bar-chart">
                      {analyticsData?.performanceByMonth?.map(item => (
                        <div key={item.month} className="bar-group">
                           <div className="bar-wrapper">
                              <div 
                                className="bar-fill blue" 
                                style={{ height: `${(item.views / 1500) * 100}%` }}
                              ></div>
                           </div>
                           <span className="bar-label">{item.month}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="chart-card-premium">
                   <h3>Bookings Conversion</h3>
                   <div className="css-bar-chart">
                      {analyticsData?.performanceByMonth?.map(item => (
                        <div key={item.month} className="bar-group">
                           <div className="bar-wrapper">
                              <div 
                                className="bar-fill green" 
                                style={{ height: `${(item.bookings / 40) * 100}%` }}
                              ></div>
                           </div>
                           <span className="bar-label">{item.month}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="performance-tips-banner">
                <div className="tip-icon">💡</div>
                <div className="tip-text">
                   <h4>Want more views?</h4>
                   <p>Update your photos to include more natural lighting. Properties with high-quality first photos get 40% more clicks.</p>
                </div>
                <button className="btn-tip">Improve Listing</button>
             </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-tab-content">
             <div className="reviews-summary-card">
                <div className="review-score-big">4.8</div>
                <div className="review-stars-big">
                   {[1,2,3,4,5].map(star => <Star key={star} size={24} fill="#FFB800" color="#FFB800" />)}
                </div>
                <div className="review-total-count">Average from {guestReviews.length} reviews</div>
             </div>
             
             <div className="reviews-grid">
                {guestReviews.map(review => (
                   <div key={review.id} className="review-card-premium">
                      <div className="review-card-header">
                         <div className="reviewer-avatar">{review.guestPhoto}</div>
                         <div className="reviewer-info">
                            <h4>{review.guestName}</h4>
                            <span className="reviewer-date">{review.date}</span>
                         </div>
                      </div>
                      <div className="review-listing-ref">
                         stayed at <strong>{review.listingName}</strong>
                      </div>
                      <div className="review-stars-small">
                         {[...Array(5)].map((_, i) => (
                           <Star key={i} size={14} fill={i < review.rating ? "#FFB800" : "#E2E8F0"} color={i < review.rating ? "#FFB800" : "#E2E8F0"} />
                         ))}
                      </div>
                      <p className="review-text-content">"{review.text}"</p>
                      <div className="review-card-actions">
                         <button className="btn-reply-review">Reply to {review.guestName.split(' ')[0]}</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'overview' && (
           <div className="overview-content">
              {/* Stats Cards Overhaul */}
              <div className="stats-grid-premium">
                  <div className="stat-card-premium">
                     <div className="stat-header-premium">
                        <span className="stat-label-premium">Net Earnings</span>
                        <IndianRupee className="stat-icon-premium" size={20} />
                     </div>
                     <div className="stat-value-premium">₹{payoutData?.summary?.totalPaid?.toLocaleString('en-IN') || '0'}</div>
                     <div className="stat-trend-premium positive">Life-time received</div>
                  </div>

                  <div className="stat-card-premium">
                     <div className="stat-header-premium">
                        <span className="stat-label-premium">Available Balance</span>
                        <Wallet className="stat-icon-premium" size={20} />
                     </div>
                     <div className="stat-value-premium">₹{payoutData?.summary?.availableBalance?.toLocaleString('en-IN') || '0'}</div>
                     <div className="stat-trend-premium">Ready for withdrawal</div>
                  </div>

                  <div className="stat-card-premium">
                     <div className="stat-header-premium">
                        <span className="stat-label-premium">Upcoming Payouts</span>
                        <Calendar className="stat-icon-premium" size={20} />
                     </div>
                     <div className="stat-value-premium">₹{payoutData?.summary?.pendingBalance?.toLocaleString('en-IN') || '0'}</div>
                     <div className="stat-trend-premium">Expected this month</div>
                  </div>

                  <div className="stat-card-premium">
                     <div className="stat-header-premium">
                        <span className="stat-label-premium">Gross Volume</span>
                        <TrendingUp className="stat-icon-premium" size={20} />
                     </div>
                     <div className="stat-value-premium">₹{payoutData?.summary?.totalGross?.toLocaleString('en-IN') || '0'}</div>
                     <div className="stat-trend-premium positive">Total bookings value</div>
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
                            <p>Activate " {(l.title || "Untitled Listing").length > 50 ? `${(l.title || "Untitled Listing").substring(0, 50)}...` : (l.title || "Untitled Listing")} " to start receiving bookings.</p>
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
                           <div className="rb-actions">
                              <button 
                                className="btn-icon-pulse" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMessageGuest(res);
                                }}
                                title="Message Guest"
                              >
                                <MessageSquare size={16} />
                              </button>
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
                   <div className="listing-filters-tabs">
                     {['All', 'Active', 'Inactive', 'Pending Approval'].map(filter => {
                       let count = 0;
                       if (filter === 'All') count = listings.length;
                       else if (filter === 'Active') count = listings.filter(l => l.status === 'Active').length;
                       else if (filter === 'Inactive') count = listings.filter(l => l.status === 'Inactive' || l.status === 'Payment Required').length;
                       else if (filter === 'Pending Approval') count = listings.filter(l => l.status === 'Pending').length;

                       return (
                         <button
                           key={filter}
                           className={`filter-tab-pill ${listingFilter === filter ? 'active' : ''}`}
                           onClick={() => setListingFilter(filter)}
                         >
                           {filter} <span className="tab-count">{count}</span>
                         </button>
                       );
                     })}
                   </div>
                </div>
                
                <div className="listings-grid-v2">
                       {filteredListings.length === 0 ? (
                         <div className="empty-listings-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>No Listings Found</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>It looks like you haven't created any authentic properties yet.</p>
                            <Link to="/become-a-host" className="btn-save-draft" style={{ display: 'inline-flex', textDecoration: 'none' }}>Create Your First Listing</Link>
                         </div>
                       ) : filteredListings.map(listing => {
                        const createdAt = listing.createdAt ? new Date(listing.createdAt) : new Date();
                        const expiryDate = new Date(createdAt);
                        expiryDate.setMonth(createdAt.getMonth() + 1);
                        
                        const isValidDate = !isNaN(expiryDate.getTime());
                        const diffInDays = isValidDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
                        const isExpired = listing.status === 'Active' && diffInDays <= 0;
                        const isExpiringSoon = listing.status === 'Active' && diffInDays > 0 && diffInDays <= 7;
                        const isPending = listing.status === 'Pending';
                        const isPaymentRequired = listing.status === 'Payment Required';
                        const currentStatus = isExpired ? 'Expired' : listing.status;
                        

                        // Calculate pending requests
                        const pendingRequests = reservations.filter(r => r.listingId === listing.id && r.status === 'Pending').length;

                        return (
                            <div key={listing.id} className={`listing-card-premium ${isExpired ? 'is-expired' : isPaymentRequired ? 'is-pending' : isPending ? 'is-pending' : 'is-active'}`}>
                              {/* Top Status Header */}
                              <div className="card-top-header">
                                 <div className="status-indicator">
                                    <span className="status-icon">{isExpired ? '✕' : isPaymentRequired ? '!' : isPending ? '⏳' : '✓'}</span>
                                    <div className="status-text-group">
                                       <span className="status-text">{isExpired ? 'EXPIRED LISTING' : isPaymentRequired ? 'PAYMENT REQUIRED' : isPending ? 'PENDING APPROVAL' : 'ACTIVE LISTING'}</span>
                                    </div>
                                 </div>
                                 <div className="status-date">
                                    {isExpired ? `Expired on ${expiryDate.toLocaleDateString()}` : isPending ? `Submitted on ${createdAt.toLocaleDateString()}` : `Valid until ${expiryDate.toLocaleDateString()}`}
                                 </div>
                                 <button 
                                    className="btn-delete-card" 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleDeleteClick(listing.id);
                                    }}
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>

                              <div className="card-image-wrapper">
                                  {(() => {
                                    // Support both photos array and single image field (from API)
                                    const firstPhoto = listing.photos?.[0];
                                    const hasPhoto = firstPhoto || listing.image;
                                    if (!hasPhoto) {
                                      return (
                                        <div className="no-photo-placeholder">
                                          <span className="placeholder-emoji">🏠</span>
                                          <span className="placeholder-text">No photo added</span>
                                        </div>
                                      );
                                    }
                                    let imgUrl = listing.image || '';
                                    if (firstPhoto) {
                                      if (typeof firstPhoto === 'string') imgUrl = firstPhoto;
                                      else if (firstPhoto instanceof File) imgUrl = URL.createObjectURL(firstPhoto);
                                      else if (firstPhoto && firstPhoto.url) imgUrl = firstPhoto.url;
                                    }
                                    return (
                                      <>
                                        <img src={imgUrl} alt={listing.title} className={isExpired || isPending ? 'desaturated' : ''} />
                                        {isExpired && (
                                          <div className="expired-banner">
                                            <span>EXPIRED</span>
                                            <div className="status-tooltip-container">
                                              <Info size={14} className="info-icon-trigger" />
                                              <div className="status-tooltip">
                                                <p className="tooltip-title">Expiry Consequences:</p>
                                                <ul>
                                                  <li>• Not visible to potential guests</li>
                                                  <li>• No new bookings accepted</li>
                                                  <li>• Removed from search results</li>
                                                </ul>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        {isPending && (
                                          <div className="pending-banner">
                                            <span>IN REVIEW</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                              </div>

                              <div className="card-content-premium">
                                 <div className="content-main-info">
                                    <div className="title-row">
                                       <h4 className="premium-card-title" title={listing.title || 'Untitled Listing'}>{listing.title || 'Untitled Listing'}</h4>
                                       <div className="premium-rating">
                                          <Star size={14} fill="#FFB800" color="#FFB800" />
                                          <span className="rating-val">{listing.rating > 0 ? listing.rating.toFixed(1) : 'New'}</span>
                                          <span className="rating-count">({listing.reviewCount || Math.floor(Math.random() * 50) + 5})</span>
                                       </div>
                                    </div>
                                    <p className="premium-location">{listing.location}</p>
                                 </div>

                                 <div className="card-bottom-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                 <div className="premium-metrics-grid">
                                    <div className="metric-item">
                                       <span className="metric-label">Property Type</span>
                                       <span className="metric-value">{listing.type || 'Property'}</span>
                                    </div>
                                    <div className="metric-item">
                                       <span className="metric-label">Capacity</span>
                                       <span className="metric-value">{listing.guests || 2} guests</span>
                                    </div>
                                    <div className="metric-item">
                                       <span className="metric-label">Total Views</span>
                                       <span className="metric-value">124</span>
                                    </div>
                                    <div className="metric-item">
                                       <span className="metric-label">Active Units</span>
                                       <span className="metric-value">{getListingLimit(listing.id)}/{getListingTotalInventory(listing.id)}</span>
                                    </div>
                                 </div>

                                 <div className="premium-pricing-row">
                                    <span className="premium-price">₹{listing.price || 0}</span>
                                    <span className="premium-price-label">/ night</span>
                                 </div>

                                 </div>{/* /card-bottom-section */}

                                 {/* Action Buttons */}
                                 <div className="premium-card-actions">
                                    {(isExpired || isPaymentRequired) ? (
                                       <div className="expired-actions-stack">
                                          <button 
                                             className="btn-renew-primary"
                                             onClick={(e) => { e.stopPropagation(); handleSubscribe(listing.id || listing._id); }}
                                          >
                                             <span className="renew-icon">⚡️</span> Renew & Go Live <span className="arrow">→</span>
                                          </button>
                                          <div className="secondary-actions-row">
                                             <button className="btn-premium-secondary" onClick={() => handleEdit(listing)}>Edit</button>
                                             <button className="btn-premium-secondary" onClick={() => navigate(`/rooms/${listing._id || listing.id}`, { state: { fromHost: true } })}>Preview</button>
                                          </div>
                                       </div>
                                    ) : isPending ? (
                                       <div className="pending-actions-row">
                                          <button className="btn-premium-secondary disabled" disabled>Awaiting Approval</button>
                                          <button className="btn-premium-secondary" onClick={() => handleEdit(listing)}>Edit Listing</button>
                                       </div>
                                    ) : (
                                       <div className="active-actions-row">
                                          <button className="btn-premium-secondary" onClick={() => handleEdit(listing)}>Edit Listing</button>
                                          <button className="btn-premium-secondary" onClick={() => handleOpenPricing(listing)}>Manage Pricing</button>
                                          <button 
                                            className="btn-premium-secondary" 
                                            onClick={() => navigate(`/rooms/${listing._id || listing.id}`, { state: { fromHost: true } })}
                                          >
                                            View Public
                                          </button>
                                       </div>
                                    )}
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
          confirmText="Yes"
          cancelText="No"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDestructive={true}
        />

        <ConfirmationModal
          isOpen={isUnblockModalOpen}
          title="Remove Block"
          message="Are you sure you want to remove this reservation block?"
          confirmText="Yes"
          cancelText="No"
          onConfirm={confirmUnblock}
          onCancel={() => setIsUnblockModalOpen(false)}
        />

        <ConfirmationModal
          isOpen={isDiscardModalOpen}
          title="Discard Changes"
          message="You have unsaved changes to your calendar. Are you sure you want to discard them?"
          confirmText="Yes"
          cancelText="No"
          onConfirm={confirmDiscard}
          onCancel={() => setIsDiscardModalOpen(false)}
          isDestructive={true}
        />

        <ConfirmationModal
          isOpen={isPricingConfirmOpen}
          title="Update Pricing"
          message="Are you sure you want to apply these pricing changes to your listing?"
          confirmText="Yes"
          cancelText="No"
          onConfirm={confirmUpdatePricing}
          onCancel={() => setIsPricingConfirmOpen(false)}
        />

        <ConfirmationModal
          isOpen={isCalendarUnblockModalOpen}
          title="Make Dates Available"
          message={`Are you sure you want to make ${pendingUnblockDates.length > 1 ? 'these dates' : 'this date'} available? This will allow guests to book them.`}
          confirmText="Make Available"
          cancelText="Cancel"
          onConfirm={confirmCalendarUnblock}
          onCancel={() => {
            setIsCalendarUnblockModalOpen(false);
            setPendingUnblockDates([]);
          }}
        />

        <SubscriptionModal 
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          onConfirm={handlePaymentSuccess}
          listingId={listingToSubscribe?._id || listingToSubscribe?.id}
          listingTitle={listingToSubscribe?.title}
        />

        <ConfirmationModal 
           isOpen={statusModal.isOpen}
           title={statusModal.title}
           message={statusModal.message}
           onConfirm={closeStatus}
           confirmText="OK"
         />

        <PricingModal 
           key={listingToPrice?._id || listingToPrice?.id || 'none'}
           isOpen={isPricingModalOpen}
           onClose={() => setIsPricingModalOpen(false)}
           listing={listingToPrice}
           onUpdate={handleUpdatePricing}
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
                                <Star size={10} fill="var(--primary)" color="var(--primary)" />
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
                             <button className="btn-link" onClick={() => handleMessageGuest(res)}>Message</button>
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
                    


                    <div className="cal-header-right">
                       <div className="cal-listing-selector">
                           <select 
                              value={selectedListingId} 
                              onChange={(e) => setSelectedListingId(e.target.value)}
                              className="listing-dropdown"
                           >
                              <option value="all">All Listings</option>
                              {listings.map(l => (
                                 <option key={l.id} value={l.id}> {(l.title || "Untitled Listing").length > 50 ? `${(l.title || "Untitled Listing").substring(0, 50)}...` : (l.title || "Untitled Listing")} </option>
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
                                 showStatus("Selection Required", "Please select a specific listing to setup automated sync.");
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
                        
                         {isBlockingMode ? (
                           <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                              <button 
                                 className="btn-cancel-small" 
                                 onClick={() => {
                                   setIsBlockingMode(false);
                                   setSelectedDatesToBlock([]);
                                 }}
                              >
                                 Cancel
                              </button>
                              <button 
                                 className="btn-save-small" 
                                 onClick={() => {
                                   handleSaveChanges();
                                   setIsBlockingMode(false);
                                   setSelectedDatesToBlock([]);
                                 }}
                              >
                                 Save {selectedDatesToBlock.length > 0 ? `(${selectedDatesToBlock.length})` : ''}
                              </button>
                           </div>
                         ) : (
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
                              const activeLimit = selectedListingId === "all" ? listings.reduce((sum, l) => sum + (l.unitCount || 1), 0) : (selectedListing ? (selectedListing.unitCount || 1) : 1);
                              const isToday = isSameDay(day, new Date());
                              const isPastDay = day < new Date(new Date().setHours(0,0,0,0));
                              const isCurrentMonth = isSameMonth(day, currentMonth);
                              const totalBlocks = dailyReservations.length;
                              const hasBooking = totalBlocks > 0;
                              const isFull = totalBlocks >= activeLimit;
                              
                              const isSelected = pricingRange.start && isSameDay(day, pricingRange.start);
                              const isInRange = pricingRange.start && pricingRange.end && day >= pricingRange.start && day <= pricingRange.end;
                              
                              const isManualBlocked = dailyReservations.some(r => r.status === 'Unavailable');
                              const isBlockingSelected = selectedDatesToBlock.includes(day.toISOString());

                              return (
                                 <div 
                                   key={day.toString()} 
                                   onClick={() => handleDayClick(day)} 
                                   className={`day-cell ${!isCurrentMonth ? 'outside' : ''} ${hasBooking ? 'booked' : ''} ${isManualBlocked ? 'blocked' : ''} ${isFull ? 'fully-booked' : ''} ${isToday ? 'today' : ''} ${isBlockingMode ? 'blocking-mode-cell' : ''} ${isBlockingSelected ? 'blocking-selected' : ''} ${isPastDay ? 'past-day' : ''} ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
                                 >
                                    {isBlockingMode && !isPastDay && !isFull && (
                                      <input 
                                        type="checkbox" 
                                        className="day-block-checkbox"
                                        checked={isBlockingSelected}
                                        readOnly
                                      />
                                    )}
                                    <div className="day-number">{format(day, 'd')}</div>
                                    {activeLimit > 1 && (
                                        <div className="unit-counter" style={{ fontSize: '11px', color: isFull ? '#fff' : 'var(--primary)', fontWeight: 'bold', marginTop: '2px' }}>
                                          {totalBlocks}/{activeLimit} Booked
                                        </div>
                                    )}
                                    <div className="day-price">
                                       {selectedListingId === 'all' || isManualBlocked ? (
                                          ''
                                        ) : (
                                           <div className="cell-price-label">
                                              <span>₹{getPriceForDay(day)?.toLocaleString("en-IN")}</span>
                                           </div>
                                        )}
                                    </div>
                                    
                                    <div className="bookings-stack">
                                       {isManualBlocked ? (
                                          <>
                                             <div className="manual-block-indicator">Blocked</div>
                                             <button 
                                               className="unblock-text-btn"
                                               onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleImmediateUnblock(day);
                                               }}
                                               style={{ marginTop: '4px', zIndex: 5 }}
                                             >
                                                Make Available
                                             </button>
                                          </>
                                       ) : dailyReservations.map((res, i) => (
                                           <div 
                                             key={res.id} 
                                             className="booking-strip" 
                                             style={{
                                                backgroundColor: (i % 2 === 0 ? 'var(--primary)' : '#222'),
                                             }}
                                           >
                                             <span className="booking-strip-title" title={selectedListingId === 'all' ? (res.listingTitle || '') : res.guest}>
                                                {selectedListingId === 'all' 
                                                   ? (res.listingTitle || 'Listing') 
                                                   : (res.guest || 'Guest')}
                                             </span>
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
                              <button className="btn-cancel" onClick={handleDiscardClick}>Discard</button>
                              <button className="btn-save" onClick={handleSaveChanges}>Save Changes</button>
                           </div>
                        </div>
                     </div>
                  )}
                  
                  {/* Pricing Adjustment Drawer */}
                  <div className={`pricing-drawer ${isPricingDrawerOpen ? 'open' : ''}`}>
                     <div className="drawer-header">
                        <h3>Update Pricing</h3>
                        <button className="btn-close-drawer" onClick={resetPricingSelection}>×</button>
                     </div>
                     <div className="drawer-body">
                        <div className="selected-dates-info">
                           <div className="date-badge">
                              {pricingRange.start ? format(pricingRange.start, 'MMM d, yyyy') : 'Select start'}
                              {pricingRange.end && ` — ${format(pricingRange.end, 'MMM d, yyyy')}`}
                           </div>
                           <p className="selection-hint">
                              {!pricingRange.end ? "Select an end date on the calendar to update a range" : "Set the price for this period"}
                           </p>
                        </div>
                        
                        <div className="drawer-availability-section">
                            <div className="availability-status">
                               <span>Current status</span>
                               {pricingRange.start && (
                                  <span className={`status-badge ${getDailyReservations(pricingRange.start).some(r => r.status === 'Unavailable') ? 'status-blocked' : 'status-available'}`}>
                                     {getDailyReservations(pricingRange.start).some(r => r.status === 'Unavailable') ? 'Unavailable' : 'Available'}
                                  </span>
                               )}
                            </div>
                            <button 
                               className="btn-availability-toggle"
                               onClick={handleToggleSingleDateBlock}
                            >
                               {pricingRange.start && getDailyReservations(pricingRange.start).some(r => r.status === 'Unavailable') 
                                  ? 'Mark as Available' 
                                  : 'Mark as Unavailable'}
                            </button>
                         </div>
                         
                         <div className="drawer-form-group">
                           <label>Nightly Price</label>
                           <div className="drawer-input-wrapper">
                              <span className="currency">₹</span>
                              <input 
                                 type="number" 
                                 value={pendingPrice}
                                 onChange={(e) => setPendingPrice(e.target.value)}
                                 placeholder="e.g. 5500"
                              />
                           </div>
                        </div>

                        <div className="drawer-actions">
                           <button 
                             className="btn-premium" 
                             disabled={!pricingRange.start || !pendingPrice}
                             onClick={handleBulkPriceUpdate}
                           >
                              Apply Changes
                           </button>
                           <button className="btn-premium-secondary" onClick={resetPricingSelection}>Cancel</button>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        )}



         {activeTab === 'financials' && (
            <div className="financials-layout-premium">
               {/* Financial Summary Cards */}
               <div className="financials-hero-section">
                  <div className="balance-card-main">
                     <div className="balance-label">Available for Withdrawal</div>
                     <div className="balance-amount-large">₹{payoutData?.summary?.availableBalance?.toLocaleString('en-IN') || '0'}</div>
                     <button className="btn-withdraw-now" disabled={!payoutData?.summary?.availableBalance}>
                        <Wallet size={18} /> Withdraw Funds
                     </button>
                     <p className="balance-subtext">Transfer time: 2-3 business days</p>
                  </div>
                  
                  <div className="summary-side-cards">
                     <div className="summary-mini-card">
                        <div className="mini-card-header">
                           <Calendar size={16} /> Upcoming
                        </div>
                        <div className="mini-card-value">₹{payoutData?.summary?.pendingBalance?.toLocaleString('en-IN') || '0'}</div>
                        <div className="mini-card-desc">Held in escrow (Check-in + 24h)</div>
                     </div>
                     <div className="summary-mini-card">
                        <div className="mini-card-header">
                           <ShieldCheck size={16} /> Total Net
                        </div>
                        <div className="mini-card-value">₹{payoutData?.summary?.totalNet?.toLocaleString('en-IN') || '0'}</div>
                        <div className="mini-card-desc">Gross minus Est. Transaction Fees</div>
                     </div>
                  </div>
               </div>

                <div className="financials-grid-content">
                   {/* Transaction History Sub-Tab */}
                   <div className="txn-history-section">
                      <div className="section-header-row">
                         <div className="tab-switcher-premium">
                            <button 
                              className={`sub-tab-btn ${(!searchParams.get('subTab') || searchParams.get('subTab') === 'ledger') ? 'active' : ''}`}
                              onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('subTab', 'ledger');
                                setSearchParams(newParams);
                              }}
                            >
                              Transaction Ledger
                            </button>
                            <button 
                              className={`sub-tab-btn ${searchParams.get('subTab') === 'subscriptions' ? 'active' : ''}`}
                              onClick={() => {
                                const newParams = new URLSearchParams(searchParams);
                                newParams.set('subTab', 'subscriptions');
                                setSearchParams(newParams);
                              }}
                            >
                              Subscriptions
                            </button>
                         </div>
                         <div className="header-actions">
                            <button className="btn-action-outline"><Download size={14} /> Export</button>
                         </div>
                      </div>
                     
                     <div className="premium-txn-list">
                        {loadingPayouts ? (
                          <div className="loading-shimmer-payouts">Loading financial records...</div>
                        ) : (payoutData?.transactions || []).filter(tx => (searchParams.get('subTab') || 'ledger') === 'subscriptions' ? tx.category === 'Subscription' : true).length > 0 ? (
                          (payoutData?.transactions || [])
                            .filter(tx => (searchParams.get('subTab') || 'ledger') === 'subscriptions' ? tx.category === 'Subscription' : true)
                            .map(tx => (
                            <div key={tx._id || tx.id} className="premium-txn-item">
                               <div className="txn-info-group">
                                  <div className={`txn-icon-circle ${tx.type?.toLowerCase() || 'credit'}`}>
                                    {tx.type === 'Credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                  </div>
                                  <div className="txn-main-details">
                                     {(() => {
                                         const propertyName = tx.metadata?.propertyName || tx.listingId?.title || tx.propertyName || '';
                                         const plan = (tx.metadata?.planName || 'Monthly').replace(/\s*Activation\s*/i, '').trim();
                                         let resolvedPlan = plan;
                                         let resolvedProperty = propertyName;

                                         if (!propertyName) {
                                           const raw = tx.description || '';
                                           const legacyMatch = raw.match(/Subscription to .+ Plan for property:\s*(.+)/i);
                                           if (legacyMatch) resolvedProperty = legacyMatch[1];
                                           else {
                                             const midotMatch = raw.match(/Monthly(?:\s*Activation)?\s*·\s*(.+)/i);
                                             if (midotMatch) resolvedProperty = midotMatch[1];
                                           }
                                         }

                                         return (
                                           <>
                                             <div className="txn-title">{resolvedPlan}</div>
                                             {resolvedProperty && <div className="txn-property-name">{resolvedProperty}</div>}
                                           </>
                                         );
                                       })()}
                                     <div className="txn-meta">{new Date(tx.createdAt || tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                  </div>
                               </div>
                               <div className="txn-financial-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
                                  <div className="txn-financial-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                     <div className={`txn-amount-net ${tx.type?.toLowerCase() || 'credit'}`}>
                                       ₹{(tx.amount || tx.netAmount)?.toLocaleString('en-IN')}
                                     </div>
                                     <div className={`txn-status-badge ${tx.status?.toLowerCase() === 'completed' ? 'paid' : (tx.status?.toLowerCase() || 'completed')}`}>
                                        {tx.status || 'Completed'}
                                     </div>
                                  </div>
                                  
                                  <button 
                                     className="btn-download-invoice"
                                     onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(tx); }}
                                     title="Download Invoice"
                                     style={{
                                        background: 'transparent',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                     }}
                                     onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#94a3b8';
                                        e.currentTarget.style.color = '#334155';
                                        e.currentTarget.style.background = '#f8fafc';
                                     }}
                                     onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                        e.currentTarget.style.color = '#64748b';
                                        e.currentTarget.style.background = 'transparent';
                                     }}
                                  >
                                     <Download size={18} />
                                  </button>
                               </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-payouts">No transactions found yet.</div>
                        )}
                     </div>
                  </div>

                  {/* Bank & Tax Details Section */}
                  <div className="financial-settings-section">
                     <div className="settings-card-premium">
                        <h3>Bank Account</h3>
                        <p className="card-desc">Where you want to receive your money.</p>
                        
                        {bankDetails.accountNumber ? (
                           <div className="saved-bank-box">
                              <div className="bank-info-main">
                                 <div className="bank-logo-placeholder">🏦</div>
                                 <div className="bank-names">
                                    <div className="bank-primary-name">{bankDetails.bankName}</div>
                                    <div className="bank-acc-hidden">•••• {bankDetails.accountNumber.slice(-4)}</div>
                                 </div>
                              </div>
                              <button className="btn-edit-small" onClick={() => setActiveTab('payout-details')}>Edit</button>
                           </div>
                        ) : (
                           <div className="empty-bank-box" onClick={() => setActiveTab('payout-details')}>
                              <span className="plus-icon">+</span>
                              <span>Add bank account</span>
                           </div>
                        )}

                        <div className="divider-lite"></div>

                        <h3>Tax Information</h3>
                        <div className="tax-summary-mini">
                           <div className="tax-row">
                              <span>Entity Type</span>
                              <strong>{hostType === 'individual' ? 'Individual' : 'Business'}</strong>
                           </div>
                           <div className="tax-row">
                              <span>PAN Number</span>
                              <strong>{hostType === 'individual' ? taxInfo.pan || 'Not Provided' : companyDetails.pan || 'Not Provided'}</strong>
                           </div>
                        </div>
                        <button className="btn-full-width-outline" onClick={() => setActiveTab('payout-details')}>Manage Tax Profile</button>
                     </div>

                     <div className="service-fee-info-card">
                        <div className="info-card-icon"><Info size={18} /></div>
                        <div className="info-card-text">
                           <h4>Platform Fee Structure</h4>
                           <p>You are on a <strong>Flat Monthly Fee</strong> plan. We charge <strong>0% Commission</strong> per booking. Only estimated payment processing fees are deducted.</p>
                        </div>
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
                        <h3>Payout & Tax Setup</h3>
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
                     {loadingConversations ? (
                        <div className="loading-state" style={{ padding: '20px', textAlign: 'center' }}>Loading conversations...</div>
                     ) : conversations.length === 0 ? (
                        <div className="no-data" style={{ padding: '20px', textAlign: 'center' }}>No messages yet.</div>
                     ) : conversations.map(conv => {
                        const otherParticipant = conv.participants?.find(p => String(p._id) !== String(user?.id || user?._id)) || conv.participants?.[0] || { name: 'Guest' };
                        return (
                          <div 
                            key={conv._id || conv.id} 
                            className={`message-thread-item ${(selectedConversation?._id || selectedConversation?.id) === (conv._id || conv.id) ? 'active' : ''}`}
                            onClick={() => setSelectedConversation(conv)}
                          >
                            <div 
                              className="message-avatar" 
                              style={{ 
                                backgroundImage: otherParticipant.image ? `url(${otherParticipant.image})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
                               {!otherParticipant.image && otherParticipant.name?.charAt(0)}
                            </div>
                            <div className="message-preview">
                              <h4>{otherParticipant.name}</h4>
                              <p>{conv.lastMessage || 'No messages yet'}</p>
                              <span className="msg-time" style={{ fontSize: '10px', color: '#999' }}>
                                {conv.updatedAt ? format(new Date(conv.updatedAt), 'MMM dd') : ''}
                              </span>
                            </div>
                          </div>
                        );
                     })}
                  </div>
                  <div className="messages-chat-window">
                     {selectedConversation ? (
                        <>
                           <div className="chat-header">
                             <h4>{selectedConversation.participants?.find(p => String(p._id) !== String(user?.id || user?._id))?.name || 'Conversation'}</h4>
                           </div>
                           <div className="chat-history">
                             {messages.map(msg => (
                               <div key={msg._id || msg.id} className={`chat-bubble-wrapper ${(msg.sender === (user?.id || user?._id) || msg.senderId === (user?.id || user?._id)) ? 'host' : 'guest'}`}>
                                 <div className="chat-bubble">{msg.text || msg.message}</div>
                                 <span className="chat-time">{msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : format(new Date(), 'HH:mm')}</span>
                               </div>
                             ))}
                             <div ref={chatEndRef} />
                           </div>
                           <div className="chat-input-area">
                             <input 
                               type="text" 
                               value={newMessageText} 
                               onChange={(e) => setNewMessageText(e.target.value)}
                               placeholder="Type a message..."
                               onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                             />
                             <button className="btn-primary" onClick={handleSendMessage} disabled={!newMessageText.trim()}>Send</button>
                           </div>
                        </>
                     ) : (
                        <div className="empty-chat-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                           <MessageSquare size={48} />
                           <p>Select a guest conversation to start messaging</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}
         {activeTab === 'profile' && (
            <div className="profile-tab-content-premium">
               <div className="profile-layout-grid-premium">
                  {/* Left Column: Avatar & Summary */}
                  <div className="profile-sidebar-card-premium">
                     <div className="profile-avatar-wrapper-premium">
                        <div 
                          className="profile-avatar-large-premium"
                          style={{ 
                            backgroundImage: profile.avatar ? `url(${profile.avatar})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                           {!profile.avatar && (profile.name?.charAt(0) || user?.name?.charAt(0) || 'H')}
                        </div>
                        <label className="avatar-upload-btn-premium">
                           <Camera size={16} />
                           Update Photo
                           <input type="file" onChange={handleAvatarChange} hidden accept="image/*" />
                        </label>
                     </div>
                     
                     <div className="profile-summary-premium">
                        <h3>{profile.name}</h3>
                        <p className="p-role-badge">Verified Host</p>
                        <div className="p-meta-stats">
                           <div className="p-meta-item">
                              <strong>{listings.length}</strong>
                              <span>Listings</span>
                           </div>
                           <div className="p-divider"></div>
                           <div className="p-meta-item">
                              <strong>4.8</strong>
                              <span>Rating</span>
                           </div>
                        </div>
                     </div>

                     <div className="profile-verification-list">
                        <div className="v-item verified">
                           <ShieldCheck size={14} /> Email Verified
                        </div>
                        <div className="v-item verified">
                           <ShieldCheck size={14} /> Identity Verified
                        </div>
                        <div className="v-item verified">
                           <ShieldCheck size={14} /> Phone Verified
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Edit Form */}
                  <div className="profile-main-edit-card-premium">
                     <h3>Personal Details</h3>
                     <p className="section-desc-premium">Your public profile name and bio will help guests get to know you before they book.</p>
                     
                     {loadingProfile ? (
                        <div className="loading-profile-state">Fetching your details...</div>
                     ) : (
                        <div className="profile-edit-form-premium">
                           <div className="form-row-premium">
                              <div className="form-group-premium">
                                 <label>Legal Name</label>
                                 <input 
                                   type="text" 
                                   name="name" 
                                   value={profile.name} 
                                   onChange={handleProfileUpdate} 
                                   placeholder="Your display name"
                                 />
                              </div>
                              <div className="form-group-premium">
                                 <label>Email Address</label>
                                 <input 
                                   type="email" 
                                   value={profile.email} 
                                   disabled 
                                   className="input-disabled-premium"
                                   title="Email cannot be changed"
                                 />
                                 <span className="input-hint-premium">Used for platform notifications</span>
                              </div>
                           </div>



                           <div className="form-row-premium">
                              <div className="form-group-premium">
                                 <label>Phone Number</label>
                                 <input 
                                   type="tel" 
                                   name="phone" 
                                   value={profile.phone} 
                                   onChange={handleProfileUpdate} 
                                   placeholder="e.g. +91 98765 43210"
                                 />
                              </div>
                              <div className="form-group-premium">
                                 <label>Host Since</label>
                                 <input 
                                   type="text" 
                                   value={new Date(user?.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })} 
                                   disabled 
                                   className="input-disabled-premium"
                                 />
                              </div>
                           </div>

                           <div className="form-actions-premium">
                              <button 
                                className="btn-save-profile-premium" 
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                              >
                                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                              </button>
                           </div>
                        </div>
                     )}
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
      



    </div>
  );
};

export default HostDashboard;
