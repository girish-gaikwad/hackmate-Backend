const jwt = require("jsonwebtoken");
const config = require("../config/env");

class JWTService {
  // Generate access token
  static generateAccessToken(userId, email) {
    return jwt.sign({ userId, email }, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });
  }

  // Generate refresh token
  static generateRefreshToken(userId, email) {
    return jwt.sign({ userId, email }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY,
    });
  }

  // Generate both tokens
  static generateTokenPair(userId, email) {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_ACCESS_EXPIRY,
    };
  }

  // Verify access token
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Access token expired");
      }
      throw new Error("Invalid access token");
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token expired");
      }
      throw new Error("Invalid refresh token");
    }
  }

  // Extract token from header
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.slice(7);
  }
}

module.exports = JWTService;
