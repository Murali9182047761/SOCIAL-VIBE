const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Not required for Google users
    googleId: { type: String },
    authSource: { type: String, enum: ["local", "google"], default: "local" },

    profilePicture: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    bio: {
      type: String,
      default: "",
    },
    followers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    following: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    savedPosts: {
      type: Array,
      default: [],
    },
    coverPicture: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
    blockedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    followRequests: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    privacySettings: {
      profileVisibility: { type: String, enum: ["public", "private"], default: "public" },
    },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
    },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: String,
    twoFactorExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    flags: {
      isPotentialFake: { type: Boolean, default: false },
      isPotentialSpammer: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
