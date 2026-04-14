/**
 * assign-listings.js
 * One-time script: find user by email and assign all DB listings to them.
 * Run with: node server/assign-listings.js
 */
require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Listing = require('./models/Listing');

const TARGET_EMAIL = 'rajnishbansal0906@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the target user
    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
      console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
      console.log('   Make sure they have logged in at least once to create their account.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name || user.email} (ID: ${user._id})`);

    // Promote the user to Host if not already
    if (user.role !== 'Host') {
      await User.findByIdAndUpdate(user._id, { role: 'Host' });
      console.log('✅ Promoted user to Host role');
    }

    // Update all listings to assign them to this user
    const result = await Listing.updateMany(
      {}, // Match all listings
      {
        $set: {
          hostId: user._id,
          'host.name': user.name || 'Rajnish',
          'host.image': user.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop'
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} listings → assigned to ${TARGET_EMAIL}`);

    // Verify
    const sample = await Listing.findOne({ hostId: user._id });
    if (sample) {
      console.log(`\n📋 Sample listing:`);
      console.log(`   Title:    ${sample.description?.split(' - ')[0] || 'N/A'}`);
      console.log(`   Location: ${sample.location}`);
      console.log(`   HostId:   ${sample.hostId}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

run();
