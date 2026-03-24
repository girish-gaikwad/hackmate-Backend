const Hackathon = require('../models/Hackathon');
const TeammateRequest = require('../models/TeammateRequest');
const Resource = require('../models/Resource');
const User = require('../models/User');
const Team = require('../models/Team');
const logger = require('../utils/logger');

/**
 * Search Service - Handles search functionality across the application
 */
class SearchService {
  /**
   * Search hackathons
   * @param {Object} params - Search parameters
   */
  static async searchHackathons({
    query,
    mode,
    status,
    startDate,
    endDate,
    minTeamSize,
    maxTeamSize,
    page = 1,
    limit = 10,
    sortBy = 'startDate',
    sortOrder = 'asc',
  }) {
    const filter = { isActive: true };

    // Text search
    if (query) {
      filter.$text = { $search: query };
    }

    // Mode filter
    if (mode) {
      filter.mode = mode;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }

    // Team size filter
    if (minTeamSize) {
      filter['teamSize.min'] = { $lte: minTeamSize };
    }
    if (maxTeamSize) {
      filter['teamSize.max'] = { $gte: maxTeamSize };
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Add text score for relevance sorting if text search is used
    if (query) {
      sortOptions.score = { $meta: 'textScore' };
    }

    const [hackathons, total] = await Promise.all([
      Hackathon.find(filter)
        .select(query ? { score: { $meta: 'textScore' } } : {})
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Hackathon.countDocuments(filter),
    ]);

    return {
      hackathons,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Search teammate requests
   * @param {Object} params - Search parameters
   */
  static async searchTeammateRequests({
    query,
    skills,
    hackathon,
    college,
    roleNeeded,
    experienceLevel,
    status = 'open',
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { status };

    // Text search
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Skills filter
    if (skills && skills.length > 0) {
      filter.skillsNeeded = { $in: skills };
    }

    // Hackathon filter
    if (hackathon) {
      filter.hackathon = hackathon;
    }

    // College filter
    if (college) {
      filter.college = college;
    }

    // Role filter
    if (roleNeeded) {
      filter.rolesNeeded = roleNeeded;
    }

    // Experience level filter
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [requests, total] = await Promise.all([
      TeammateRequest.find(filter)
        .populate('author', 'firstName lastName profilePicture college skills')
        .populate('hackathon', 'name startDate endDate')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      TeammateRequest.countDocuments(filter),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Search resources
   * @param {Object} params - Search parameters
   */
  static async searchResources({
    query,
    type,
    category,
    tags,
    difficulty,
    author,
    minVotes,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };

    // Text search
    if (query) {
      filter.$text = { $search: query };
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    // Difficulty filter
    if (difficulty) {
      filter.difficulty = difficulty;
    }

    // Author filter
    if (author) {
      filter.author = author;
    }

    // Minimum votes filter
    if (minVotes) {
      filter.voteCount = { $gte: minVotes };
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    
    if (sortBy === 'popularity') {
      sortOptions.voteCount = -1;
      sortOptions.viewCount = -1;
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('author', 'firstName lastName profilePicture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Resource.countDocuments(filter),
    ]);

    return {
      resources,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Search users
   * @param {Object} params - Search parameters
   */
  static async searchUsers({
    query,
    skills,
    college,
    lookingForTeam,
    experienceLevel,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };

    // Text search (name, bio)
    if (query) {
      filter.$or = [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } },
        { college: { $regex: query, $options: 'i' } },
      ];
    }

    // Skills filter
    if (skills && skills.length > 0) {
      filter.skills = { $in: skills };
    }

    // College filter
    if (college) {
      filter.college = college;
    }

    // Looking for team filter
    if (typeof lookingForTeam === 'boolean') {
      filter.lookingForTeam = lookingForTeam;
    }

    // Experience level filter
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('firstName lastName profilePicture college skills bio experienceLevel lookingForTeam')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Search teams
   * @param {Object} params - Search parameters
   */
  static async searchTeams({
    query,
    hackathon,
    lookingForMembers,
    skills,
    maxSize,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const filter = { isActive: true };

    // Text search
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Hackathon filter
    if (hackathon) {
      filter.hackathon = hackathon;
    }

    // Looking for members filter
    if (typeof lookingForMembers === 'boolean') {
      filter.lookingForMembers = lookingForMembers;
    }

    // Skills filter
    if (skills && skills.length > 0) {
      filter.skillsNeeded = { $in: skills };
    }

    // Max size filter (teams that have space)
    if (maxSize) {
      filter.$expr = { $lt: [{ $size: '$members' }, maxSize] };
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate('leader', 'firstName lastName profilePicture')
        .populate('hackathon', 'name startDate endDate')
        .populate('members.user', 'firstName lastName profilePicture')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Team.countDocuments(filter),
    ]);

    return {
      teams,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Global search across all entities
   * @param {string} query - Search query
   * @param {Object} options - Search options
   */
  static async globalSearch(query, { limit = 5 } = {}) {
    if (!query || query.trim().length < 2) {
      return {
        hackathons: [],
        requests: [],
        resources: [],
        users: [],
        teams: [],
      };
    }

    const [hackathons, requests, resources, users, teams] = await Promise.all([
      this.searchHackathons({ query, limit }),
      this.searchTeammateRequests({ query, limit }),
      this.searchResources({ query, limit }),
      this.searchUsers({ query, limit }),
      this.searchTeams({ query, limit }),
    ]);

    return {
      hackathons: hackathons.hackathons,
      requests: requests.requests,
      resources: resources.resources,
      users: users.users,
      teams: teams.teams,
    };
  }

  /**
   * Get search suggestions (autocomplete)
   * @param {string} query - Partial search query
   * @param {string} type - Entity type to search
   */
  static async getSearchSuggestions(query, type = 'all') {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const regex = new RegExp(`^${query}`, 'i');
    const suggestions = [];

    if (type === 'all' || type === 'hackathons') {
      const hackathons = await Hackathon.find({ name: regex, isActive: true })
        .select('name')
        .limit(5)
        .lean();
      suggestions.push(...hackathons.map((h) => ({ type: 'hackathon', value: h.name, id: h._id })));
    }

    if (type === 'all' || type === 'skills') {
      // Get unique skills from users
      const skillSuggestions = await User.aggregate([
        { $unwind: '$skills' },
        { $match: { skills: regex } },
        { $group: { _id: '$skills' } },
        { $limit: 10 },
      ]);
      suggestions.push(...skillSuggestions.map((s) => ({ type: 'skill', value: s._id })));
    }

    if (type === 'all' || type === 'colleges') {
      // Get unique colleges
      const collegeSuggestions = await User.aggregate([
        { $match: { college: regex } },
        { $group: { _id: '$college' } },
        { $limit: 10 },
      ]);
      suggestions.push(...collegeSuggestions.map((c) => ({ type: 'college', value: c._id })));
    }

    if (type === 'all' || type === 'tags') {
      // Get unique tags from resources
      const tagSuggestions = await Resource.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: regex } },
        { $group: { _id: '$tags' } },
        { $limit: 10 },
      ]);
      suggestions.push(...tagSuggestions.map((t) => ({ type: 'tag', value: t._id })));
    }

    return suggestions;
  }
}

module.exports = SearchService;
