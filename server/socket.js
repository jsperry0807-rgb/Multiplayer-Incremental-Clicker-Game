import { getDB } from "./db.js";
import { getLeaderboard } from "./leaderboards.js";
import {
  getPlayer,
  setPlayer,
  persistAll,
  removePlayer,
} from "./playerCache.js";
import * as playersDB from "./playerManager.js";
import upgrades, { getAvailableUpgrades } from "./upgrades.js";

// Track online players
const onlinePlayers = new Set();

export default function socketHandlers(socket, io) {
  // Validate and get player ID
  let playerId = socket.handshake.query.id;
  if (!playerId || typeof playerId !== "string" || playerId.length > 100) {
    playerId = crypto.randomUUID();
    socket.emit("assignId", playerId);
  }

  console.log(`Player ${playerId.substring(0, 8)} connected`);
  onlinePlayers.add(playerId);

  (async () => {
    try {
      let player = await playersDB.loadPlayer(playerId);
      if (!player) {
        player = {
          money: 0,
          cps: 0,
          upgrades: [],
          totalClicks: 0,
          playtime: 0,
          achievements: [],
          createdAt: Date.now(),
          lastSeen: Date.now(),
        };
      }

      // Initialize missing fields
      const defaults = {
        money: 0,
        cps: 0,
        upgrades: [],
        totalClicks: 0,
        playtime: 0,
        achievements: [],
        createdAt: player.createdAt || Date.now(),
        lastSeen: Date.now(),
        clickMultiplier: 1,
        goldenClickChance: 0,
        offlineMultiplier: 1,
      };

      player = { ...defaults, ...player };

      // Calculate offline earnings
      let offlineEarnings = 0;
      let offlineTime = 0;
      if (player.lastSeen) {
        const timeOfflineSeconds = (Date.now() - player.lastSeen) / 1000;
        const maxOfflineTime = 24 * 60 * 60 * (player.offlineMultiplier || 1);
        offlineTime = Math.min(timeOfflineSeconds, maxOfflineTime);

        offlineEarnings =
          player.cps * offlineTime * (player.offlineMultiplier || 1);
        if (offlineEarnings > 0) {
          player.money += offlineEarnings;
          socket.emit("offlineEarnings", {
            earnings: offlineEarnings,
            timeOffline: offlineTime * 1000,
            capped: timeOfflineSeconds > maxOfflineTime,
          });
        }
      }

      player.lastSeen = Date.now();
      player.isOnline = true;

      // Save and cache
      await playersDB.savePlayer(playerId, player);
      setPlayer(playerId, player);

      // Send initial data with available upgrades
      const availableUpgrades = getAvailableUpgrades(player.upgrades);

      socket.emit("init", {
        money: player.money,
        cps: player.cps,
        upgrades: player.upgrades,
        availableUpgrades: availableUpgrades,
        stats: {
          totalClicks: player.totalClicks,
          playtime: player.playtime,
          rank: await calculateRank(playerId),
        },
      });

      // Broadcast updated player list
      broadcastPlayerList(io);
    } catch (err) {
      console.error("Error initializing player:", err);
      socket.emit("error", "Failed to load player data");
    }
  })();

  // Enhanced click handler with multipliers
  socket.on("click", async () => {
    const player = getPlayer(playerId);
    if (!player) return;

    // Base click value
    let clickValue = 1 * (player.clickMultiplier || 1);

    // Check for golden click
    if (player.goldenClickChance && Math.random() < player.goldenClickChance) {
      clickValue *= 10;
      socket.emit("specialEffect", { type: "goldenClick", value: clickValue });
    }

    player.money += clickValue;
    player.totalClicks = (player.totalClicks || 0) + 1;
    setPlayer(playerId, player);

    // Emit click feedback
    socket.emit("clickFeedback", { value: clickValue });
  });

  // Enhanced upgrade purchase with validation
  socket.on("buyUpgrade", async (upgradeId) => {
    if (typeof upgradeId !== "string") {
      socket.emit("error", "Invalid upgrade ID");
      return;
    }

    const player = getPlayer(playerId);
    if (!player) {
      socket.emit("error", "Player not found");
      return;
    }

    const upgrade = upgrades[upgradeId];
    if (!upgrade) {
      socket.emit("error", "Invalid upgrade");
      return;
    }

    // Check requirements
    if (upgrade.requires) {
      const missingRequirements = upgrade.requires.filter(
        (req) => !player.upgrades.includes(req)
      );
      if (missingRequirements.length > 0) {
        socket.emit(
          "error",
          `Missing requirements: ${missingRequirements.join(", ")}`
        );
        return;
      }
    }

    // Check max owned
    if (upgrade.maxOwned) {
      const ownedCount = player.upgrades.filter(
        (id) => id === upgradeId
      ).length;
      if (ownedCount >= upgrade.maxOwned) {
        socket.emit(
          "error",
          `You can only own ${upgrade.maxOwned} of this upgrade`
        );
        return;
      }
    }

    if (player.money < upgrade.cost) {
      socket.emit("error", "Not enough money");
      return;
    }

    if (player.upgrades.includes(upgradeId) && !upgrade.maxOwned) {
      socket.emit("error", "You already own this upgrade!");
      return;
    }

    // Apply upgrade effects
    player.money -= upgrade.cost;
    player.upgrades.push(upgradeId);

    if (upgrade.type === "generator") {
      player.cps += upgrade.cps;
    } else if (upgrade.type === "multiplier") {
      player.clickMultiplier =
        (player.clickMultiplier || 1) * upgrade.multiplier;
    } else if (upgrade.type === "special") {
      if (upgrade.effect === "goldenClick") {
        player.goldenClickChance =
          (player.goldenClickChance || 0) + upgrade.chance;
      }
    }

    setPlayer(playerId, player);

    // Get new available upgrades
    const availableUpgrades = getAvailableUpgrades(player.upgrades);

    socket.emit("upgradeBought", {
      upgradeId,
      upgradeName: upgrade.name,
      newMoney: player.money,
      newCPS: player.cps,
      availableUpgrades,
    });

    // Check for achievements
    checkAchievements(io, playerId, player);
  });

  // Get leaderboard with time filter
  // server/socket.js - Update getLeaderboard handler
  socket.on("getLeaderboard", async (filter = {}) => {
    try {
      // Get leaderboard
      const leaderboard = await getLeaderboard(10, filter.time);
      socket.emit("leaderboardUpdate", leaderboard);

      // Get your rank WITH player data
      const myRankData = await calculateRank(playerId);
      socket.emit("myRank", myRankData);

    } catch (error) {
      console.error("Error getting leaderboard:", error);
      socket.emit("error", "Failed to load leaderboard");
    }
  });


  
  // Get available upgrades
  socket.on("getUpgrades", async () => {
    const player = getPlayer(playerId);
    if (player) {
      const available = getAvailableUpgrades(player.upgrades);
      socket.emit("upgradesList", available);
    }
  });

  // Periodic playtime update
  const playtimeInterval = setInterval(() => {
    const player = getPlayer(playerId);
    if (player) {
      player.playtime = (player.playtime || 0) + 1;
      setPlayer(playerId, player);
    }
  }, 1000);

  // Disconnect handler
  socket.on("disconnect", async () => {
    clearInterval(playtimeInterval);

    const player = getPlayer(playerId);
    if (player) {
      player.isOnline = false;
      player.lastSeen = Date.now();
      await playersDB.savePlayer(playerId, player);
      removePlayer(playerId);
    }

    onlinePlayers.delete(playerId);
    broadcastPlayerList(io);
    console.log(`Player ${playerId.substring(0, 8)} disconnected`);
  });

  socket.on("getUpgrades", async () => {
    const player = getPlayer(playerId);
    if (player) {
      const availableUpgrades = getAvailableUpgrades(player.upgrades || []);
      socket.emit("upgradesList", availableUpgrades);
    }
  });

  // Broadcast player list to all
  function broadcastPlayerList(io) {
    const onlineList = Array.from(onlinePlayers);
    io.emit("playersOnline", onlineList.length);
  }
}

