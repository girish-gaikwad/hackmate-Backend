const Team = require("../models/Team");
const TeamJoinRequest = require("../models/TeamJoinRequest");
const User = require("../models/User");

function normalizeCollege(value) {
	return (value || "").trim().toLowerCase();
}

class TeamController {
	static async createTeam(req, res) {
		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		if (!user.clg?.trim()) {
			return res.status(400).json({
				success: false,
				message: "Complete your profile college before creating a team",
			});
		}

		const payload = req.body;
		const team = await Team.create({
			name: payload.name,
			description: payload.description || "",
			requirements: payload.requirements || "",
			maxMembers: payload.maxMembers || 4,
			tags: payload.tags || [],
			openForRequests:
				payload.openForRequests === undefined ? true : payload.openForRequests,
			college: user.clg,
			hackathon: {
				source: payload.hackathon.source,
				hackathonId: payload.hackathon.hackathonId,
				title: payload.hackathon.title,
				url: payload.hackathon.url || null,
				deadlineText: payload.hackathon.deadlineText || null,
			},
			leader: user._id,
			members: [user._id],
		});

		return res.status(201).json({
			success: true,
			message: "Team created successfully",
			data: team,
		});
	}

	static async discoverTeams(req, res) {
		const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
		const limit = Math.min(
			Math.max(Number.parseInt(req.query.limit || "10", 10), 1),
			50
		);
		const skip = (page - 1) * limit;

		const hackathonId = req.query.hackathonId;
		const source = req.query.source;

		if (!hackathonId || !source) {
			return res.status(400).json({
				success: false,
				message: "hackathonId and source are required",
			});
		}

		const user = await User.findById(req.user.userId);
		if (!user) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		const teamsQuery = {
			"hackathon.hackathonId": hackathonId,
			"hackathon.source": source,
			openForRequests: true,
			college: new RegExp(`^${normalizeCollege(user.clg)}$`, "i"),
		};

		const [teams, total] = await Promise.all([
			Team.find(teamsQuery)
				.populate("leader", "name username profilePicture clg year level")
				.populate("members", "name username profilePicture")
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit),
			Team.countDocuments(teamsQuery),
		]);

