const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const users = {};

io.on("connection", (socket) => {
  console.log("a user connected: ", socket.id);

  socket.on("join-room", (roomId) => {
    if (!users[roomId]) {
      users[roomId] = [];
    }
    users[roomId].push(socket.id);
    const otherUsers = users[roomId].filter((id) => id !== socket.id);

    otherUsers.forEach((userId) => {
      io.to(userId).emit("user-connected", socket.id);
    });

    socket.on("send-signal", (payload) => {
      io.to(payload.userToSignal).emit("user-joined", {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on("return-signal", (payload) => {
      io.to(payload.callerID).emit("received-returned-signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on("disconnect", () => {
      users[roomId] = users[roomId].filter((id) => id !== socket.id);
      socket.broadcast.emit("user-disconnected", socket.id);
    });
  });
});

server.listen(8000, () => {
  console.log("listening on *:8000");
});
