const User = require("../models/user");
const Post = require("../models/Post");

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");

    // Increment view count if user exists and it's not the user viewing their own profile
    if (user && req.user && req.user._id && req.user._id.toString() !== id) {
      user.profileViews = (user.profileViews || 0) + 1;
      await user.save();
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
}

exports.getUserSavedPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Assuming savedPosts is an array of Post IDs
    const savedPosts = await Promise.all(
      user.savedPosts.map((postId) => Post.findById(postId))
    );

    // Filter out any nulls (if posts were deleted)
    const formattedSavedPosts = savedPosts.filter(post => post !== null);

    res.status(200).json(formattedSavedPosts);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.getUserFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Cleanup duplicates on read if they exist
    const uniqueFollowers = [...new Set(user.followers.map(id => id.toString()))];
    if (uniqueFollowers.length !== user.followers.length) {
      user.followers = uniqueFollowers;
      await user.save();
    }

    const followers = await Promise.all(
      uniqueFollowers.map((id) => User.findById(id))
    );

    // Filter out nulls first
    const safeFollowers = followers.filter(f => f !== null);

    const formattedFollowers = safeFollowers.map(
      ({ _id, name, profilePicture, location, bio }) => {
        return { _id, name, profilePicture, location, bio };
      }
    );
    res.status(200).json(formattedFollowers);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.getUserFriends = async (req, res) => {

  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Cleanup duplicates on read
    const uniqueFollowing = [...new Set(user.following.map(id => id.toString()))];
    if (uniqueFollowing.length !== user.following.length) {
      user.following = uniqueFollowing;
      await user.save();
    }

    const friends = await Promise.all(
      uniqueFollowing.map((id) => User.findById(id))
    );

    // Filter out nulls
    const safeFriends = friends.filter(f => f !== null);

    const formattedFriends = safeFriends.map(
      ({ _id, name, profilePicture, location, bio }) => {
        return { _id, name, profilePicture, location, bio };
      }
    );
    res.status(200).json(formattedFriends);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.addRemoveFriend = async (req, res) => {
  try {
    const { id, friendId } = req.params;
    const user = await User.findById(id); // Current user
    const friend = await User.findById(friendId); // Target user

    if (!user || !friend) return res.status(404).json({ message: "User not found" });

    // UNFOLLOW logic
    if (user.following.includes(friendId)) {
      user.following = user.following.filter((item) => item.toString() !== friendId);
      friend.followers = friend.followers.filter((item) => item.toString() !== id);
      await user.save();
      await friend.save();
    }
    // CANCEL REQUEST logic
    else if (friend.followRequests && friend.followRequests.includes(id)) {
      friend.followRequests = friend.followRequests.filter((item) => item.toString() !== id);
      await friend.save();
    }
    // FOLLOW logic
    else {
      // Check privacy
      if (friend.privacySettings && friend.privacySettings.profileVisibility === "private") {
        // Send Request
        if (!friend.followRequests) friend.followRequests = [];
        if (!friend.followRequests.includes(id)) {
          friend.followRequests.push(id);
          await friend.save();
        }
      } else {
        // Direct Follow
        if (!user.following.includes(friendId)) {
          user.following.push(friendId);
          friend.followers.push(id);
          await user.save();
          await friend.save();
        }
      }
    }

    // Return updated friends list (for UI consistency, though complex with requests)
    const friends = await Promise.all(
      user.following.map((id) => User.findById(id))
    );
    const formattedFriends = friends
      .filter(f => f !== null)
      .map(
        ({ _id, name, profilePicture, location, bio }) => {
          return { _id, name, profilePicture, location, bio };
        }
      );

    res.status(200).json(formattedFriends);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.acceptFollowRequest = async (req, res) => {
  try {
    const { userId, requesterId } = req.body; // userId is "me", requesterId is who asked
    const user = await User.findById(userId);
    const requester = await User.findById(requesterId);

    if (!user || !requester) return res.status(404).json({ message: "User not found" });

    // Remove from requests
    if (user.followRequests.includes(requesterId)) {
      user.followRequests = user.followRequests.filter(id => id.toString() !== requesterId);

      // Add to followers/following IF NOT ALREADY THERE
      if (!user.followers.includes(requesterId)) {
        user.followers.push(requesterId);
      }
      if (!requester.following.includes(userId)) {
        requester.following.push(userId);
      }

      await user.save();
      await requester.save();

      res.status(200).json({ message: "Request accepted", followRequests: user.followRequests });
    } else {
      res.status(400).json({ message: "Request not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.declineFollowRequest = async (req, res) => {
  try {
    const { userId, requesterId } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.followRequests.includes(requesterId)) {
      user.followRequests = user.followRequests.filter(id => id.toString() !== requesterId);
      await user.save();
      res.status(200).json({ message: "Request declined", followRequests: user.followRequests });
    } else {
      res.status(400).json({ message: "Request not found" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFollowRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("followRequests", "name profilePicture bio");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.followRequests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, location, email, privacySettings, notificationSettings, twoFactorEnabled } = req.body;
    let profilePicture = undefined;
    let coverPicture = undefined;

    if (req.files) {
      if (req.files.picture) {
        profilePicture = `${process.env.SERVER_URL || "http://localhost:4000"}/assets/${req.files.picture[0].filename}`;
      }
      if (req.files.cover) {
        coverPicture = `${process.env.SERVER_URL || "http://localhost:4000"}/assets/${req.files.cover[0].filename}`;
      }
    }

    const updateData = { name, bio };
    if (location) updateData.location = location;
    if (email) updateData.email = email;
    if (privacySettings) {
      // Handle nested object update or full replacement
      // If sending JSON string from formData (common with mixed content), parse it
      try {
        updateData.privacySettings = typeof privacySettings === 'string' ? JSON.parse(privacySettings) : privacySettings;
      } catch (e) {
        updateData.privacySettings = privacySettings;
      }
    }

    if (notificationSettings) {
      try {
        updateData.notificationSettings = typeof notificationSettings === 'string' ? JSON.parse(notificationSettings) : notificationSettings;
      } catch (e) {
        updateData.notificationSettings = notificationSettings;
      }
    }

    if (twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = String(twoFactorEnabled) === "true";
    }

    if (profilePicture) updateData.profilePicture = profilePicture;
    if (coverPicture) updateData.coverPicture = coverPicture;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Profile update failed: " + error.message });
  }
};

exports.searchUser = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(200).json([]);

    const users = await User.find({
      name: { $regex: query, $options: "i" },
    }).select("name profilePicture _id followers");


    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};

exports.saveUnsavePost = async (req, res) => {
  try {
    const { id, postId } = req.params;
    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    const isSaved = user.savedPosts.some(item => item.toString() === postId);

    if (isSaved) {
      user.savedPosts = user.savedPosts.filter((item) => item.toString() !== postId);
    } else {
      user.savedPosts.push(postId);
    }
    await user.save();

    res.status(200).json(user.savedPosts);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params; // ID of user to block
    const userId = req.user._id;

    if (id === userId.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const user = await User.findById(userId);
    const userToBlock = await User.findById(id);

    if (!userToBlock) return res.status(404).json({ message: "User not found" });

    if (!user.blockedUsers) user.blockedUsers = [];

    if (!user.blockedUsers.includes(id)) {
      user.blockedUsers.push(id);

      // Also follow/unfollow logic if you want to force unfollow
      if (user.following.includes(id)) {
        user.following = user.following.filter(fid => fid.toString() !== id);
        userToBlock.followers = userToBlock.followers.filter(fid => fid.toString() !== userId);
        await userToBlock.save();
      }

      await user.save();
      res.status(200).json({ message: "User blocked successfully", blockedUsers: user.blockedUsers });
    } else {
      res.status(400).json({ message: "User already blocked" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user.blockedUsers) user.blockedUsers = [];

    if (user.blockedUsers.includes(id)) {
      user.blockedUsers = user.blockedUsers.filter((blockedId) => blockedId.toString() !== id);
      await user.save();
      res.status(200).json({ message: "User unblocked successfully", blockedUsers: user.blockedUsers });
    } else {
      res.status(400).json({ message: "User is not blocked" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user's posts (Use string conversion for safety as Schema defines it as String)
    await Post.deleteMany({ userId: userId.toString() });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({ message: err.message });
  }
};