		return res.status(200).json({
			success: true,
			message: "Teams fetched successfully",
			data: {
				items: teams,
				page,
				limit,
				total,
				hasNextPage: skip + teams.length < total,
			},
		});
	}

	static async getTeamById(req, res) {
		const team = await Team.findById(req.params.teamId)
			.populate("leader", "name username profilePicture clg year level")
			.populate("members", "name username profilePicture level skills");

		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		return res.status(200).json({
			success: true,
			message: "Team fetched successfully",
			data: team,
		});
	}

	static async updateTeam(req, res) {
		const team = await Team.findById(req.params.teamId);
		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		if (team.leader.toString() !== req.user.userId) {
			return res.status(403).json({ success: false, message: "Only leader can update team" });
		}

		const allowedFields = [
			"name",
			"description",
			"requirements",
			"maxMembers",
			"tags",
			"openForRequests",
		];

		allowedFields.forEach((field) => {
			if (req.body[field] !== undefined) {
				team[field] = req.body[field];
			}
		});

		if (team.maxMembers < team.members.length) {
			return res.status(400).json({
				success: false,
				message: "maxMembers cannot be less than current team size",
			});
		}

		await team.save();

		return res.status(200).json({
			success: true,
			message: "Team updated successfully",
			data: team,
		});
	}

	static async requestToJoinTeam(req, res) {
		const team = await Team.findById(req.params.teamId);
		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		const requester = await User.findById(req.user.userId);
		if (!requester) {
			return res.status(404).json({ success: false, message: "User not found" });
		}

		if (!team.openForRequests) {
			return res.status(400).json({ success: false, message: "Team is not accepting requests" });
		}

		if (team.leader.toString() === requester._id.toString()) {
			return res.status(400).json({ success: false, message: "Leader is already in the team" });
		}

		if (team.members.some((member) => member.toString() === requester._id.toString())) {
			return res.status(400).json({ success: false, message: "User already in team" });
		}

		if (normalizeCollege(team.college) !== normalizeCollege(requester.clg)) {
			return res.status(400).json({
				success: false,
				message: "You can request only teams from your college",
			});
		}

		const pendingRequest = await TeamJoinRequest.findOne({
			team: team._id,
			requester: requester._id,
			status: "pending",
		});

		if (pendingRequest) {
			return res.status(409).json({
				success: false,
				message: "You already have a pending request for this team",
			});
		}

		const request = await TeamJoinRequest.create({
			team: team._id,
			requester: requester._id,
			message: req.body.message || "",
		});

		return res.status(201).json({
			success: true,
			message: "Join request sent successfully",
			data: request,
		});
	}

	static async getTeamRequests(req, res) {
		const team = await Team.findById(req.params.teamId);
		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		if (team.leader.toString() !== req.user.userId) {
			return res.status(403).json({ success: false, message: "Only leader can view requests" });
		}

		const status = req.query.status || "pending";

		const requests = await TeamJoinRequest.find({ team: team._id, status })
			.populate(
				"requester",
				"name username email profilePicture clg year level skills previousProjects"
			)
			.sort({ createdAt: -1 });

		return res.status(200).json({
			success: true,
			message: "Team requests fetched successfully",
			data: {
				teamId: team._id,
				status,
				requests,
			},
		});
	}

	static async respondToJoinRequest(req, res) {
		const joinRequest = await TeamJoinRequest.findById(req.params.requestId).populate("team");

		if (!joinRequest) {
			return res.status(404).json({ success: false, message: "Request not found" });
		}

		const team = joinRequest.team;
		if (team.leader.toString() !== req.user.userId) {
			return res.status(403).json({ success: false, message: "Only leader can respond" });
		}

		if (joinRequest.status !== "pending") {
			return res.status(400).json({ success: false, message: "Request already handled" });
		}

		const action = req.body.action;
		if (action === "accept") {
			if (team.members.length >= team.maxMembers) {
				return res.status(400).json({ success: false, message: "Team is full" });
			}

			const alreadyMember = team.members.some(
				(member) => member.toString() === joinRequest.requester.toString()
			);

			if (!alreadyMember) {
				team.members.push(joinRequest.requester);
				await team.save();
			}

			joinRequest.status = "accepted";
		} else {
			joinRequest.status = "rejected";
		}

		joinRequest.respondedBy = req.user.userId;
		joinRequest.respondedAt = new Date();
		await joinRequest.save();

		return res.status(200).json({
			success: true,
			message: `Request ${joinRequest.status}`,
			data: joinRequest,
		});
	}

	static async removeMember(req, res) {
		const team = await Team.findById(req.params.teamId);
		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		if (team.leader.toString() !== req.user.userId) {
			return res.status(403).json({ success: false, message: "Only leader can remove members" });
		}

		const memberId = req.params.memberId;

		if (team.leader.toString() === memberId) {
			return res.status(400).json({ success: false, message: "Leader cannot be removed" });
		}

		const memberExists = team.members.some((member) => member.toString() === memberId);
		if (!memberExists) {
			return res.status(404).json({ success: false, message: "Member not found in team" });
		}

		team.members = team.members.filter((member) => member.toString() !== memberId);
		await team.save();

		return res.status(200).json({
			success: true,
			message: "Member removed successfully",
			data: team,
		});
	}

	static async deleteTeam(req, res) {
		const team = await Team.findById(req.params.teamId);
		if (!team) {
			return res.status(404).json({ success: false, message: "Team not found" });
		}

		if (team.leader.toString() !== req.user.userId) {
			return res.status(403).json({ success: false, message: "Only leader can delete team" });
		}

		await Promise.all([
			TeamJoinRequest.deleteMany({ team: team._id }),
			Team.deleteOne({ _id: team._id }),
		]);

		return res.status(200).json({
			success: true,
			message: "Team deleted successfully",
			data: { teamId: team._id },
		});
	}
}

module.exports = TeamController;
