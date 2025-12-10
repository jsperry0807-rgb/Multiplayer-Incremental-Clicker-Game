import { getCacheEntries, persistAll } from "./playerCache.js";
import { getDB } from "./db.js";

export default function startGameLoop(io) {
  // CPS tick every second
  setInterval(async () => {
    const updates = [];

    for (const [id, player] of getCacheEntries()) {
      // Calculate CPS with potential multipliers
      const baseCPS = player.cps || 0;
      const cpsMultiplier = player.cpsMultiplier || 1;
      const earnings = baseCPS * cpsMultiplier;

      player.money += earnings;
      player.totalEarned = (player.totalEarned || 0) + earnings;

      updates.push({ id, earnings });
    }

    // Broadcast updates
    if (updates.length > 0) {
      // Send individual updates
      updates.forEach(({ id, earnings }) => {
        io.to(id).emit("cpsTick", { earnings });
      });

      // Broadcast public data
      const publicData = {};
      for (const [id, player] of getCacheEntries()) {
        publicData[id] = {
          money: Math.floor(player.money),
          cps: player.cps,
          upgrades: player.upgrades || [],
          isOnline: player.isOnline || false,
        };
      }

      io.emit("updateAll", publicData);
    }
  }, 1000);

  // Auto-save to database every 30 seconds
  setInterval(async () => {
    try {
      await persistAll();
      console.log(
        `💾 Auto-saved ${
          Array.from(getCacheEntries()).length
        } players to database`
      );
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, 30000);

  // Update leaderboard every minute
  setInterval(async () => {
    try {
      const db = getDB();
      const topPlayers = await db
        .collection("players")
        .find({})
        .sort({ money: -1 })
        .limit(10)
        .toArray();

      const leaderboard = topPlayers.map((p, index) => ({
        rank: index + 1,
        id: p._id,
        money: p.money,
        cps: p.cps,
        displayName: p._id.substring(0, 8),
        isOnline: p.isOnline || false,
      }));

      io.emit("leaderboardUpdate", leaderboard);
    } catch (error) {
      console.error("Leaderboard update failed:", error);
    }
  }, 60000);

  // Cleanup inactive players every hour
  setInterval(async () => {
    try {
      const db = getDB();
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      const result = await db.collection("players").deleteMany({
        lastSeen: { $lt: cutoff },
        money: { $lt: 1000 }, // Only delete low-value inactive players
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} inactive players`);
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }, 3600000);
}
