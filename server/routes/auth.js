const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Otp = require('../models/Otp');

const JWT_SECRET = process.env.JWT_SECRET || 'airbnb_secret_key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @route   POST api/auth/send-otp
// @desc    Generate and send OTP (Mock)
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number is required' });

  try {
    // Mock/Dummy bypass for testing
    let code;
    if (phone === '9999999999') {
      code = '000000';
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Save to OTP collection (upsert)
    await Otp.findOneAndUpdate(
      { phone },
      { code, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // Mock sending SMS
    console.log(`\n--------------------------------\n[SMS MOCK] To: ${phone}\nMessage: Your Hostify verification code is ${code}\n--------------------------------\n`);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST api/auth/verify-otp
// @desc    Verify OTP and return token
router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  
  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone and code are required' });
  }

  try {
    // Check for dummy bypass
    const isDummy = phone === '9999999999' && code === '000000';
    let otpRecord = null;

    if (!isDummy) {
      otpRecord = await Otp.findOne({ phone, code });
      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
      // OTP is valid, delete it
      await Otp.deleteOne({ _id: otpRecord._id });
    } else {
      console.log(`[AUTH] Dummy bypass triggered for ${phone}`);
    }

    // Find or Create User
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({
        phone: phone,
        name: "Test User " + phone.slice(-4),
        role: 'Guest',
        isPhoneVerified: true
      });
      await user.save();
    } else {
      // If user exists, ensure phone is marked as verified
      user.isPhoneVerified = true;
      await user.save();
    }

    // Create JWT
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified
      }
    });

  } catch (err) {
    console.error('Verify OTP Full Error:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
});

// @route   POST api/auth/google-login
// @desc    Login with Google
router.post('/google-login', async (req, res) => {
  const { credential, isAccessToken } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }

  try {
    let googleId, email, name, avatar;

    if (isAccessToken) {
      // Fetch user info using the access token
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${credential}`);
      const payload = await response.json();
      
      if (!response.ok) {
        throw new Error(payload.error_description || 'Failed to fetch user info from Google');
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
    } else {
      // Verify the ID token with Google
      const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (user) {
        // Update user if needed
        user.googleId = googleId;
        user.avatar = avatar || user.avatar;
        user.name = user.name || name;
        await user.save();
    } else {
        user = new User({
            googleId,
            email,
            name,
            avatar,
            role: 'Guest'
        });
        await user.save();
    }

    // Create JWT
    const payloadJWT = { id: user._id, role: user.role };
    const token = jwt.sign(payloadJWT, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Google verification error:', err.message);
    res.status(400).json({ message: 'Invalid Google token' });
  }
});

module.exports = router;
