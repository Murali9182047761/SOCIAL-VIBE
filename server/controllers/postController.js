const Post = require("../models/Post");
const User = require("../models/user");
const Notification = require("../models/Notification");
const { detectSpam, detectToxicity, analyzeSentiment } = require("../utils/aiDetector");

/* CREATE */
const createPost = async (req, res) => {
    try {
        const { userId, description, visibility, status, scheduledAt, pollOptions } = req.body;

        // SPAM & TOXICITY CHECK
        if (detectSpam(description)) {
            return res.status(400).json({ message: "Post content blocked by spam filter." });
        }
        if (detectToxicity(description)) {
            return res.status(400).json({ message: "Post blocked: Content contains toxic or offensive language." });
        }

        const sentiment = analyzeSentiment(description);

        let picturePath = "";
        let picturePaths = [];
        // ... (truncated for brevity, keep existing file logic)

        // Handle multiple files
        if (req.files && req.files.length > 0) {
            picturePaths = req.files.map(file => `${process.env.SERVER_URL || "http://localhost:4000"}/assets/${file.filename}`);
            // Use the first image as the primary picturePath for backward compatibility
            picturePath = picturePaths[0];
        }
        else if (req.body.picturePath) {
            if (req.body.picturePath.startsWith("http")) {
                picturePath = req.body.picturePath;
                picturePaths = [picturePath];
            }
        }

        let formattedPollOptions = [];
        if (pollOptions) {
            try {
                formattedPollOptions = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
            } catch (e) {
                console.error("Error parsing pollOptions", e);
            }
        }

        const user = await User.findById(userId);
        const newPost = new Post({
            userId,
            firstName: user.name,
            lastName: "",
            location: "",
            description,
            userPicturePath: user.profilePicture,
            picturePath,
            picturePaths,
            likes: {},
            comments: [],
            visibility: visibility || "public",
            status: status || "published",
            scheduledAt: scheduledAt || null,
            pollOptions: formattedPollOptions,
            sentiment: sentiment
        });
        await newPost.save();

        if (newPost.status === 'published') {
            // Emit event for real-time updates only if published
            req.app.get("io").emit("new-post", newPost);
        }

        res.status(201).json(newPost);
    } catch (err) {
        console.error("Error in createPost:", err);
        res.status(409).json({ message: err.message });
    }
};

