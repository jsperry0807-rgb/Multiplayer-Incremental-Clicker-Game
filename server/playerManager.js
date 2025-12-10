// server/playerManager.js
import { getDB } from "./db.js";

const COLLECTION = "players";

export async function savePlayer(id, playerData) {
  try {
    const db = getDB();
    await db
      .collection(COLLECTION)
      .updateOne({ _id: id }, { $set: playerData }, { upsert: true });
    return true;
  } catch (error) {
    console.error("Error saving player:", error);
    return false;
  }
}

export async function loadPlayer(id) {
  try {
    const db = getDB();
    const player = await db.collection(COLLECTION).findOne({ _id: id });
    return player;
  } catch (error) {
    console.error("Error loading player:", error);
    return null;
  }
}

export async function getAllPlayers() {
  try {
    const db = getDB();
    const all = await db.collection(COLLECTION).find({}).toArray();
    const publicData = {};

    all.forEach((p) => {
      publicData[p._id] = {
        money: p.money || 0,
        cps: p.cps || 0,
        upgrades: p.upgrades || [],
      };
    });

    return publicData;
  } catch (error) {
    console.error("Error getting all players:", error);
    return {};
  }
}

export async function calculateOfflineProgress(id, lastSeen) {
  const player = await loadPlayer(id);
  if (!player || !lastSeen) return player;

  const now = Date.now();
  const offlineSeconds = (now - lastSeen) / 1000;

  // Calculate offline earnings (capped at 24 hours)
  const maxOfflineTime = 24 * 60 * 60; // 24 hours in seconds
  const effectiveTime = Math.min(offlineSeconds, maxOfflineTime);

  player.money += player.cps * effectiveTime;
  player.lastSeen = now;

  await savePlayer(id, player);
  return player;
}
