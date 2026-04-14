require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Listing = require('./models/Listing');
const User = require('./models/User');
const Booking = require('./models/Booking');

const app = express();
const PORT = process.env.PORT || 5000;
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const bookingRoutes = require('./routes/bookings');
const { syncAllCalendars } = require('./services/syncService');
const payoutRoutes = require('./routes/payouts');
const analyticsRoutes = require('./routes/analytics');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const subscriptionRoutes = require('./routes/subscriptions');

const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/host/payouts', payoutRoutes);
app.use('/api/host/analytics', analyticsRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

const { scrapeAirbnb } = require('./services/scraper');

// 1. Listings
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching listings', error: err.message });
  }
});

app.post('/api/listings/import-airbnb', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'URL is required' });

  try {
    console.log(`[API] Starting import for: ${url}`);
    const data = await scrapeAirbnb(url);
    res.json(data);
  } catch (err) {
    console.error('[API] Import failed:', err.message);
    res.status(500).json({ message: 'Failed to import listing', error: err.message });
  }
});

app.post('/api/listings/sync', async (req, res) => {
  try {
    await syncAllCalendars();
    res.json({ message: 'Synchronization triggered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Sync failed', error: err.message });
  }
});

const { authenticateToken } = require('./middleware/auth');

app.get('/api/listings/mine', authenticateToken, async (req, res) => {
  try {
    const listings = await Listing.find({ hostId: req.user.id }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching your listings', error: err.message });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching listing', error: err.message });
  }
});

app.put('/api/listings/:id/pricing', async (req, res) => {
  const { price, weekendPrice, discounts } = req.body;
  try {
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { price, weekendPrice, discounts },
      { new: true }
    );
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Error updating pricing', error: err.message });
  }
});

app.put('/api/listings/:id/price-overrides', authenticateToken, async (req, res) => {
  const { startDate, endDate, price } = req.body;
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    
    // Security: Check if user owns listing
    if (!listing.hostId || listing.hostId.toString() !== req.user.id) {
      console.warn(`[Backend] Unauthorized price-override attempt by user ${req.user.id} on listing ${req.params.id}`);
      return res.status(403).json({ message: 'Unauthorized to modify this listing' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 1. Remove existing overrides within this range
    listing.priceOverrides = listing.priceOverrides.filter(ov => {
      const d = new Date(ov.date);
      return d < start || d > end;
    });

    // 2. Add new overrides for each day in range
    let current = new Date(start);
    while (current <= end) {
      listing.priceOverrides.push({
        date: new Date(current),
        price: Number(price)
      });
      current.setDate(current.getDate() + 1);
    }

    await listing.save();
    res.json(listing);
  } catch (err) {
    console.error(`[Backend] Price-override failed:`, err);
    res.status(500).json({ message: 'Error updating price overrides', error: err.message });
  }
});

app.put('/api/listings/:id/blocked-dates', authenticateToken, async (req, res) => {
  const { dates } = req.body; // Array of ISO strings
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (!listing.hostId || listing.hostId.toString() !== req.user.id) {
       console.warn(`[Backend] Unauthorized block-dates attempt by user ${req.user.id} on listing ${req.params.id}`);
       return res.status(403).json({ message: 'Unauthorized' });
    }

    // Toggle logic: If the date is already blocked, UNBLOCK it. If not, BLOCK it.
    if (!Array.isArray(dates)) return res.status(400).json({ message: 'Dates must be an array' });

    const newDates = dates.map(d => {
      const date = new Date(d);
      date.setHours(0,0,0,0);
      return date;
    });

    // Toggle logic
    newDates.forEach(nd => {
      const ndStr = nd.toISOString();
      const index = listing.blockedDates.findIndex(d => d.toISOString() === ndStr);
      
      if (index > -1) {
        // Already blocked -> UNBLOCK (Remove)
        listing.blockedDates.splice(index, 1);
      } else {
        // Not blocked -> BLOCK (Add)
        listing.blockedDates.push(nd);
      }
    });

    await listing.save();
    res.json(listing);
  } catch (err) {
    console.error(`[Backend] Block-dates failed:`, err);
    res.status(500).json({ message: 'Error blocking dates', error: err.message });
  }
});

// 2. Search & Filter
app.get('/api/search', async (req, res) => {
  const { location, guests, type, lat, lng } = req.query;
  const query = {};
  
  if (location && !lat) query.location = new RegExp(location, 'i');
  if (guests) query.maxGuests = { $gte: parseInt(guests) };
  if (type) query.propertyType = type;

  // Spatial search if coordinates provided
  if (lat && lng) {
    query.location_geo = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: 50000 // 50km radius
      }
    };
  }

  try {
    const listings = await Listing.find(query);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// 3. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

const http = require('http');
const { Server } = require('socket.io');

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// --- Socket.io Events ---
io.on('connection', (socket) => {
  console.log(`[Socket] New client connected: ${socket.id}`);

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`[Socket] User joined conversation: ${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    // legacy socket-based sending - just for real-time if not using API
    console.log('[Socket] send_message received. Broadcasting only.');
    io.to(data.conversationId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected');
  });
});

const path = require('path');

// --- Static File Serving (Production) ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- Catch-all for React Router (Express 5 compatible) ---
app.get('(.*)', (req, res) => {
  // If request is not an API call, serve the index.html from dist
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server + Real-time Messaging running on http://0.0.0.0:${PORT}`);
});
