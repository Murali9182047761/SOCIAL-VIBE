const express = require("express");
const {
    accessChat,
    fetchChats,
    createGroupChat,
    removeFromGroup,
    addToGroup,
    renameGroup,
    leaveGroup,
    deleteGroup
} = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(authMiddleware, accessChat);
router.route("/").get(authMiddleware, fetchChats);
router.route("/group").post(authMiddleware, createGroupChat);
router.route("/rename").put(authMiddleware, renameGroup);
router.route("/groupremove").put(authMiddleware, removeFromGroup);
router.route("/groupadd").put(authMiddleware, addToGroup);
router.route("/groupleave").put(authMiddleware, leaveGroup);
router.route("/group/:chatId").delete(authMiddleware, deleteGroup);

module.exports = router;
