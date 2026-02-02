const { Router } = require("express");
const followupController = require("../controllers/followup.controller.js");

const router = Router();

router.get("/", followupController.getAllFollowups);
router.get("/performance", followupController.getSalesPerformanceReport);
router.get("/stats", followupController.getFollowupStats);
router.get("/:id", followupController.getFollowup);
router.post("/", followupController.createFollowup);
router.put("/:id", followupController.updateFollowup);
router.delete("/:id", followupController.deleteFollowup);

module.exports = router;