// server/socket.js - Update calculateRank function
async function calculateRank(playerId) {
  try {
    const db = getDB();
    const allPlayers = await db
      .collection("players")
      .find({})
      .sort({ money: -1 })
      .toArray();

    const playerIndex = allPlayers.findIndex(p => p._id === playerId);
    const rank = playerIndex !== -1 ? playerIndex + 1 : allPlayers.length + 1;

    // Get the actual player data from cache or database
    let playerData = getPlayer(playerId);

    // If not in cache, load from database
    if (!playerData) {
      playerData = await db.collection("players").findOne({ _id: playerId });
    }

    // Return complete data
    return {
      rank,
      total: allPlayers.length,
      money: playerData?.money || 0,
      cps: playerData?.cps || 0,
      upgrades: playerData?.upgrades || [],
      // Include other fields you might need
      totalClicks: playerData?.totalClicks || 0,
      playtime: playerData?.playtime || 0
    };
  } catch (error) {
    console.error("Error calculating rank:", error);
    return {
      rank: "--",
      total: 0,
      money: 0,
      cps: 0,
      upgrades: []
    };
  }
}

function checkAchievements(io, playerId, player) {
  const achievements = [
    {
      id: "firstUpgrade",
      condition: (p) => p.upgrades.length >= 1,
      name: "First Purchase",
    },
    { id: "rich", condition: (p) => p.money >= 1000, name: "Thousandaire" },
    {
      id: "clicker",
      condition: (p) => p.totalClicks >= 100,
      name: "Click Master",
    },
    { id: "generator", condition: (p) => p.cps >= 10, name: "Auto Generator" },
  ];

  for (const achievement of achievements) {
    if (
      !player.achievements.includes(achievement.id) &&
      achievement.condition(player)
    ) {
      player.achievements.push(achievement.id);
      io.to(playerId).emit("achievement", achievement);
    }
  }
}
