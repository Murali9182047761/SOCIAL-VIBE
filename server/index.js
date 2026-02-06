const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  },
});

app.set("io", io);



app.use(express.json());
app.use(cors());
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// Routes
app.use("/api/auth", require("./Routes/authRoutes"));
app.use("/api/user", require("./Routes/userRoutes"));
app.use("/api/posts", require("./Routes/postRoutes"));
app.use("/api/stories", require("./Routes/storyRoutes"));
app.use("/api/messages", require("./Routes/messageRoutes"));
app.use("/api/chat", require("./Routes/chatRoutes"));
app.use("/api/notifications", require("./Routes/notificationRoutes"));
app.use("/api/search", require("./Routes/searchRoutes"));
app.use("/api/analytics", require("./Routes/analyticsRoutes"));

// Socket.io
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
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (String(user._id) === String(newMessageRecieved.sender._id)) return;

      socket.in(user._id).emit("message received", newMessageRecieved);
    });
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
    io.emit("get-users", onlineUsers);
    console.log("USER DISCONNECTED");
  });
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend working 🚀");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const Post = require("./models/Post");

    console.log("\x1b[32m%s\x1b[0m", "MongoDB connected");
    server.listen(PORT, () => {
      console.log("\x1b[32m%s\x1b[0m", `Server running on port ${PORT}`);
    });

    // CHECK FOR SCHEDULED POSTS EVERY 30 SECONDS
    setInterval(async () => {
      try {
        const now = new Date();
        const postsToPublish = await Post.find({
          status: "scheduled",
          scheduledAt: { $lte: now }
        });

        if (postsToPublish.length > 0) {
          console.log(`Found ${postsToPublish.length} posts to publish.`);
          for (const post of postsToPublish) {
            post.status = "published";
            post.scheduledAt = undefined; // Clear schedule
            await post.save();

            // Notify clients
            io.emit("new-post", post);
            console.log(`Published post ${post._id}`);
          }
        }
      } catch (err) {
        console.error("Error checking scheduled posts:", err);
      }
    }, 30000); // 30 seconds
  })
  .catch((err) => {
    console.error("\x1b[31m%s\x1b[0m", "MongoDB connection failed: " + err.message);
  });
