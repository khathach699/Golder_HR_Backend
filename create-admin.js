const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb+srv://golden-hr:DNAEiFMFk7E5Bpwc@golden-hr.gld0mul.mongodb.net/hrm_crm?retryWrites=true&w=majority&appName=golden-hr');
    
    const User = mongoose.model('User', new mongoose.Schema({
      fullname: String,
      email: String,
      password: String,
      role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
      organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      isdisable: { type: Boolean, default: false },
      isdeleted: { type: Boolean, default: false },
      point: { type: Number, default: 0 }
    }));
    
    const Role = mongoose.model('Role', new mongoose.Schema({
      name: String
    }));
    
    // Find admin role
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@test.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists: admin@test.com');
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    // Create admin user
    const adminUser = new User({
      fullname: 'Test Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: adminRole._id,
      organization: new mongoose.Types.ObjectId('685bc1fe5c06d52fdc664b10'),
      isdisable: false,
      isdeleted: false,
      point: 0
    });
    
    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@test.com');
    console.log('Password: Admin123!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();
