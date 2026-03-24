const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { generateAccessToken } = require('../../src/utils/generateToken');

describe('Auth Controller', () => {
  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@university.edu',
      password: 'Password123!',
      college: 'Test University',
      graduationYear: 2025,
      skills: ['JavaScript', 'React']
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', validUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      await User.create({
        ...validUser,
        isVerified: true
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const testUser = {
      name: 'Test User',
      email: 'login@university.edu',
      password: 'Password123!',
      college: 'Test University',
      graduationYear: 2025,
      isVerified: true
    };

    beforeEach(async () => {
      await User.create(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@university.edu',
          password: testUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'me@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025,
        isVerified: true
      });
      accessToken = generateAccessToken(testUser._id);
    });

    it('should return current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'forgot@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025,
        isVerified: true
      });
    });

    it('should send reset email for valid user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not reveal if email exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@university.edu' });

      // Should return success to not reveal email existence
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let testUser;
    let accessToken;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'change@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025,
        isVerified: true
      });
      accessToken = generateAccessToken(testUser._id);
    });

    it('should change password with correct current password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'NewPassword456!'
        });

      expect(loginRes.status).toBe(200);
    });

    it('should fail with incorrect current password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
