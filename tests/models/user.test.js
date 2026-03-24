const User = require('../../src/models/User');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.college).toBe(userData.college);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should fail with missing required fields', async () => {
      const userData = {
        name: 'Test User'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Handling', () => {
    it('should hash password on save', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'hash@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      expect(user.password).not.toBe('Password123!');
      expect(user.password.startsWith('$2')).toBe(true); // bcrypt hash
    });

    it('should compare password correctly', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'compare@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      const isMatch = await user.comparePassword('Password123!');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    it('should not rehash password if not modified', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'nohash@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      const originalHash = user.password;
      
      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('User Methods', () => {
    it('should generate verification token', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'verify@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      const token = user.generateVerificationToken();

      expect(token).toBeDefined();
      expect(user.verificationToken).toBeDefined();
      expect(user.verificationTokenExpires).toBeDefined();
    });

    it('should generate password reset token', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'reset@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      const token = user.generatePasswordResetToken();

      expect(token).toBeDefined();
      expect(user.resetPasswordToken).toBeDefined();
      expect(user.resetPasswordExpires).toBeDefined();
    });
  });

  describe('User Virtuals', () => {
    it('should return full profile URL', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'virtual@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      expect(user.profileUrl).toBeDefined();
      expect(user.profileUrl).toContain(user._id.toString());
    });
  });

  describe('User Indexes', () => {
    it('should be able to find user by email quickly', async () => {
      await User.create({
        name: 'Test User',
        email: 'index@university.edu',
        password: 'Password123!',
        college: 'Test University',
        graduationYear: 2025
      });

      const user = await User.findOne({ email: 'index@university.edu' });
      expect(user).toBeDefined();
    });
  });
});
