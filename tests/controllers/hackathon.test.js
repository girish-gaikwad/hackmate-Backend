const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Hackathon = require('../../src/models/Hackathon');
const { generateAccessToken } = require('../../src/utils/generateToken');

describe('Hackathon Controller', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'user@university.edu',
      password: 'Password123!',
      college: 'Test University',
      graduationYear: 2025,
      isVerified: true
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@university.edu',
      password: 'Password123!',
      college: 'Test University',
      graduationYear: 2025,
      isVerified: true,
      role: 'admin'
    });

    userToken = generateAccessToken(testUser._id);
    adminToken = generateAccessToken(adminUser._id);
  });

  describe('GET /api/v1/hackathons', () => {
    beforeEach(async () => {
      await Hackathon.create([
        {
          name: 'Hackathon 1',
          description: 'First hackathon',
          organizer: 'Org 1',
          website: 'https://hack1.com',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          mode: 'online',
          source: 'manual'
        },
        {
          name: 'Hackathon 2',
          description: 'Second hackathon',
          organizer: 'Org 2',
          website: 'https://hack2.com',
          startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
          registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          mode: 'in-person',
          source: 'devpost'
        }
      ]);
    });

    it('should return all hackathons', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hackathons).toHaveLength(2);
    });

    it('should filter hackathons by mode', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons')
        .query({ mode: 'online' });

      expect(res.status).toBe(200);
      expect(res.body.data.hackathons).toHaveLength(1);
      expect(res.body.data.hackathons[0].mode).toBe('online');
    });

    it('should search hackathons by name', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons')
        .query({ search: 'Hackathon 1' });

      expect(res.status).toBe(200);
      expect(res.body.data.hackathons).toHaveLength(1);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons')
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.hackathons).toHaveLength(1);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('POST /api/v1/hackathons', () => {
    const validHackathon = {
      name: 'New Hackathon',
      description: 'A great hackathon',
      organizer: 'Test Org',
      website: 'https://newhack.com',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
      registrationDeadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      mode: 'hybrid',
      themes: ['AI', 'Web3'],
      prizePool: { amount: 10000, currency: 'USD' }
    };

    it('should create hackathon as admin', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validHackathon);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(validHackathon.name);
    });

    it('should fail to create hackathon as regular user', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validHackathon);

      expect(res.status).toBe(403);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/hackathons')
        .send(validHackathon);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/hackathons/:id', () => {
    let hackathon;

    beforeEach(async () => {
      hackathon = await Hackathon.create({
        name: 'Test Hackathon',
        description: 'Test description',
        organizer: 'Test Org',
        website: 'https://test.com',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        mode: 'online',
        source: 'manual'
      });
    });

    it('should return hackathon by id', async () => {
      const res = await request(app)
        .get(`/api/v1/hackathons/${hackathon._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(hackathon.name);
    });

    it('should return 404 for non-existent hackathon', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/hackathons/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid id format', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/invalid-id');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/hackathons/upcoming', () => {
    beforeEach(async () => {
      const now = Date.now();
      
      await Hackathon.create([
        {
          name: 'Upcoming Hackathon',
          description: 'Future event',
          organizer: 'Org',
          website: 'https://upcoming.com',
          startDate: new Date(now + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(now + 9 * 24 * 60 * 60 * 1000),
          registrationDeadline: new Date(now + 5 * 24 * 60 * 60 * 1000),
          mode: 'online',
          source: 'manual'
        },
        {
          name: 'Past Hackathon',
          description: 'Past event',
          organizer: 'Org',
          website: 'https://past.com',
          startDate: new Date(now - 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(now - 12 * 24 * 60 * 60 * 1000),
          registrationDeadline: new Date(now - 16 * 24 * 60 * 60 * 1000),
          mode: 'online',
          source: 'manual'
        }
      ]);
    });

    it('should return only upcoming hackathons', async () => {
      const res = await request(app)
        .get('/api/v1/hackathons/upcoming');

      expect(res.status).toBe(200);
      expect(res.body.data.hackathons).toHaveLength(1);
      expect(res.body.data.hackathons[0].name).toBe('Upcoming Hackathon');
    });
  });

  describe('POST /api/v1/hackathons/:id/bookmark', () => {
    let hackathon;

    beforeEach(async () => {
      hackathon = await Hackathon.create({
        name: 'Bookmarkable Hackathon',
        description: 'Test description',
        organizer: 'Test Org',
        website: 'https://bookmark.com',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        mode: 'online',
        source: 'manual'
      });
    });

    it('should toggle bookmark on hackathon', async () => {
      // Add bookmark
      let res = await request(app)
        .post(`/api/v1/hackathons/${hackathon._id}/bookmark`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isBookmarked).toBe(true);

      // Remove bookmark
      res = await request(app)
        .post(`/api/v1/hackathons/${hackathon._id}/bookmark`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isBookmarked).toBe(false);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post(`/api/v1/hackathons/${hackathon._id}/bookmark`);

      expect(res.status).toBe(401);
    });
  });
});
