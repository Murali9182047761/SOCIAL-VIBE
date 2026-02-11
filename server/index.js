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

  socket.on("ringing", (data) => {
    console.log(`Relaying ringing status to ${data.to}`);
    io.to(data.to).emit("ringing");
  });

  socket.on("endCall", ({ to }) => {
    console.log(`Ending call to ${to}`);
    io.to(to).emit("callEnded");
  });

  // ===== NEW: GROUP CALL EVENTS =====
  socket.on("joining group call", (roomID) => {
    const callRoomID = `video_call_${roomID}`;
    console.log(`User ${socket.id} joining group call room: ${callRoomID}`);
    socket.join(callRoomID);

    // Get all users in the room except the current user
    const clients = io.sockets.adapter.rooms.get(callRoomID);
    const usersInRoom = clients ? Array.from(clients).filter(id => id !== socket.id) : [];

    socket.emit("all users in call", usersInRoom);
  });

  socket.on("sending-signal", (payload) => {
    console.log(`Relaying signal from ${payload.callerID} to ${payload.userToSignal}`);
    io.to(payload.userToSignal).emit('user joined call', {
      signal: payload.signal,
      callerID: payload.callerID,
      userName: payload.userName
    });
  });

  socket.on("returning-signal", (payload) => {
    console.log(`Returning signal from ${socket.id} to ${payload.callerID}`);
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
      userName: payload.userName
    });
  });

  socket.on("start group call", (data) => {
    const { chatId, groupName, callerName, callerId, type, users } = data;
    console.log(`📡 Start Group Call: Chat=${chatId}, From=${callerName}(${callerId})`);

    if (users && Array.isArray(users)) {
      users.forEach((u) => {
        const targetId = String(typeof u === 'string' ? u : (u._id || u));
        if (targetId === String(callerId)) return;

        console.log(`   👉 Sending notification to user room: ${targetId}`);
        // Using io.to ensure it goes to all sockets of that user
        io.to(targetId).emit("incoming group call notification", {
          chatId,
          groupName,
          callerName,
          type
        });
      });
    }
  });

  socket.on("leaving group call", (roomID) => {
    const callRoomID = `video_call_${roomID}`;
    console.log(`User ${socket.id} leaving group call room: ${callRoomID}`);
    socket.leave(callRoomID);
    socket.to(callRoomID).emit("user left call", socket.id);
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
