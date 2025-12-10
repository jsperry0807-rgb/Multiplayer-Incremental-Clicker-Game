import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import socketHandlers from "./socket.js";
import { connect, getDB } from "./db.js";
import startGameLoop from "./gameLoop.js";
import { getAllPlayersCache } from "./playerCache.js";

await connect();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("client"));

// multipage routes (optional)
app.get("/", (_, res) => res.sendFile("index.html", { root: "./client" }));
app.get("/game", (_, res) => res.sendFile("game.html", { root: "./client" }));
app.get("/shop", (_, res) => res.sendFile("shop.html", { root: "./client" }));

// Add to server/server.js before starting server
app.get("/debug/players", async (_, res) => {
  try {
    const db = getDB();
    const players = await db.collection("players").find({}).toArray();
    res.json({
      dbCount: players.length,
      cacheCount: getAllPlayersCache
        ? Object.keys(getAllPlayersCache()).length
        : 0,
      players: players,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on("connection", (socket) => socketHandlers(socket, io));

startGameLoop(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
