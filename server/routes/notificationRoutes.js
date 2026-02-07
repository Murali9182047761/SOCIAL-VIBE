const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // assuming you have this
const { getNotifications, markAsRead, createScreenshotNotification } = require("../controllers/notificationController");

router.get("/:userId", authMiddleware, getNotifications);
router.post("/screenshot", authMiddleware, createScreenshotNotification);
router.patch("/:id/read", authMiddleware, markAsRead);

module.exports = router;
