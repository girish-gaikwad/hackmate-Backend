const { Hackathon } = require('../models');
const logger = require('../utils/logger');

/**
 * Hackathon Sync Service - Syncs hackathons from external platforms
 * Note: This is a simplified implementation. Real implementation would need
 * actual API keys and proper API integration with each platform.
 */
class HackathonSyncService {
  /**
   * Sync all hackathons from configured sources
   */
  static async syncAll() {
    logger.info('Starting hackathon sync...');
    
    const results = {
      devpost: { synced: 0, errors: 0 },
      mlh: { synced: 0, errors: 0 },
      total: { synced: 0, errors: 0 },
    };

    try {
      // Sync from Devpost
      const devpostResult = await this.syncFromDevpost();
      results.devpost = devpostResult;

      // Sync from MLH
      const mlhResult = await this.syncFromMLH();
      results.mlh = mlhResult;

      // Calculate totals
      results.total.synced = results.devpost.synced + results.mlh.synced;
      results.total.errors = results.devpost.errors + results.mlh.errors;

      // Update hackathon statuses
      await Hackathon.updateAllStatuses();

      logger.info(`Hackathon sync completed. Synced: ${results.total.synced}, Errors: ${results.total.errors}`);
    } catch (error) {
      logger.error(`Hackathon sync failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Sync hackathons from Devpost
   * Note: This is a mock implementation. Replace with actual API integration.
   */
  static async syncFromDevpost() {
    const result = { synced: 0, errors: 0 };

    try {
      // Mock data - in production, this would fetch from Devpost API
      const mockHackathons = [
        {
          externalId: 'devpost-1',
          name: 'AI Innovation Challenge 2026',
          description: 'Build innovative AI solutions to solve real-world problems. Join teams from around the world to compete for amazing prizes.',
          platformSource: 'devpost',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-15'),
          registrationDeadline: new Date('2026-02-28'),
          prizePool: 50000,
          themes: ['AI/ML', 'Innovation', 'Social Good'],
          eligibility: 'open-to-all',
          locationType: 'online',
          externalUrl: 'https://devpost.com/hackathons/ai-innovation-2026',
          imageUrl: 'https://via.placeholder.com/400x200',
          organizerName: 'Tech Giants Inc.',
        },
        {
          externalId: 'devpost-2',
          name: 'Green Tech Hackathon',
          description: 'Create sustainable technology solutions for environmental challenges.',
          platformSource: 'devpost',
          startDate: new Date('2026-04-10'),
          endDate: new Date('2026-04-12'),
          registrationDeadline: new Date('2026-04-05'),
          prizePool: 25000,
          themes: ['Sustainability', 'Green Tech', 'Climate'],
          eligibility: 'students-only',
          locationType: 'hybrid',
          location: {
            city: 'San Francisco',
            country: 'USA',
            venue: 'Tech Hub SF',
          },
          externalUrl: 'https://devpost.com/hackathons/greentech-2026',
          imageUrl: 'https://via.placeholder.com/400x200',
          organizerName: 'EcoTech Foundation',
        },
      ];

      for (const hackathonData of mockHackathons) {
        try {
          await this.upsertHackathon(hackathonData);
          result.synced++;
        } catch (error) {
          logger.error(`Failed to sync Devpost hackathon ${hackathonData.externalId}: ${error.message}`);
          result.errors++;
        }
      }
    } catch (error) {
      logger.error(`Devpost sync error: ${error.message}`);
    }

    return result;
  }

  /**
   * Sync hackathons from MLH
   * Note: This is a mock implementation. Replace with actual API integration.
   */
  static async syncFromMLH() {
    const result = { synced: 0, errors: 0 };

    try {
      // Mock data - in production, this would fetch from MLH API
      const mockHackathons = [
        {
          externalId: 'mlh-1',
          name: 'MLH Season 2026 Kickoff',
          description: 'Join the official MLH season opener with hackers from universities worldwide.',
          platformSource: 'mlh',
          startDate: new Date('2026-02-20'),
          endDate: new Date('2026-02-22'),
          registrationDeadline: new Date('2026-02-15'),
          prizePool: 10000,
          themes: ['Web Development', 'Mobile', 'Open Innovation'],
          eligibility: 'students-only',
          locationType: 'in-person',
          location: {
            city: 'Boston',
            country: 'USA',
            venue: 'MIT Campus',
          },
          externalUrl: 'https://mlh.io/seasons/2026/events',
          imageUrl: 'https://via.placeholder.com/400x200',
          organizerName: 'Major League Hacking',
        },
      ];

      for (const hackathonData of mockHackathons) {
        try {
          await this.upsertHackathon(hackathonData);
          result.synced++;
        } catch (error) {
          logger.error(`Failed to sync MLH hackathon ${hackathonData.externalId}: ${error.message}`);
          result.errors++;
        }
      }
    } catch (error) {
      logger.error(`MLH sync error: ${error.message}`);
    }

    return result;
  }

  /**
   * Upsert hackathon (create or update)
   * @param {Object} data - Hackathon data
   */
  static async upsertHackathon(data) {
    const { externalId, ...updateData } = data;

    const hackathon = await Hackathon.findOneAndUpdate(
      { externalId },
      {
        ...updateData,
        externalId,
        lastSynced: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return hackathon;
  }

  /**
   * Sync a single hackathon by external ID
   * @param {string} externalId - External ID of hackathon
   * @param {string} platform - Platform source
   */
  static async syncSingle(externalId, platform) {
    // In production, this would fetch specific hackathon from the platform API
    logger.info(`Syncing single hackathon: ${externalId} from ${platform}`);
    
    // For now, just trigger a full sync
    return this.syncAll();
  }

  /**
   * Get sync status
   */
  static async getSyncStatus() {
    const lastSynced = await Hackathon.findOne()
      .sort({ lastSynced: -1 })
      .select('lastSynced');

    const totalHackathons = await Hackathon.countDocuments();
    const activeHackathons = await Hackathon.countDocuments({ isActive: true });
    const upcomingHackathons = await Hackathon.countDocuments({ status: 'upcoming' });

    return {
      lastSynced: lastSynced?.lastSynced || null,
      totalHackathons,
      activeHackathons,
      upcomingHackathons,
    };
  }
}

module.exports = HackathonSyncService;
