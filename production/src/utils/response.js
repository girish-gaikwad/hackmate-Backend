// Standardized API responses
class ApiResponse {
  constructor(statusCode, data, message) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

const sendResponse = (res, statusCode, data, message) => {
  const response = new ApiResponse(statusCode, data, message);
  return res.status(statusCode).json(response);
};

const sendSuccess = (res, data, message, statusCode = 200) => {
  return sendResponse(res, statusCode, data, message);
};

const sendError = (res, message, statusCode = 500, data = null) => {
  return sendResponse(res, statusCode, data, message);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendError,
  ApiResponse,
};
