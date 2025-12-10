import { savePlayer } from "./playerManager.js";

const cache = new Map();

export function getPlayer(id) {
  return cache.get(id);
}

export function setPlayer(id, data) {
  cache.set(id, data);
}

export function removePlayer(id) {
  cache.delete(id);
}

export async function getAllPlayersCache() {
  return Array.from(cache);
}

export async function persistAll() {
  for (const [id, player] of cache.entries()) {
    await savePlayer(id, player);
  }
}

export function getCacheEntries() {
  return cache.entries();
}
