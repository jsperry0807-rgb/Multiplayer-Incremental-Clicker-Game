import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import socketHandlers from "./socket.js";
import { connect, getDB } from "./db.js";
import startGameLoop from "./gameLoop.js";
import { getLeaderboard } from "./leaderboards.js";
import upgrades from "./upgrades.js";

await connect();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.static("client"));

// Routes
app.get("/", (_, res) => res.sendFile("index.html", { root: "./client" }));
app.get("/game", (_, res) => res.sendFile("game.html", { root: "./client" }));
app.get("/shop", (_, res) => res.sendFile("shop.html", { root: "./client" }));
app.get("/leaderboard", (_, res) =>
  res.sendFile("leaderboard.html", { root: "./client" })
);

// API Routes
app.get("/api/leaderboard", async (req, res) => {
  const time = req.query.time || "all";
  const leaderboard = await getLeaderboard(10, time);
  res.json(leaderboard);
});

app.get("/api/upgrades", (_, res) => {
  res.json(upgrades);
});

app.get("/api/player/:id", async (req, res) => {
  try {
    const db = getDB();
    const player = await db
      .collection("players")
      .findOne({ _id: req.params.id });

    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Return public data only
    const publicData = {
      id: player._id,
      money: player.money,
      cps: player.cps,
      upgrades: player.upgrades,
      totalClicks: player.totalClicks,
      playtime: player.playtime,
      achievements: player.achievements,
      displayName: player._id.substring(0, 8),
      isOnline: player.isOnline || false,
      createdAt: player.createdAt,
    };

    res.json(publicData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/debug/players", async (_, res) => {
  try {
    const db = getDB();
    const players = await db.collection("players").find({}).toArray();

    res.json({
      totalPlayers: players.length,
      onlinePlayers: players.filter((p) => p.isOnline).length,
      totalCoins: players.reduce((sum, p) => sum + (p.money || 0), 0),
      averageCPS:
        players.reduce((sum, p) => sum + (p.cps || 0), 0) / players.length,
      players: players.map((p) => ({
        id: p._id,
        money: p.money,
        cps: p.cps,
        isOnline: p.isOnline,
        lastSeen: p.lastSeen,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", (_, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Socket.IO
io.on("connection", (socket) => socketHandlers(socket, io));

// Start game loop
startGameLoop(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /api/leaderboard`);
  console.log(`   GET /api/upgrades`);
  console.log(`   GET /api/player/:id`);
  console.log(`   GET /api/debug/players`);
  console.log(`   GET /api/health`);
});
