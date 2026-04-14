const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
  password: { type: String },
  avatar: { type: String, default: null },
  bio: { type: String, default: '' },
  governmentId: { type: String, default: null },
  isPhoneVerified: { type: Boolean, default: false },
  isIdVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['Guest', 'Host'], default: 'Guest' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  joinDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
