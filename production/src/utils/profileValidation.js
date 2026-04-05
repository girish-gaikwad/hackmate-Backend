const joi = require("joi");

const schemas ={
    getMyProfile: joi.object({
        
    }),
    getProfileStats: joi.object({
        
    }),
    updateProfile: joi.object({
        name: joi.string().optional(),
        username: joi.string().optional(),
        phone: joi.string().optional(),
        level: joi.string().valid("beginner", "intermediate", "advanced").optional(),
        clg: joi.string().optional(),
        year: joi.number().integer().optional(),
        profilePicture: joi.string().optional(),
        bio: joi.string().optional(),
        skills: joi.array().items(joi.string()).optional(),
        socialLinks: joi.object().optional(),
        previousProjects: joi.array().items(
            joi.object({
                title: joi.string().required(),
                description: joi.string().allow("").optional(),
                link: joi.string().uri().allow("").optional(),
                techStack: joi.array().items(joi.string()).optional(),
                completedAt: joi.date().iso().optional().allow(null),
            })
        ).optional()
    }),
}



module.exports = {
    schemas
}