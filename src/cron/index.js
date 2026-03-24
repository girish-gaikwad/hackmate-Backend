const cron = require('node-cron');
const logger = require('../utils/logger');
const { hackathonSyncService, notificationService } = require('../services');
const Hackathon = require('../models/Hackathon');
const Bookmark = require('../models/Bookmark');
const User = require('../models/User');

/**
 * Sync hackathons from external sources (Devpost, MLH)
 * Runs daily at 2:00 AM
 */
const syncHackathonsJob = cron.schedule('0 2 * * *', async () => {
  logger.info('Starting hackathon sync job...');
  
  try {
    // Sync from Devpost
    const devpostResults = await hackathonSyncService.syncDevpostHackathons();
    logger.info(`Devpost sync: ${devpostResults.created} created, ${devpostResults.updated} updated`);

    // Sync from MLH
    const mlhResults = await hackathonSyncService.syncMLHHackathons();
    logger.info(`MLH sync: ${mlhResults.created} created, ${mlhResults.updated} updated`);

    logger.info('Hackathon sync job completed successfully');
  } catch (error) {
    logger.error('Hackathon sync job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Send hackathon deadline reminders
 * Runs every day at 9:00 AM
 */
const hackathonReminderJob = cron.schedule('0 9 * * *', async () => {
  logger.info('Starting hackathon reminder job...');
  
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find hackathons with upcoming deadlines
    const upcomingHackathons = await Hackathon.find({
      'registrationDeadline': {
        $gte: now,
        $lte: sevenDaysFromNow
      },
      isActive: true
    });

    for (const hackathon of upcomingHackathons) {
      const deadline = new Date(hackathon.registrationDeadline);
      let reminderDays = null;

      // Determine reminder period
      if (deadline <= oneDayFromNow) {
        reminderDays = 1;
      } else if (deadline <= threeDaysFromNow) {
        reminderDays = 3;
      } else if (deadline <= sevenDaysFromNow) {
        reminderDays = 7;
      }

      if (reminderDays) {
        // Find bookmarks with matching notification settings
        const bookmarks = await Bookmark.find({
          itemType: 'hackathon',
          item: hackathon._id,
          notifyBefore: { $gte: reminderDays }
        }).populate('user', 'email name notificationSettings');

        for (const bookmark of bookmarks) {
          if (bookmark.user && bookmark.user.notificationSettings?.email?.hackathonReminders !== false) {
            // Create notification
            await notificationService.createHackathonReminderNotification(
              bookmark.user._id,
              hackathon._id,
              reminderDays
            );
            
            logger.info(`Sent ${reminderDays}-day reminder for ${hackathon.name} to ${bookmark.user.email}`);
          }
        }
      }
    }

    logger.info('Hackathon reminder job completed successfully');
  } catch (error) {
    logger.error('Hackathon reminder job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Clean up expired hackathons (mark as inactive)
 * Runs every day at 3:00 AM
 */
const cleanupExpiredHackathonsJob = cron.schedule('0 3 * * *', async () => {
  logger.info('Starting expired hackathon cleanup job...');
  
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Deactivate hackathons that ended more than 30 days ago
    const result = await Hackathon.updateMany(
      {
        endDate: { $lt: thirtyDaysAgo },
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );

    logger.info(`Deactivated ${result.modifiedCount} expired hackathons`);
  } catch (error) {
    logger.error('Expired hackathon cleanup job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Clean up old notifications
 * Runs every Sunday at 4:00 AM
 */
const cleanupOldNotificationsJob = cron.schedule('0 4 * * 0', async () => {
  logger.info('Starting notification cleanup job...');
  
  try {
    const Notification = require('../models/Notification');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete read notifications older than 30 days
    const result = await Notification.deleteMany({
      isRead: true,
      createdAt: { $lt: thirtyDaysAgo }
    });

    logger.info(`Deleted ${result.deletedCount} old notifications`);
  } catch (error) {
    logger.error('Notification cleanup job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Update user activity stats
 * Runs every hour
 */
const updateUserStatsJob = cron.schedule('0 * * * *', async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Mark users as offline if they haven't been active in 5 minutes
    await User.updateMany(
      {
        isOnline: true,
        lastActive: { $lt: fiveMinutesAgo }
      },
      {
        $set: { isOnline: false }
      }
    );
  } catch (error) {
    logger.error('User stats update job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Clean up expired teammate requests
 * Runs daily at 1:00 AM
 */
const cleanupExpiredRequestsJob = cron.schedule('0 1 * * *', async () => {
  logger.info('Starting expired teammate requests cleanup...');
  
  try {
    const TeammateRequest = require('../models/TeammateRequest');
    const now = new Date();

    // Find requests for hackathons that have already started
    const expiredRequests = await TeammateRequest.find({
      status: 'open'
    }).populate('hackathon', 'startDate');

    let closedCount = 0;
    for (const request of expiredRequests) {
      if (request.hackathon && new Date(request.hackathon.startDate) < now) {
        request.status = 'closed';
        await request.save();
        closedCount++;
      }
    }

    logger.info(`Closed ${closedCount} expired teammate requests`);
  } catch (error) {
    logger.error('Expired requests cleanup job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Generate daily analytics snapshot
 * Runs daily at 11:55 PM
 */
const dailyAnalyticsJob = cron.schedule('55 23 * * *', async () => {
  logger.info('Generating daily analytics snapshot...');
  
  try {
    const { analyticsService } = require('../services');
    const stats = await analyticsService.getDailyStats();
    
    // Log daily stats (in production, you might want to store these)
    logger.info('Daily Analytics:', JSON.stringify(stats, null, 2));
  } catch (error) {
    logger.error('Daily analytics job failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

/**
 * Start all cron jobs
 */
const startCronJobs = () => {
  logger.info('Starting cron jobs...');
  
  syncHackathonsJob.start();
  hackathonReminderJob.start();
  cleanupExpiredHackathonsJob.start();
  cleanupOldNotificationsJob.start();
  updateUserStatsJob.start();
  cleanupExpiredRequestsJob.start();
  dailyAnalyticsJob.start();
  
  logger.info('All cron jobs started');
};

/**
 * Stop all cron jobs
 */
const stopCronJobs = () => {
  logger.info('Stopping cron jobs...');
  
  syncHackathonsJob.stop();
  hackathonReminderJob.stop();
  cleanupExpiredHackathonsJob.stop();
  cleanupOldNotificationsJob.stop();
  updateUserStatsJob.stop();
  cleanupExpiredRequestsJob.stop();
  dailyAnalyticsJob.stop();
  
  logger.info('All cron jobs stopped');
};

/**
 * Run a specific job manually
 * @param {string} jobName - Name of the job to run
 */
const runJobManually = async (jobName) => {
  const jobs = {
    'sync-hackathons': async () => {
      const devpost = await hackathonSyncService.syncDevpostHackathons();
      const mlh = await hackathonSyncService.syncMLHHackathons();
      return { devpost, mlh };
    },
    'hackathon-reminders': hackathonReminderJob,
    'cleanup-hackathons': cleanupExpiredHackathonsJob,
    'cleanup-notifications': cleanupOldNotificationsJob,
    'cleanup-requests': cleanupExpiredRequestsJob,
    'daily-analytics': dailyAnalyticsJob
  };

  if (jobs[jobName]) {
    logger.info(`Manually running job: ${jobName}`);
    if (typeof jobs[jobName] === 'function') {
      return await jobs[jobName]();
    }
    // For cron scheduled jobs, emit the task
    jobs[jobName].emit('task');
    return { success: true, message: `Job ${jobName} triggered` };
  }

  throw new Error(`Unknown job: ${jobName}`);
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  runJobManually,
  // Export individual jobs for testing
  jobs: {
    syncHackathonsJob,
    hackathonReminderJob,
    cleanupExpiredHackathonsJob,
    cleanupOldNotificationsJob,
    updateUserStatsJob,
    cleanupExpiredRequestsJob,
    dailyAnalyticsJob
  }
};
