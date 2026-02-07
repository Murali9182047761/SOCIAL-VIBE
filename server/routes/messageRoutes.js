const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { allMessages, sendMessage, deleteMessage, deleteAllMessages } = require("../controllers/messageController");
const upload = require("../middleware/upload");

router.get("/:chatId", authMiddleware, allMessages);
router.post("/", authMiddleware, upload.array("media", 10), sendMessage);
router.delete("/:id", authMiddleware, deleteMessage);
router.delete("/:chatId/all", authMiddleware, deleteAllMessages);

module.exports = router;

