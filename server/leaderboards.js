import { getDB } from "./db.js";

export async function getLeaderboard(limit = 10, timeFilter = "all") {
  const db = getDB();

  let query = {};
  let sort = { money: -1 };

  // Apply time filters
  if (timeFilter === "daily") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    query.createdAt = { $gte: yesterday };
  } else if (timeFilter === "weekly") {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    query.createdAt = { $gte: lastWeek };
  }

  const topPlayers = await db
    .collection("players")
    .find(query)
    .sort(sort)
    .limit(limit)
    .toArray();

  return topPlayers.map((p, index) => ({
    rank: index + 1,
    id: p._id,
    money: p.money || 0,
    cps: p.cps || 0,
    upgrades: p.upgrades || [],
    playtime: p.playtime || 0,
    totalClicks: p.totalClicks || 0,
    isOnline: p.isOnline || false,
    displayName: generateDisplayName(p._id),
    achievements: p.achievements?.length || 0,
  }));
}

function generateDisplayName(id) {
  const names = [
    "Hero",
    "Legend",
    "Master",
    "Champion",
    "Warrior",
    "Wizard",
    "King",
    "Queen",
    "Ninja",
    "Samurai",
  ];
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${names[hash % names.length]}${id.substring(0, 4)}`;
}
