const express = require("express");
const { getFeedPosts, getUserPosts, likePost, commentPost, createPost, deletePost, updatePost, pinPost, votePoll, deleteComment, archivePost } = require("../controllers/postController");
const upload = require("../middleware/upload");
// const { verifyToken } = require("../middleware/auth"); 

const router = express.Router();

/* READ */
router.get("/", getFeedPosts);
router.get("/:userId/posts", getUserPosts);

/* WRITE */
router.post("/", upload.array("picture", 10), createPost); // Allow up to 10 files

/* UPDATE */
router.patch("/:id/like", likePost);
router.post("/:id/comment", commentPost);
router.patch("/:id/archive", archivePost);

/* DELETE */
router.delete("/:id", deletePost);
router.put("/:id", updatePost);
router.patch("/:id/pin", pinPost);
router.patch("/:id/vote", votePoll);
router.delete("/:id/comment/:commentId", deleteComment);

module.exports = router;
