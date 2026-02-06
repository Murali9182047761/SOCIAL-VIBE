const Post = require("../models/Post");
const User = require("../models/user");

exports.searchAll = async (req, res) => {
    try {
        const { query, type = "all", location } = req.query;
        let results = {};

        if (!query && !location) {
            return res.status(200).json({});
        }

        const regex = new RegExp(query, "i");

        // Search Users
        if (type === "all" || type === "user") {
            const userFilter = query ? {
                $or: [
                    { name: regex },
                    { username: regex },
                    { email: regex }
                ]
            } : {};

            // If location filter applies to users too
            if (location) {
                userFilter.location = new RegExp(location, "i");
            }

            results.users = await User.find(userFilter).select("name username profilePicture location _id");
        }

        // Search Posts
        if (type === "all" || type === "post") {
            const postFilter = { status: "published", visibility: "public" };

            if (query) {
                postFilter.$or = [
                    { description: regex },
                    { location: regex },
                    // { firstName: regex }, // Optional: search by author name too
                ];
            }

            if (location) {
                // Override or add to location search
                // If query was also location, this enforces the specific location filter
                if (postFilter.$or) {
                    postFilter.$and = [
                        { $or: postFilter.$or },
                        { location: new RegExp(location, "i") }
                    ];
                    delete postFilter.$or;
                } else {
                    postFilter.location = new RegExp(location, "i");
                }
            }

            results.posts = await Post.find(postFilter)
                .populate("userId", "name profilePicture")
                .sort({ createdAt: -1 });
        }

        // Search Hashtags (Special case of posts)
        if (type === "hashtag") {
            // Find posts containing the hashtag in description
            // Query should allow searching "nature" to find "#nature"
            const hashRegex = new RegExp(`#${query.replace("#", "")}`, "i");

            results.posts = await Post.find({
                description: hashRegex,
                status: "published",
                visibility: "public"
            })
                .populate("userId", "name profilePicture")
                .sort({ createdAt: -1 });
        }

        res.status(200).json(results);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getTrending = async (req, res) => {
    try {
        // Simple aggregation to find most used words starting with # in recent posts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trending = await Post.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    status: "published",
                    visibility: "public"
                }
            },
            {
                $project: {
                    words: { $split: ["$description", " "] }
                }
            },
            { $unwind: "$words" },
            {
                $match: {
                    words: { $regex: /^#/ }
                }
            },
            {
                $group: {
                    _id: { $toLower: "$words" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json(trending);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
