const request = require('supertest');
const app = require('../src/app');

describe('Admin User API Tests', () => {
  let adminToken;
  let adminUserId;

  beforeAll(async () => {
    // Login as admin to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@gmail.com',
        password: 'Admin123!'
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    
    adminToken = loginResponse.body.data.token;
    adminUserId = loginResponse.body.data.user.id;
  });

  describe('GET /api/admin/users/statistics', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.overview).toBeDefined();
      expect(response.body.data.statistics.roleDistribution).toBeDefined();
      expect(response.body.data.statistics.departmentDistribution).toBeDefined();

      // Check overview structure
      const overview = response.body.data.statistics.overview;
      expect(overview.totalUsers).toBeGreaterThan(0);
      expect(overview.activeUsers).toBeGreaterThanOrEqual(0);
      expect(overview.disabledUsers).toBeGreaterThanOrEqual(0);
      expect(overview.deletedUsers).toBeGreaterThanOrEqual(0);

      // Total should equal sum of active + disabled + deleted
      expect(overview.totalUsers).toBe(overview.activeUsers + overview.disabledUsers);
    });

    it('should require admin authorization', async () => {
      const response = await request(app)
        .get('/api/admin/users/statistics');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated users list', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);

      // Check pagination structure
      const pagination = response.body.data.pagination;
      expect(pagination.currentPage).toBe(1);
      expect(pagination.totalUsers).toBeGreaterThan(0);
      expect(pagination.totalPages).toBeGreaterThan(0);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const users = response.body.data.users;
      users.forEach(user => {
        expect(user.role.name).toBe('admin');
      });
    });

    it('should search users by name or email', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const users = response.body.data.users;
      expect(users.length).toBeGreaterThan(0);
      
      // At least one user should match the search term
      const hasMatch = users.some(user => 
        user.fullname.toLowerCase().includes('admin') || 
        user.email.toLowerCase().includes('admin')
      );
      expect(hasMatch).toBe(true);
    });

    it('should include admin user in results', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const users = response.body.data.users;
      const adminUser = users.find(user => user.email === 'admin@gmail.com');
      
      expect(adminUser).toBeDefined();
      expect(adminUser.fullname).toBe('Admin');
      expect(adminUser.isdeleted).toBe(false);
      expect(adminUser.role.name).toBe('admin');
    });

    it('should return correct count of disabled users', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      const users = response.body.data.users;
      const disabledUsers = users.filter(user => user.isdisable && !user.isdeleted);
      
      // Get statistics to compare
      const statsResponse = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const statsDisabledCount = statsResponse.body.data.statistics.overview.disabledUsers;
      
      expect(disabledUsers.length).toBe(statsDisabledCount);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should have consistent user counts between list and statistics', async () => {
      // Get all users
      const usersResponse = await request(app)
        .get('/api/admin/users?page=1&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      // Get statistics
      const statsResponse = await request(app)
        .get('/api/admin/users/statistics')
        .set('Authorization', `Bearer ${adminToken}`);

      const users = usersResponse.body.data.users;
      const stats = statsResponse.body.data.statistics.overview;

      // Count users by status
      const activeUsers = users.filter(user => !user.isdisable && !user.isdeleted);
      const disabledUsers = users.filter(user => user.isdisable && !user.isdeleted);
      const deletedUsers = users.filter(user => user.isdeleted);

      // Compare with statistics
      expect(users.length).toBe(stats.totalUsers);
      expect(activeUsers.length).toBe(stats.activeUsers);
      expect(disabledUsers.length).toBe(stats.disabledUsers);
      expect(deletedUsers.length).toBe(stats.deletedUsers);
    });
  });
});
