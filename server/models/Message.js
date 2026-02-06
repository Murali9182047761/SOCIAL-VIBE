const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
        },
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        media: {
            url: { type: String },
            type: { type: String }, // 'image', 'video', 'file'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model("Message", MessageSchema);

