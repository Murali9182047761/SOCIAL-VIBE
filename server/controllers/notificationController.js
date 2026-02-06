const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await Notification.find({ recipient: userId })
            .populate("sender", "name profilePicture")
            .populate("post", "description")
            .sort({ createdAt: -1 });

        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        // If id is "all", mark all as read for the user (passed in body or just handle robustly)
        // For now, let's assume individual mark as read or we can iterate later.

        await Notification.findByIdAndUpdate(id, { read: true });
        res.status(200).json({ message: "Marked as read" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createScreenshotNotification = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.user._id;

        if (recipientId === senderId.toString()) return res.status(200).json({ message: "No notification for self screenshot" });

        const newNotification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type: "screenshot",
        });

        const savedNotification = await newNotification.save();

        await savedNotification.populate("sender", "name profilePicture");
        await savedNotification.populate("post", "description");

        const io = req.app.get("io");
        if (io) {
            io.to(recipientId).emit("new-notification", savedNotification);
        }

        res.status(201).json(savedNotification);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
