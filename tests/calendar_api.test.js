const request = require('supertest');
const app = require('../dist/app');

describe('Calendar API Tests', () => {
  let authToken;
  let userId;
  let eventId;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    if (loginResponse.status === 200) {
      authToken = loginResponse.body.data.token;
      userId = loginResponse.body.data.user.id;
    }
  });

  describe('POST /api/calendar', () => {
    it('should create a new calendar event', async () => {
      const eventData = {
        title: 'Test Meeting',
        description: 'This is a test meeting',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
        type: 'meeting',
        location: 'Conference Room A',
        isAllDay: false,
        isRecurring: false
      };

      const response = await request(app)
        .post('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event created successfully');
      expect(response.body.data.event).toBeDefined();
      expect(response.body.data.event.title).toBe(eventData.title);
      
      eventId = response.body.data.event._id;
    });

    it('should return 400 for invalid event data', async () => {
      const invalidEventData = {
        title: '', // Empty title
        startTime: 'invalid-date',
        endTime: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEventData);

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const eventData = {
        title: 'Test Meeting',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/calendar')
        .send(eventData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/calendar', () => {
    it('should get calendar events', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Events retrieved successfully');
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should filter events by date range', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/calendar')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.events).toBeDefined();
    });

    it('should filter events by type', async () => {
      const response = await request(app)
        .get('/api/calendar')
        .query({ type: 'meeting' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.events).toBeDefined();
    });
  });

  describe('GET /api/calendar/:id', () => {
    it('should get event by ID', async () => {
      if (!eventId) {
        console.log('Skipping test - no event ID available');
        return;
      }

      const response = await request(app)
        .get(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event retrieved successfully');
      expect(response.body.data._id).toBe(eventId);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/calendar/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/calendar/:id', () => {
    it('should update an event', async () => {
      if (!eventId) {
        console.log('Skipping test - no event ID available');
        return;
      }

      const updateData = {
        title: 'Updated Test Meeting',
        description: 'This meeting has been updated',
        location: 'Conference Room B'
      };

      const response = await request(app)
        .put(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event updated successfully');
      expect(response.body.data.title).toBe(updateData.title);
    });
  });

  describe('GET /api/calendar/summary', () => {
    it('should get calendar summary', async () => {
      const response = await request(app)
        .get('/api/calendar/summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Calendar summary retrieved successfully');
      expect(response.body.data.totalEvents).toBeDefined();
      expect(response.body.data.eventsByType).toBeDefined();
      expect(response.body.data.upcomingEvents).toBeDefined();
      expect(response.body.data.todayEvents).toBeDefined();
    });
  });

  describe('GET /api/calendar/today', () => {
    it('should get today events', async () => {
      const response = await request(app)
        .get('/api/calendar/today')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Today events retrieved successfully');
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });
  });

  describe('GET /api/calendar/upcoming', () => {
    it('should get upcoming events', async () => {
      const response = await request(app)
        .get('/api/calendar/upcoming')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Upcoming events retrieved successfully');
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should limit upcoming events', async () => {
      const response = await request(app)
        .get('/api/calendar/upcoming')
        .query({ limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.events.length).toBeLessThanOrEqual(3);
    });
  });

  describe('POST /api/calendar/conflicts', () => {
    it('should check for event conflicts', async () => {
      const conflictData = {
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/calendar/conflicts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Conflict check completed');
      expect(response.body.data.hasConflicts).toBeDefined();
      expect(response.body.data.conflicts).toBeDefined();
    });
  });

  describe('DELETE /api/calendar/:id', () => {
    it('should delete an event', async () => {
      if (!eventId) {
        console.log('Skipping test - no event ID available');
        return;
      }

      const response = await request(app)
        .delete(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    it('should return 404 when deleting non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/calendar/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
