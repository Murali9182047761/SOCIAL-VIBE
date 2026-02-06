const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        userPicturePath: String,
        picturePath: { type: String, required: true },
        views: { type: Array, default: [] }, // Array of user IDs
        createdAt: { type: Date, default: Date.now, expires: 86400 }, // Expires after 24 hours
    }
);

module.exports = mongoose.model("Story", StorySchema);
