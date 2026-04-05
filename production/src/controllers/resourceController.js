const Resource = require("../models/Resource");

class ResourceController {
  static async createResource(req, res) {
    const resource = await Resource.create({
      title: req.body.title,
      description: req.body.description || "",
      url: req.body.url || "",
      tags: req.body.tags || [],
      createdBy: req.user.userId,
    });

    const populated = await Resource.findById(resource._id).populate(
      "createdBy",
      "name username profilePicture level"
    );

    return res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: populated,
    });
  }

  static async listResources(req, res) {
    const page = Math.max(Number.parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit || "10", 10), 1),
      50
    );
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.tag) {
      query.tags = req.query.tag;
    }

    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Resource.find(query)
        .populate("createdBy", "name username profilePicture level")
        .populate("comments.user", "name username profilePicture level")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Resource.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Resources fetched successfully",
      data: {
        items,
        page,
        limit,
        total,
        hasNextPage: skip + items.length < total,
      },
    });
  }

  static async getResourceById(req, res) {
    const resource = await Resource.findById(req.params.resourceId)
      .populate("createdBy", "name username profilePicture level")
      .populate("comments.user", "name username profilePicture level")
      .populate("likes", "name username profilePicture level");

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Resource fetched successfully",
      data: resource,
    });
  }

  static async updateResource(req, res) {
    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    if (resource.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Only the creator can edit this resource",
      });
    }

    const allowedFields = ["title", "description", "url", "tags"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        resource[field] = req.body[field];
      }
    });

    await resource.save();

    const updated = await Resource.findById(resource._id).populate(
      "createdBy",
      "name username profilePicture level"
    );

    return res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: updated,
    });
  }

  static async toggleLike(req, res) {
    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const userId = req.user.userId;
    const existingLikeIndex = resource.likes.findIndex(
      (likedBy) => likedBy.toString() === userId
    );

    let liked;
    if (existingLikeIndex >= 0) {
      resource.likes.splice(existingLikeIndex, 1);
      liked = false;
    } else {
      resource.likes.push(userId);
      liked = true;
    }

    await resource.save();

    return res.status(200).json({
      success: true,
      message: liked ? "Resource liked" : "Resource unliked",
      data: {
        liked,
        likesCount: resource.likes.length,
      },
    });
  }

  static async addComment(req, res) {
    const resource = await Resource.findById(req.params.resourceId);

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    resource.comments.push({
      user: req.user.userId,
      text: req.body.text,
    });

    await resource.save();

    const updated = await Resource.findById(resource._id)
      .populate("createdBy", "name username profilePicture level")
      .populate("comments.user", "name username profilePicture level");

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: updated,
    });
  }
}

module.exports = ResourceController;
