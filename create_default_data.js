// Script to create default roles and admin user
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Simple schemas for this script
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [String]
});

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  password: { type: String, required: true },
  avatar: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  department: String,
  position: String,
  point: { type: Number, default: 0 },
  isdisable: { type: Boolean, default: false },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null },
  referenceImageUrl: { type: String, default: null },
  otpCode: String,
  otpExpires: Number,
  isdeleted: { type: Boolean, default: false },
  IdMapper: { type: Number, default: null },
  CodeMapper: { type: String, maxlength: 50, default: null },
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const Role = mongoose.model('Role', roleSchema);
const User = mongoose.model('User', userSchema);

async function createDefaultData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://golden-hr:DNAEiFMFk7E5Bpwc@golden-hr.gld0mul.mongodb.net/hrm_crm?retryWrites=true&w=majority&appName=golden-hr');
    console.log('Connected to MongoDB');

    // Create default roles
    const roles = [
      { name: 'admin', description: 'Administrator with full access' },
      { name: 'manager', description: 'Manager with limited access' },
      { name: 'user', description: 'Regular user' }
    ];

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`⚠️  Role already exists: ${roleData.name}`);
      }
    }

    // Create admin user
    const adminRole = await Role.findOne({ name: 'admin' });
    const userRole = await Role.findOne({ name: 'user' });
    
    const users = [
      {
        email: 'admin@example.com',
        password: 'Admin123!',
        fullname: 'System Administrator',
        role: adminRole._id,
        department: 'IT',
        position: 'System Admin'
      },
      {
        email: 'test@example.com',
        password: 'Test123!',
        fullname: 'Test User',
        role: userRole._id,
        department: 'HR',
        position: 'Employee'
      }
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${userData.email}`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    console.log('🎉 Default data creation completed!');
    console.log('\nYou can now login with:');
    console.log('Admin: admin@example.com / Admin123!');
    console.log('User: test@example.com / Test123!');
    
  } catch (error) {
    console.error('❌ Error creating default data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDefaultData();
