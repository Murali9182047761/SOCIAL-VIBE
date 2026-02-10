const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ===== ALLOWED ORIGINS =====
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://social-vibe-two.vercel.app",
  "https://social-vibe-two.vercel.app/"
].filter(Boolean);

// ===== SOCKET.IO =====
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.some(o => o.replace(/\/$/, "") === origin.replace(/\/$/, ""))) {
        callback(null, true);
      } else {
        console.log("Socket.io CORS Rejected Origin:", origin);
        callback(new Error("CORS Not Allowed"));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

// ===== MIDDLEWARE =====
app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, "") === origin.replace(/\/$/, ""));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("Express CORS Rejected Origin:", origin);
      callback(new Error("CORS Not Allowed"));
    }
  },
  credentials: true,
}));

// app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// ===== ROUTES =====
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/stories", require("./routes/storyRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

// ===== SOCKET LOGIC =====
let onlineUsers = [];

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  socket.on("setup", (userData) => {
    socket.join(userData._id);

    if (!onlineUsers.some((u) => u.userId === userData._id)) {
      onlineUsers.push({ userId: userData._id, socketId: socket.id });
    }

    io.emit("get-users", onlineUsers);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (String(user._id) === String(newMessageRecieved.sender._id)) return;
      socket.in(user._id).emit("message received", newMessageRecieved);
    });
  });

  socket.on("delete message", (data) => {
    const { messageId, chatId } = data;
    socket.in(chatId).emit("message deleted", messageId);
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    io.emit("get-users", onlineUsers);
    console.log("USER DISCONNECTED");
  });
});

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("Backend working 🚀");
});

// ===== START SERVER =====
server.listen(PORT, () => {
  console.log("\x1b[32m%s\x1b[0m", `🚀 Server running on port ${PORT}`);
});

// ===== MONGODB =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("\x1b[32m%s\x1b[0m", "✅ MongoDB connected");

    // ===== SCHEDULED POSTS CHECK =====
    const Post = require("./models/Post");
    setInterval(async () => {
      try {
        const now = new Date();
        const postsToPublish = await Post.find({
          status: "scheduled",
          scheduledAt: { $lte: now }
        });

        if (postsToPublish.length > 0) {
          console.log(`📡 Publishing ${postsToPublish.length} scheduled posts.`);
          for (const post of postsToPublish) {
            post.status = "published";
            post.scheduledAt = undefined;
            await post.save();
            io.emit("new-post", post);
          }
        }
      } catch (err) {
        console.error("❌ Error checking scheduled posts:", err);
      }
    }, 30000);
  })
  .catch((err) => {
    console.error("\x1b[31m%s\x1b[0m", "❌ MongoDB connection failed: " + err.message);
    console.log("Tip: Check your MONGO_URI and IP Whitelist on MongoDB Atlas (allow 0.0.0.0/0)");
  });


