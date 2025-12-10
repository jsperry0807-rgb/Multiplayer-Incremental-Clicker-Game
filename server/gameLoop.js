// server/gameLoop.js
import {
  getAllPlayersCache,
  getCacheEntries,
  persistAll,
} from "./playerCache.js";
import * as playersDB from "./playerManager.js";

export default function startGameLoop(io) {
  // CPS tick every 1s
  setInterval(async () => {
    for (const [id, player] of getCacheEntries()) {
      player.money += player.cps; // add CPS
    }

    // Broadcast to all clients
    const publicData = {};
    for (const [id, player] of getCacheEntries()) {
      publicData[id] = {
        money: player.money,
        cps: player.cps,
        upgrades: player.upgrades || [],
      };
    }

    if (Object.keys(publicData).length > 0) {
      io.emit("updateAll", publicData);
    }
  }, 1000);

  // Persist to DB every 5s
  setInterval(async () => {
    await persistAll();
  }, 5000);
}
