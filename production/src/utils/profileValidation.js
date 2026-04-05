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
        clg: joi.string().optional(),
        year: joi.number().integer().optional(),
        profilePicture: joi.string().optional(),
        bio: joi.string().optional(),
        skills: joi.array().items(joi.string()).optional(),
        socialLinks: joi.object().optional()
    }),
}



module.exports = {
    schemas
}