const express = require("express");
const { getStories, createStory, deleteStory, viewStory } = require("../controllers/storyController");

const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", getStories);
router.post("/", upload.single("picture"), createStory);
router.delete("/:id", deleteStory);
router.patch("/:id/view", viewStory);

module.exports = router;
