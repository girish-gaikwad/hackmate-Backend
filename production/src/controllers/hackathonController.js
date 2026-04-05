const HackathonService = require("../services/hackathonService");
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
}

module.exports = HackathonController;
