const mongoose = require('mongoose');
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

async function checkUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://golden-hr:DNAEiFMFk7E5Bpwc@golden-hr.gld0mul.mongodb.net/hrm_crm?retryWrites=true&w=majority&appName=golden-hr');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('email fullname role isActive isdeleted isdisable').limit(10);
    
    console.log('\n📋 Users in database:');
    console.log('='.repeat(60));
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.fullname}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Deleted: ${user.isdeleted}`);
        console.log(`   Disabled: ${user.isdisable}`);
        console.log(`   ID: ${user._id}`);
        console.log('-'.repeat(40));
      });
    }

    // Check specifically for test user
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (testUser) {
      console.log('\n🔍 Test user details:');
      console.log('Email:', testUser.email);
      console.log('Name:', testUser.fullname);
      console.log('Role:', testUser.role);
      console.log('Active:', testUser.isActive);
      console.log('Deleted:', testUser.isdeleted);
      console.log('Disabled:', testUser.isdisable);
      console.log('Has password:', !!testUser.password);
      console.log('Password length:', testUser.password?.length);
    } else {
      console.log('\n❌ Test user not found');
    }

  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the function
checkUsers();
