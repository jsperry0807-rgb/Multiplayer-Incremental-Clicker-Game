import { socket } from "./globals.js";

const leaderboardList = document.getElementById("leaderboardList");
const myStats = document.getElementById("myStats");
const timeButtons = document.querySelectorAll(".time-btn");
let currentPlayerRank = null;

// Load leaderboard on page load
socket.on("leaderboardUpdate", (leaderboard) => {
  renderLeaderboard(leaderboard);
});

socket.on("myRank", (data) => {
  currentPlayerRank = data;
  renderMyStats(data);
});

// Time filter buttons
timeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    timeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    socket.emit("getLeaderboard", { time: btn.dataset.time });
  });
});

function renderLeaderboard(leaderboard) {
  leaderboardList.innerHTML = "";

  leaderboard.forEach((player, index) => {
    const isCurrentPlayer = player.id === localStorage.getItem("playerId");
    const row = document.createElement("div");
    row.className = `table-row ${isCurrentPlayer ? "current-player" : ""} ${
      index < 3 ? `rank-${index + 1}` : ""
    }`;

    row.innerHTML = `
            <div class="rank-col">
                ${
                  index === 0
                    ? "👑"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : index + 1
                }
            </div>
            <div class="player-col">
                <div class="player-info">
                    <span class="player-name">${
                      player.displayName ||
                      `Player ${player.id.substring(0, 6)}`
                    }</span>
                    ${
                      player.isOnline
                        ? '<span class="online-indicator" title="Online"></span>'
                        : ""
                    }
                </div>
            </div>
            <div class="coins-col">${Math.floor(
              player.money
            ).toLocaleString()}</div>
            <div class="cps-col">${player.cps.toFixed(1)}</div>
        `;

    leaderboardList.appendChild(row);
  });
}

function renderMyStats(data) {
  // Handle null/undefined data
  if (!data) data = {};
  
  // Use nullish coalescing and optional chaining
  const rank = data.rank ?? "--";
  const money = data.money ?? 0;
  const cps = data.cps ?? 0;
  const upgrades = data.upgrades ?? [];
  
  myStats.innerHTML = `
    <h3><i class="fas fa-user"></i> Your Position</h3>
    <div class="my-rank">Rank #${rank}</div>
    <div class="my-stats-grid">
      <div class="stat-item">
        <span class="stat-label">Coins</span>
        <span class="stat-value">${Math.floor(Number(money)).toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">CPS</span>
        <span class="stat-value">${Number(cps).toFixed(1)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Upgrades</span>
        <span class="stat-value">${upgrades.length}</span>
      </div>
    </div>
  `;
}

// Request initial leaderboard
socket.emit("getLeaderboard", { time: "all" });
