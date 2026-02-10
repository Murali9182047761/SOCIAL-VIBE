const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  userPicturePath: String,
  text: { type: String, required: true },
  replies: { type: Array, default: [] }, // Simple nested structure or just referencing
  likes: { type: Map, of: String }, // UserID -> Reaction Type
}, { timestamps: true });

const PostSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    location: String,
    description: String,
    picturePath: String,
    picturePaths: {
      type: Array,
      default: []
    },
    userPicturePath: String,
    likes: {
      type: Map,
      of: String, // Changed from Boolean to String to support reaction types (like, heart, laugh, etc.)
    },
    comments: [CommentSchema], // Use Schema for IDs and timestamps
    visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    status: {
      type: String,
      enum: ["published", "draft", "scheduled", "archived"],
      default: "published",
    },
    scheduledAt: {
      type: Date,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pollOptions: [
      {
        text: { type: String, required: true },
        votes: { type: [String], default: [] } // Array of userIds
      }
    ],
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral"
    },
    collaborators: [{
      userId: String,
      name: String,
      profilePicture: String
    }],
    tags: [String],
    mentions: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
