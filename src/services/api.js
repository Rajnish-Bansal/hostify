const API_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('hostify_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const sendOtp = async (phone) => {
  const response = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
  return data;
};

export const verifyOtp = async (phone, code) => {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'OTP verification failed');
  return data;
};

export const googleLogin = async (userData) => {
  const response = await fetch(`${API_URL}/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Google login failed');
  return data;
};

export const fetchListings = async () => {
  const response = await fetch(`${API_URL}/listings`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch listings');
  return response.json();
};

export const fetchListingById = async (id) => {
  const response = await fetch(`${API_URL}/listings/${id}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch listing');
  return response.json();
};

export const fetchMyListings = async () => {
  const response = await fetch(`${API_URL}/listings/mine`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch your listings');
  return response.json();
};

export const searchListings = async (params) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/search?${query}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('hostify_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: headers, // Don't set Content-Type, browser handles it for FormData
    body: formData
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Upload failed');
  return data;
};

export const fetchPayoutStats = async () => {
  const response = await fetch(`${API_URL}/host/payouts`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch payout stats');
  return response.json();
};

export const fetchHostAnalytics = async () => {
  const response = await fetch(`${API_URL}/host/analytics`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};

export const fetchUserProfile = async () => {
  const response = await fetch(`${API_URL}/users/profile`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
};

export const updateUserProfile = async (profileData) => {
  const response = await fetch(`${API_URL}/users/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update profile');
  }
  return response.json();
};

// --- Messaging & Conversations ---
export const fetchConversations = async () => {
    const response = await fetch(`${API_URL}/conversations`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
};

export const fetchMessages = async (conversationId) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
};

export const sendMessage = async (conversationId, text, senderId) => {
    const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text, senderId })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
};

export const startConversation = async (participantId, listingId) => {
    const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ participantId, listingId })
    });
    if (!response.ok) throw new Error('Failed to start conversation');
    return response.json();
};

export const updateListingPricing = async (listingId, pricingData) => {
    const response = await fetch(`${API_URL}/listings/${listingId}/pricing`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(pricingData)
    });
    if (!response.ok) throw new Error('Failed to update pricing');
    return response.json();
};

// --- Bookings ---
export const createBooking = async (bookingData) => {
  const response = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(bookingData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Booking failed');
  return data;
};

export const fetchMyTrips = async () => {
  const response = await fetch(`${API_URL}/bookings/my-trips`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch trips');
  return response.json();
};

export const fetchHostBookings = async () => {
  const response = await fetch(`${API_URL}/bookings/my-listings`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch host bookings');
  return response.json();
};

export const updateBookingStatus = async (bookingId, status) => {
  const response = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update booking');
  return data;
};

// --- Transactions ---
export const fetchTransactions = async () => {
    const response = await fetch(`${API_URL}/transactions`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch transaction history');
    return response.json();
};

// --- Subscriptions ---
export const fetchPlans = async () => {
  const response = await fetch(`${API_URL}/subscriptions/plans`);
  if (!response.ok) throw new Error('Failed to fetch subscription plans');
  return response.json();
};

export const fetchSubscriptionStatus = async (listingId) => {
  const response = await fetch(`${API_URL}/subscriptions/current/${listingId}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch subscription status');
  return response.json();
};

export const subscribeToPlan = async (planId, listingId) => {
  const response = await fetch(`${API_URL}/subscriptions/subscribe`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ planId, listingId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Subscription failed');
  return data;
};


