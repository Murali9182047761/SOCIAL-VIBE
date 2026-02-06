const Post = require("../models/Post");
const User = require("../models/user");

exports.getUserAnalytics = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get User Data (Profile Views)
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Aggregate Post Data
        const posts = await Post.find({ userId: userId });

        let totalLikes = 0;
        let totalComments = 0;
        let totalPosts = posts.length;
        let postStats = [];

        posts.forEach(post => {
            const likeCount = post.likes ? post.likes.size : 0;
            const commentCount = post.comments ? post.comments.length : 0;

            totalLikes += likeCount;
            totalComments += commentCount;

            postStats.push({
                _id: post._id,
                description: post.description || "No description",
                createdAt: post.createdAt,
                picturePath: post.picturePath,
                likes: likeCount,
                comments: commentCount,
                engagement: likeCount + commentCount
            });
        });

        // Sort by engagement (likes + comments)
        postStats.sort((a, b) => b.engagement - a.engagement);

        // Get recent activity (likes received last 7 days?) - HARD to do without Activity/Notification Log fully queried
        // Simplified: Just return aggregates

        res.status(200).json({
            profileViews: user.profileViews || 0,
            totalPosts,
            totalLikes,
            totalComments,
            topPosts: postStats.slice(0, 5) // Top 5
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