/* READ */
const getFeedPosts = async (req, res) => {
    try {
        const { userId, type = "latest", page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Base filter: always published and scheduled time passed
        const baseFilter = {
            status: "published",
            $or: [
                { scheduledAt: { $exists: false } },
                { scheduledAt: null },
                { scheduledAt: { $lte: new Date() } }
            ]
        };

        let posts;
        let totalPosts;

        if (type === "wellness") { // NEW MENTAL HEALTH FEED
            // Strictly show Positive posts. Filter out Negative.
            // Can show Neutral if desired, but let's prioritize positive.
            const filter = {
                ...baseFilter,
                visibility: "public",
                sentiment: "positive"
            };

            totalPosts = await Post.countDocuments(filter);
            posts = await Post.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

        } else if (type === "personalized") {
            // ... (keep existing logic but maybe deprioritize negative?)
            // For now keep as is to avoid breaking
            if (!userId) {
                return res.status(400).json({ message: "User ID is required for personalized feed." });
            }
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            const followingIds = user.following;

            // Reduce visibility of negative content in standard personalized feed?
            // "System automatically reduces visibility..."
            const filter = {
                ...baseFilter,
                userId: { $in: followingIds },
                visibility: { $in: ["public", "friends"] },
                sentiment: { $ne: "negative" } // HIDE NEGATIVE POSTS from main feed by default? Or just deprioritize?
                // The prompt says "automatically... reduces its visibility". 
                // Let's filter them out for now in "For You".
            };

            // ... (rest of personalized logic)
            // Note: I am simplifying the edit to just insert specific chunks not the whole file if possible
            // But since getFeedPosts is huge, I am replacing a big chunk logic.

            // Actually, I should probably re-implement personalized to use this filter.
            const followingCount = await Post.countDocuments(filter);

            if (followingCount < 5 || pageNum > Math.ceil(followingCount / limitNum)) {
                // Discover Mode: Show popular public posts not from self
                const discoveryFilter = {
                    ...baseFilter,
                    visibility: "public",
                    userId: { $nin: [...followingIds, userId] },
                    sentiment: { $ne: "negative" } // Also hide negative here
                };

                totalPosts = await Post.countDocuments(discoveryFilter);
                posts = await Post.find(discoveryFilter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum);
            } else {
                totalPosts = followingCount;
                posts = await Post.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum);
            }

        } else if (type === "my_posts") {
            // Show ALL posts (draft, scheduled, published) for this user
            const filter = { userId: userId }; // No status filter
            totalPosts = await Post.countDocuments(filter);
            posts = await Post.find(filter)
                .sort({ isPinned: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

        } else if (type === "saved") {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            // Assuming savedPosts is an array of IDs
            const savedPostIds = user.savedPosts || [];
            if (savedPostIds.length === 0) {
                return res.status(200).json({ posts: [], totalPosts: 0, currentPage: 1, totalPages: 0 });
            }

            const filter = { ...baseFilter, _id: { $in: savedPostIds } };
            totalPosts = await Post.countDocuments(filter);
            posts = await Post.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

        } else if (type === "trending") {
            const filter = { ...baseFilter, visibility: "public" };
            totalPosts = await Post.countDocuments(filter);

            posts = await Post.aggregate([
                { $match: filter },
                {
                    $addFields: {
                        likesCount: { $size: { $objectToArray: "$likes" } }
                    }
                },
                { $sort: { likesCount: -1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limitNum }
            ]);

        } else {
            // Default: Latest posts (Global Feed - only Public)
            const filter = { ...baseFilter, visibility: "public" };
            totalPosts = await Post.countDocuments(filter);
            posts = await Post.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);
        }

        res.status(200).json({
            posts,
            currentPage: pageNum,
            totalPages: Math.ceil(totalPosts / limitNum),
            totalPosts
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const post = await Post.find({ userId }).sort({ isPinned: -1, createdAt: -1 });
        res.status(200).json(post);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

/* UPDATE */
const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, reactionType } = req.body;
        const post = await Post.findById(id);

        const currentReaction = post.likes.get(userId);

        if (currentReaction && currentReaction === (reactionType || "like")) {
            post.likes.delete(userId);
        } else {
            post.likes.set(userId, reactionType || "like");

            if (post.userId !== userId && !currentReaction) {
                const notification = new Notification({
                    recipient: post.userId,
                    sender: userId,
                    type: reactionType || "like",
                    post: id
                });
                await notification.save();
                await notification.populate("sender", "name profilePicture");
                req.app.get("io").emit("new-notification", notification);
            }
        }

        const updatedPost = await Post.findByIdAndUpdate(
            id,
            { likes: post.likes },
            { new: true }
        );

        req.app.get("io").emit("post-updated", updatedPost);

        res.status(200).json(updatedPost);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

const commentPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        // SPAM CHECK
        if (detectSpam(comment.text)) {
            return res.status(400).json({ message: "Comment blocked by spam filter." });
        }
        if (detectToxicity(comment.text)) {
            return res.status(400).json({ message: "Comment blocked: Content contains toxic or offensive language." });
        }

        const post = await Post.findById(id);

        if (comment.parentId) {
            const parentComment = post.comments.id(comment.parentId);
            if (parentComment) {
                const reply = { ...comment, _id: new mongoose.Types.ObjectId(), createdAt: new Date() };
                parentComment.replies.push(reply);
            } else {
                post.comments.push(comment);
            }
        } else {
            post.comments.push(comment);
        }

        await post.save();

        const updatedPost = await Post.findById(id);

        if (post.userId !== comment.userId) {
            const notification = new Notification({
                recipient: post.userId,
                sender: comment.userId,
                type: "comment",
                post: id
            });
            await notification.save();
            await notification.populate("sender", "name profilePicture");
            req.app.get("io").emit("new-notification", notification);
        }

        req.app.get("io").emit("post-updated", updatedPost);

        res.status(200).json(updatedPost);
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userId } = req.body;

        console.log(`Attempting to delete comment: Post ${id}, Comment ${commentId}, User ${userId}`);

        const post = await Post.findById(id);
        if (!post) {
            console.log("Post not found");
            return res.status(404).json({ message: "Post not found" });
        }

        const comment = post.comments.id(commentId);

        let parentComment = null;
        let reply = null;

        if (!comment) {
            // It might be a reply
            for (let c of post.comments) {
                const r = c.replies.find(r => r._id.toString() === commentId);
                if (r) {
                    parentComment = c;
                    reply = r;
                    break;
                }
            }
        }

        const target = comment || reply;
        if (!target) {
            console.log("Comment not found");
            return res.status(404).json({ message: "Comment not found" });
        }

        // Check Authorization
        // Post owner OR Comment owner can delete
        const isPostOwner = post.userId.toString() === userId;
        const isCommentOwner = target.userId.toString() === userId;

        if (!isPostOwner && !isCommentOwner) {
            console.log("Unauthorized delete attempt");
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (comment) {
            // It's a top-level comment
            // For embedded docs, pull is the standard way to remove
            post.comments.pull(commentId);
        } else if (parentComment) {
            // It's a reply
            parentComment.replies = parentComment.replies.filter(r => r._id.toString() !== commentId);
            // Since replies is usually a plain array in the schema (check Post.js), filtering works.
            // If it was a subdoc array, .pull() on parentComment.replies might work if schema defined it.
            // But looking at Post.js: replies: { type: Array, default: [] } -> It's a plain array/mixed.
        }

        // Mark modified to support mixed types or deep changes if needed
        post.markModified('comments');

        await post.save();
        console.log("Comment deleted successfully");

        req.app.get("io").emit("post-updated", post);
        res.status(200).json(post);

    } catch (err) {
        console.error("Error inside deleteComment:", err);
        res.status(500).json({ message: err.message });
    }
}

const editComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { userId, text } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);

        let parentComment = null;
        let reply = null;

        if (!comment) {
            for (let c of post.comments) {
                const r = c.replies.find(r => r._id.toString() === commentId);
                if (r) {
                    parentComment = c;
                    reply = r;
                    break;
                }
            }
        }

        const target = comment || reply;
        if (!target) return res.status(404).json({ message: "Comment not found" });

        if (target.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        target.text = text;

        if (reply && parentComment) {
            post.markModified('comments');
        }

        await post.save();
        req.app.get("io").emit("post-updated", post);
        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

/* DELETE */
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.userId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(id);

        req.app.get("io").emit("post-deleted", id);

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, description, visibility, status, scheduledAt } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (description !== undefined) post.description = description;
        if (visibility !== undefined) post.visibility = visibility;
        if (status !== undefined) post.status = status;
        if (scheduledAt !== undefined) post.scheduledAt = scheduledAt;

        await post.save();

        if (post.status === 'published') {
            req.app.get("io").emit("post-updated", post);
        }

        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const votePoll = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, optionIndex } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (!post.pollOptions || post.pollOptions.length === 0) {
            return res.status(400).json({ message: "This post has no poll." });
        }

        post.pollOptions.forEach(opt => {
            opt.votes = opt.votes.filter(voterId => voterId !== userId);
        });

        if (post.pollOptions[optionIndex]) {
            post.pollOptions[optionIndex].votes.push(userId);
        } else {
            return res.status(400).json({ message: "Invalid option index" });
        }

        await post.save();

        req.app.get("io").emit("post-updated", post);

        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const pinPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        post.isPinned = !post.isPinned;
        await post.save();

        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const archivePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Toggle archived status
        post.status = post.status === "archived" ? "published" : "archived";
        await post.save();

        res.status(200).json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createPost,
    getFeedPosts,
    getUserPosts,
    likePost,
    commentPost,
    deletePost,
    updatePost,
    pinPost,
    votePoll,
    deleteComment,
    editComment,
    archivePost
};
