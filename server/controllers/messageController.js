const Message = require("../models/Message");
const User = require("../models/user");
const Chat = require("../models/Chat");

// Get all messages for a specific chat
exports.allMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            chat: req.params.chatId,
            deletedFor: { $ne: req.user.id } // Filter out messages deleted for this user
        })
            .populate("sender", "name profilePicture email")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

const { detectToxicity } = require("../utils/aiDetector");

// Send a message
exports.sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    // TOXICITY CHECK
    if (detectToxicity(content)) {
        return res.status(400).json({ message: "Message blocked: Content contains toxic or offensive language." });
    }

    let media = null;

    // Handle file upload if present
    if (req.files && req.files.length > 0) {
        // ... (rest of media handling same)
        const file = req.files[0];
        let type = 'file';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype.startsWith('video/')) type = 'video';
        else if (file.mimetype.startsWith('audio/')) type = 'audio';

        const protocol = req.protocol;
        const host = req.get("host");
        media = {
            url: file.path,
            type: type
        };
    }

    if (!content && !media) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user.id, // Auth middleware should populate req.user
        content: content,
        chat: chatId,
        media: media
    };

    try {
        var message = await Message.create(newMessage);

        message = await message.populate("sender", "name profilePicture");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name profilePicture email",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        // Ensure socket io is available
        const io = req.app.get("io");
        if (io) {
            // Emit to the chat room
            // The room name should be the chatId
            io.to(chatId).emit("message received", message);
        }

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// Delete for everyone (only sender can do this)
exports.deleteMessageForEveryone = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.sender.toString() !== req.user.id) {
            return res.status(401).json({ message: "Only sender can delete for everyone" });
        }

        await Message.findByIdAndDelete(req.params.id);

        res.json({ message: "Message deleted for everyone" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// Delete for me (any member can do this)
exports.deleteMessageForMe = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Add user to deletedFor array if not already there
        if (!message.deletedFor.includes(req.user.id)) {
            message.deletedFor.push(req.user.id);
            await message.save();
        }

        res.json({ message: "Message deleted for me" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// Clear all messages in a chat (e.g. for deleting a group or just clearing history)
// NOTE: This currently deletes messages for everyone.
exports.deleteAllMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Check if user is part of the chat or admin (optional but recommended)
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Simple check: is user a member?
        const isMember = chat.users.some(u => u.toString() === req.user.id);
        if (!isMember) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await Message.deleteMany({ chat: chatId });

        // Update chat's latestMessage to null
        await Chat.findByIdAndUpdate(chatId, { latestMessage: null });

        res.json({ message: "Chat cleared successfully" });
    } catch (error) {
        res.status(500);
        throw new Error(error.message);
    }
};

