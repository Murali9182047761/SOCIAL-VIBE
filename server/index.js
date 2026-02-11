const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
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
  "https://social-vibe-two.vercel.app"
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, "");

  // exact match
  if (allowedOrigins.some(o => o.replace(/\/$/, "") === normalizedOrigin)) {
    return true;
  }

  // allow all vercel preview + production domains
  if (normalizedOrigin.endsWith(".vercel.app")) {
    return true;
  }

  return false;
};

// ===== SOCKET.IO =====
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.log("Socket.io CORS Rejected Origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

// ===== MIDDLEWARE =====
app.use(express.json());

app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log("Express CORS Rejected Origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

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

  socket.on("join chat", (room) => socket.join(room));
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // ===== CALL EVENTS =====
  socket.on("callUser", ({ userToCall, signalData, from, name, type }) => {
    console.log(`Calling user ${userToCall} from ${from} (type: ${type})`);
    io.to(userToCall).emit("callUser", { signal: signalData, from, name, type });
  });

  socket.on("answerCall", (data) => {
    console.log(`Answering call to ${data.to}`);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("endCall", ({ to }) => {
    console.log(`Ending call to ${to}`);
    io.to(to).emit("callEnded");
  });

  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;
    if (!chat.users) return;

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

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("Backend working 🚀");
});

// ===== START SERVER =====
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ===== MONGODB =====
mongoose
  .connect(process.env.MONGO_URI || process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));
