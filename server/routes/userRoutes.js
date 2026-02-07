const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateProfile,
  getUser,
  getUserFriends,
  getUserFollowers,
  addRemoveFriend,
  getAllUsers,
  searchUser,
  saveUnsavePost,
  getUserSavedPosts,
  blockUser,
  unblockUser,
  acceptFollowRequest,
  declineFollowRequest,
  getFollowRequests,
  deleteAccount,
} = require("../controllers/userController");

const upload = require("../middleware/upload");

router.get("/profile", authMiddleware, getUserProfile);
router.put(
  "/profile",
  authMiddleware,
  (req, res, next) => {
    upload.fields([{ name: "picture", maxCount: 1 }, { name: "cover", maxCount: 1 }])(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: "File upload error: " + err.message });
      }
      next();
    });
  },
  updateProfile
);
router.delete("/profile", authMiddleware, deleteAccount);
router.get("/search", authMiddleware, searchUser);
router.get("/:id", authMiddleware, getUser);
router.get("/:id/friends", authMiddleware, getUserFriends);
router.get("/:id/followers", authMiddleware, getUserFollowers);
router.patch("/:id/:friendId", authMiddleware, addRemoveFriend);
router.patch("/:id/save/:postId", authMiddleware, saveUnsavePost);
router.get("/:id/saved", authMiddleware, getUserSavedPosts);
router.put("/:id/block", authMiddleware, blockUser);
router.put("/:id/unblock", authMiddleware, unblockUser);

// Follow Request Routes
router.post("/requests/accept", authMiddleware, acceptFollowRequest);
router.post("/requests/decline", authMiddleware, declineFollowRequest);
router.get("/:id/requests", authMiddleware, getFollowRequests);
router.get("/", authMiddleware, getAllUsers);

module.exports = router;
