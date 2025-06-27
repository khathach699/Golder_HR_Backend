const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// User schema (simplified)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullname: { type: String, required: true },
  role: { type: String, default: 'employee' },
  isActive: { type: Boolean, default: true },
  isdeleted: { type: Boolean, default: false },
  isdisable: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://golden-hr:DNAEiFMFk7E5Bpwc@golden-hr.gld0mul.mongodb.net/hrm_crm?retryWrites=true&w=majority&appName=golden-hr');
    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      console.log('User ID:', existingUser._id);

      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash('password123', 12);
      existingUser.password = hashedPassword;
      await existingUser.save();
      console.log('Password updated for test user');

      return existingUser;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const testUser = new User({
      email: 'test@example.com',
      password: hashedPassword,
      fullname: 'Test User',
      role: 'admin', // Make admin to test all features
      isActive: true,
      isdeleted: false,
      isdisable: false,
    });

    await testUser.save();
    console.log('Test user created successfully:');
    console.log('Email:', testUser.email);
    console.log('Password: password123');
    console.log('Role:', testUser.role);
    console.log('User ID:', testUser._id);

    return testUser;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createTestUser();
