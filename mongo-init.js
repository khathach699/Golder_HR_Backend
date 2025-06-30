// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the golder_hr database
db = db.getSiblingDB('golder_hr');

// Create a user for the application
db.createUser({
  user: 'golder_hr_user',
  pwd: 'golder_hr_password',
  roles: [
    {
      role: 'readWrite',
      db: 'golder_hr'
    }
  ]
});

// Create some initial collections with indexes for better performance
db.createCollection('users');
db.createCollection('organizations');
db.createCollection('attendances');
db.createCollection('leaves');
db.createCollection('overtimes');
db.createCollection('notifications');

// Create indexes for better query performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "organizationId": 1 });
db.attendances.createIndex({ "userId": 1, "date": -1 });
db.leaves.createIndex({ "userId": 1, "status": 1 });
db.overtimes.createIndex({ "userId": 1, "status": 1 });
db.notifications.createIndex({ "userId": 1, "createdAt": -1 });

print('Database initialized successfully!');
