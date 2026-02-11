const express = require("express");
const {
    accessChat,
    fetchChats,
    createGroupChat,
    removeFromGroup,
    addToGroup,
    renameGroup,
    leaveGroup,
    deleteGroup,
    deleteChat
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
router.route("/:chatId").delete(authMiddleware, deleteChat);

module.exports = router;
