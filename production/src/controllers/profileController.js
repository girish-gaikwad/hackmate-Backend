const User = require("../models/User");


class ProfileController{

    static async getMyProfile(req, res) {
        try {

            const user = await User.findOne({ email: req.user.email }); // Assuming authMiddleware attaches user to req
            if(!user.isProfileComplete){
                return res.status(200).json({
                    success: true,
                    data: {
                        email: user.email,
                        isProfileComplete: user.isProfileComplete,
                    },
                    message: "Profile is incomplete. Please update your profile.",
                });
            }
            return res.status(200).json({
                success: true,
                data: {
                    email: user.email,
                    name : user.name, 
                    username: user.username,
                    phone: user.phone,
                    level: user.level,
                    profilePicture: user.profilePicture,
                    bio: user.bio,
                    skills: user.skills,
                    previousProjects: user.previousProjects,
                    socialLinks: user.socialLinks,
                    clg : user.clg,
                    year : user.year,
                    stats : user.stats,
                    isProfileComplete: user.isProfileComplete,
                },
                message: "Profile retrieved successfully",
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Server error",
            });
        }
    }

    static async getProfileStats(req, res) {
        try {
            const user = await User.findOne({ email: req.user.email }); // Assuming authMiddleware attaches user to req
            // For demonstration, we'll return dummy stats. Replace with real logic.
            
            return res.status(200).json({
                success: true,
                data: user.stats,
                message: "Profile stats retrieved successfully",
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Server error",
            });
        }
    }

    static async updateMyProfile(req, res) {
        try {
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            const {
                name,
                username,
                phone,
                level,
                profilePicture,
                bio,
                skills,
                previousProjects,
                socialLinks,
                clg,
                year,
            } = req.body;

            // Update fields if they are provided
            if (name !== undefined) user.name = name;
            if (username !== undefined) user.username = username;
            if (phone !== undefined) user.phone = phone;
            if (level !== undefined) user.level = level;
            if (profilePicture !== undefined) user.profilePicture = profilePicture;
            if (bio !== undefined) user.bio = bio;
            if (skills !== undefined) user.skills = skills;
            if (previousProjects !== undefined) user.previousProjects = previousProjects;
            if (socialLinks !== undefined) user.socialLinks = socialLinks;
            if (clg !== undefined) user.clg = clg;
            if (year !== undefined) user.year = year;

            user.isProfileComplete = Boolean(
                user.name?.trim() &&
                user.email?.trim() &&
                user.phone?.trim() &&
                user.password &&
                user.username?.trim() &&
                user.clg?.trim() &&
                user.year &&
                Array.isArray(user.skills) &&
                user.skills.length > 0
            );

            await user.save();

            return res.status(200).json({
                success: true,
                data: {
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    phone: user.phone,
                    level: user.level,
                    profilePicture: user.profilePicture,
                    bio: user.bio,
                    skills: user.skills,
                    previousProjects: user.previousProjects,
                    socialLinks: user.socialLinks,
                    isProfileComplete: user.isProfileComplete,
                },
                message: "Profile updated successfully",
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || "Server error",
            });
        }   
    }

}   

module.exports = ProfileController;