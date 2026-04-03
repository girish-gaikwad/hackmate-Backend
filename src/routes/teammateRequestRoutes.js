const express = require('express');
const router = express.Router();
const { teammateRequestController } = require('../controllers');
const { validate } = require('../middleware/validateMiddleware');
const { teammateRequestValidation } = require('../validations');
const { protect } = require('../middleware/authMiddleware');


router.get(
  '/',
  protect,
  teammateRequestController.getTeammateRequests
);


router.get(
  '/college',
  protect,
  teammateRequestController.getCollegeRequests
);


router.get(
  '/hackathon/:hackathonId',
  protect,
  teammateRequestController.getRequestsByHackathon
);


router.post(
  '/',
  protect,
  validate(teammateRequestValidation.createRequest),
  teammateRequestController.createTeammateRequest
);


router.get(
  '/:id',
  protect,
  teammateRequestController.getTeammateRequest
);


router.put(
  '/:id',
  protect,
  validate(teammateRequestValidation.updateRequest),
  teammateRequestController.updateTeammateRequest
);


router.delete(
  '/:id',
  protect,
  teammateRequestController.deleteTeammateRequest
);


router.post(
  '/:id/interest',
  protect,
  validate(teammateRequestValidation.expressInterest),
  teammateRequestController.expressInterest
);


router.delete(
  '/:id/interest',
  protect,
  teammateRequestController.withdrawInterest
);


router.post(
  '/:id/accept/:userId',
  protect,
  teammateRequestController.acceptInterest
);


router.post(
  '/:id/reject/:userId',
  protect,
  teammateRequestController.rejectInterest
);


router.put(
  '/:id/close',
  protect,
  teammateRequestController.closeRequest
);


router.put(
  '/:id/fulfill',
  protect,
  teammateRequestController.fulfillRequest
);

module.exports = router;
