const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const TeammateRequest = require('../models/TeammateRequest');
const Team = require('../models/Team');
const Resource = require('../models/Resource');
const logger = require('../utils/logger');

/**
 * Analytics Service - Handles analytics and reporting
 */
class AnalyticsService {
  /**
   * Log an activity
   * @param {Object} data - Activity data
   */
  static async logActivity({
    user,
    action,
    entityType,
    entityId,
    metadata = {},
    ipAddress,
    userAgent,
  }) {
    try {
      const activity = await ActivityLog.create({
        user,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
        userAgent,
      });

      return activity;
    } catch (error) {
      logger.error(`Failed to log activity: ${error.message}`);
      // Don't throw - analytics shouldn't break the main flow
      return null;
    }
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  static async getUserActivity(userId, { page = 1, limit = 20, action } = {}) {
    const filter = { user: userId };
    if (action) {
      filter.action = action;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return {
      activities,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get platform statistics (admin dashboard)
   */
  static async getPlatformStats() {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalHackathons,
      upcomingHackathons,
      ongoingHackathons,
      totalTeammateRequests,
      openTeammateRequests,
      totalTeams,
      totalResources,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isVerified: true }),
      Hackathon.countDocuments(),
      Hackathon.countDocuments({ status: 'upcoming' }),
      Hackathon.countDocuments({ status: 'ongoing' }),
      TeammateRequest.countDocuments(),
      TeammateRequest.countDocuments({ status: 'open' }),
      Team.countDocuments({ isActive: true }),
      Resource.countDocuments({ isActive: true }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
      },
      hackathons: {
        total: totalHackathons,
        upcoming: upcomingHackathons,
        ongoing: ongoingHackathons,
      },
      teammateRequests: {
        total: totalTeammateRequests,
        open: openTeammateRequests,
      },
      teams: {
        total: totalTeams,
      },
      resources: {
        total: totalResources,
      },
    };
  }

  /**
   * Get user growth statistics
   * @param {number} days - Number of days to look back
   */
  static async getUserGrowthStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return dailyRegistrations.map((d) => ({
      date: d._id,
      registrations: d.count,
    }));
  }

  /**
   * Get hackathon engagement statistics
   * @param {string} hackathonId - Hackathon ID
   */
  static async getHackathonEngagement(hackathonId) {
    const [
      bookmarkCount,
      teamRequests,
      teams,
      viewsData,
    ] = await Promise.all([
      // Get bookmark count
      require('../models/Bookmark').countDocuments({
        hackathon: hackathonId,
      }),
      // Get teammate requests for this hackathon
      TeammateRequest.countDocuments({ hackathon: hackathonId }),
      // Get teams for this hackathon
      Team.find({ hackathon: hackathonId }).select('members'),
      // Get view activity
      ActivityLog.countDocuments({
        entityType: 'hackathon',
        entityId: hackathonId,
        action: 'view',
      }),
    ]);

    const totalParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);

    return {
      bookmarks: bookmarkCount,
      teammateRequests: teamRequests,
      teams: teams.length,
      participants: totalParticipants,
      views: viewsData,
    };
  }

  /**
   * Get popular skills statistics
   * @param {number} limit - Number of skills to return
   */
  static async getPopularSkills(limit = 20) {
    const skills = await User.aggregate([
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return skills.map((s) => ({
      skill: s._id,
      count: s.count,
    }));
  }

  /**
   * Get popular colleges statistics
   * @param {number} limit - Number of colleges to return
   */
  static async getPopularColleges(limit = 20) {
    const colleges = await User.aggregate([
      {
        $match: { college: { $ne: null, $ne: '' } },
      },
      {
        $group: {
          _id: '$college',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return colleges.map((c) => ({
      college: c._id,
      count: c.count,
    }));
  }

  /**
   * Get resource statistics by category
   */
  static async getResourceStats() {
    const [byType, byCategory, topRated] = await Promise.all([
      Resource.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalVotes: { $sum: '$voteCount' },
          },
        },
      ]),
      Resource.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
      Resource.find({ isActive: true })
        .sort({ voteCount: -1, viewCount: -1 })
        .limit(10)
        .select('title type category voteCount viewCount')
        .lean(),
    ]);

    return {
      byType,
      byCategory,
      topRated,
    };
  }

  /**
   * Get team formation statistics
   * @param {number} days - Number of days to look back
   */
  static async getTeamFormationStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      teamsFormed,
      requestsCreated,
      requestsFulfilled,
      averageTeamSize,
    ] = await Promise.all([
      Team.countDocuments({ createdAt: { $gte: startDate } }),
      TeammateRequest.countDocuments({ createdAt: { $gte: startDate } }),
      TeammateRequest.countDocuments({
        createdAt: { $gte: startDate },
        status: 'fulfilled',
      }),
      Team.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $project: {
            memberCount: { $size: '$members' },
          },
        },
        {
          $group: {
            _id: null,
            avgSize: { $avg: '$memberCount' },
          },
        },
      ]),
    ]);

    return {
      teamsFormed,
      requestsCreated,
      requestsFulfilled,
      fulfillmentRate: requestsCreated > 0 
        ? ((requestsFulfilled / requestsCreated) * 100).toFixed(2) 
        : 0,
      averageTeamSize: averageTeamSize[0]?.avgSize?.toFixed(2) || 0,
    };
  }

  /**
   * Get activity heatmap data
   * @param {string} userId - Optional user ID
   * @param {number} days - Number of days to look back
   */
  static async getActivityHeatmap(userId = null, days = 365) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const filter = { createdAt: { $gte: startDate } };
    if (userId) {
      filter.user = userId;
    }

    const activities = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    return activities.reduce((map, item) => {
      map[item._id] = item.count;
      return map;
    }, {});
  }

  /**
   * Get user engagement score
   * @param {string} userId - User ID
   */
  static async getUserEngagementScore(userId) {
    const weights = {
      login: 1,
      view: 1,
      create: 5,
      update: 3,
      bookmark: 2,
      message: 2,
      join_team: 10,
      create_team: 15,
      resource_share: 8,
      resource_vote: 2,
    };

    const activities = await ActivityLog.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    let score = 0;
    activities.forEach((activity) => {
      const weight = weights[activity._id] || 1;
      score += activity.count * weight;
    });

    return {
      score,
      breakdown: activities.map((a) => ({
        action: a._id,
        count: a.count,
        points: a.count * (weights[a._id] || 1),
      })),
    };
  }
}

module.exports = AnalyticsService;
