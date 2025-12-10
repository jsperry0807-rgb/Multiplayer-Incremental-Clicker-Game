import { getPlayer, setPlayer, persistAll, removePlayer } from "./playerCache.js";
import * as playersDB from "./playerManager.js";
import upgrades from "./upgrades.js";

export default function socketHandlers(socket, io) {
  let playerId = socket.handshake.query.id; // client sends persistent UUID
  if (!playerId) {
    playerId = crypto.randomUUID();
    socket.emit("assignId", playerId); // tell client their ID
  }

  (async () => {
    try {
      let player = await playersDB.loadPlayer(playerId);
      if (!player) {
        player = { money: 0, cps: 0, upgrades: [] };
      }
      setPlayer(playerId, player);

      socket.emit("init", player);

      const allPlayers = await playersDB.getAllPlayers();
      io.emit("updateAll", allPlayers);
    } catch (err) {
      console.error("Error initializing player:", err);
    }
  })();

  socket.on("click", async () => {
    const player = getPlayer(playerId);
    if (!player) return;
    player.money++;
    setPlayer(playerId, player);
  });

  socket.on("buyUpgrade", async (upgradeId) => {
    const player = getPlayer(playerId);
    if (!player) return;

    const upgrade = upgrades[upgradeId];
    if (!upgrade) {
      socket.emit("error", "Invalid upgrade");
      return;
    }

    if (player.money < upgrade.cost) {
      socket.emit("error", "Not enough money");
      return;
    }

    // Prevent duplicate purchases
    if (player.upgrades.includes(upgradeId)) {
      socket.emit("error", "You already own this upgrade!");
      return;
    }

    player.money -= upgrade.cost;
    player.cps += upgrade.cps;
    player.upgrades.push(upgradeId);
    setPlayer(playerId, player);

    // Send confirmation
    socket.emit("upgradeBought", {
      upgradeId,
      newMoney: player.money,
      newCPS: player.cps,
    });
  });

  socket.on("disconnect", async () => {
    const player = getPlayer(playerId);
    if (player) {
      await playersDB.savePlayer(playerId, player);
      removePlayer(playerId);
    }
  });
}
