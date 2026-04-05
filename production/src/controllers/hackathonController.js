const HackathonService = require("../services/hackathonService");
const User = require("../models/User");
const { sendSuccess } = require("../utils/response");

class HackathonController {
  static async getMergedHackathons(req, res, next) {
    try {
      const result = await HackathonService.getMergedHackathons(req.query);
      return sendSuccess(res, result, "Hackathons fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  static async listBookmarkedHackathons(req, res, next) {
    try {
      const user = await User.findById(req.user.userId).select("bookmarkedHackathons");
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const bookmarks = [...(user.bookmarkedHackathons || [])].sort(
        (a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
      );

      return sendSuccess(res, { items: bookmarks }, "Bookmarks fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  static async addBookmark(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const { source, sourceId, title, url, thumbnailUrl, organization } = req.body;
      const alreadyBookmarked = user.bookmarkedHackathons.some(
        (item) => item.source === source && item.sourceId === sourceId
      );

      if (alreadyBookmarked) {
        return res.status(409).json({
          success: false,
          message: "Hackathon already bookmarked",
        });
      }

      user.bookmarkedHackathons.push({
        source,
        sourceId,
        title,
        url: url || "",
        thumbnailUrl: thumbnailUrl || "",
        organization: organization || "",
        bookmarkedAt: new Date(),
      });

      await user.save();

      return sendSuccess(res, { items: user.bookmarkedHackathons }, "Hackathon bookmarked successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  static async removeBookmark(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const { source, sourceId } = req.body;
      const initialCount = user.bookmarkedHackathons.length;

      user.bookmarkedHackathons = user.bookmarkedHackathons.filter(
        (item) => !(item.source === source && item.sourceId === sourceId)
      );

      if (user.bookmarkedHackathons.length === initialCount) {
        return res.status(404).json({
          success: false,
          message: "Bookmark not found",
        });
      }

      await user.save();

      return sendSuccess(res, { items: user.bookmarkedHackathons }, "Bookmark removed successfully");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HackathonController;
