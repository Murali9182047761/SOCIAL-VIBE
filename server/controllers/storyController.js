const Story = require("../models/Story");
const User = require("../models/user");

/* READ */
const getStories = async (req, res) => {
    try {
        const stories = await Story.find().sort({ createdAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

/* CREATE */
const createStory = async (req, res) => {
    try {
        const { userId } = req.body;
        let picturePath = "";
        if (req.file) {
            picturePath = req.file.path;
        } else if (req.body.picturePath) {
            picturePath = req.body.picturePath;
        }

        const user = await User.findById(userId);

        const newStory = new Story({
            userId,
            username: user.name,
            userPicturePath: user.profilePicture,
            picturePath,
        });

        await newStory.save();

        // Return all stories to refresh feed
        const stories = await Story.find().sort({ createdAt: -1 });
        res.status(201).json(stories);
    } catch (err) {
        res.status(409).json({ message: err.message });
    }
};

/* DELETE */
const deleteStory = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body; // Expecting userId in body for ownership check

        const story = await Story.findById(id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        if (story.userId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this story" });
        }

        await Story.findByIdAndDelete(id);

        // Return updated list
        const stories = await Story.find().sort({ createdAt: -1 });
        res.status(200).json(stories);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

/* UPDATE */
const viewStory = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const story = await Story.findById(id);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // If user hasn't viewed it yet, add them
        if (!story.views.includes(userId)) {
            story.views.push(userId);
            await story.save();
        }

        // Return the updated story
        res.status(200).json(story);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

module.exports = { getStories, createStory, deleteStory, viewStory };
