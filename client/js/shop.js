import { socket } from "./globals.js";

const moneyEl = document.getElementById("money");
const cpsEl = document.getElementById("cps");
const upgradesGrid = document.getElementById("upgradesGrid");
const ownedUpgrades = document.getElementById("ownedUpgrades");

let playerData = {
  money: 0,
  cps: 0,
  upgrades: [],
};

// Load upgrades from server
socket.on("init", (data) => {
  playerData = data;
  updateUI();
  // Request available upgrades from server
  socket.emit("getUpgrades");
});

socket.on("upgradesList", (upgrades) => {
  renderUpgrades(upgrades);
});

socket.on("updatePlayer", (data) => {
  playerData = { ...playerData, ...data };
  updateUI();
});

socket.on("upgradeBought", (data) => {
  playerData.money = data.newMoney;
  playerData.cps = data.newCPS;
  playerData.upgrades.push(data.upgradeId);
  updateUI();
  
  // Show notification
  const upgradeName = data.upgradeName || data.upgradeId;
  showNotification(`Purchased ${upgradeName} successfully!`, "success");
  
  // Request updated upgrades list
  socket.emit("getUpgrades");
});

function updateUI() {
  moneyEl.textContent = Math.floor(playerData.money).toLocaleString();
  cpsEl.textContent = playerData.cps.toFixed(1);
  renderOwnedUpgrades();
}

function renderUpgrades(upgrades) {
  upgradesGrid.innerHTML = "";

  if (!upgrades || upgrades.length === 0) {
    upgradesGrid.innerHTML = '<p class="empty">No upgrades available yet!</p>';
    return;
  }

  upgrades.forEach((upgrade) => {
    const isOwned = playerData.upgrades.includes(upgrade.id);
    const canAfford = playerData.money >= upgrade.cost;

    const upgradeCard = document.createElement("div");
    upgradeCard.className = `upgrade-card ${isOwned ? "owned" : ""} ${
      canAfford && !isOwned ? "affordable" : ""
    }`;

    upgradeCard.innerHTML = `
            <div class="upgrade-header">
                <h3>${upgrade.name}</h3>
                <span class="upgrade-tier">Tier ${upgrade.tier || 1}</span>
            </div>
            <p class="upgrade-desc">${upgrade.description}</p>
            <div class="upgrade-stats">
                <span class="stat"><i class="fas fa-plus"></i> ${
                  upgrade.cps
                } CPS</span>
                <span class="stat"><i class="fas fa-coins"></i> ${upgrade.cost.toLocaleString()} coins</span>
            </div>
            <button class="buy-btn" ${isOwned ? "disabled" : ""} 
                ${!canAfford && !isOwned ? "disabled" : ""}>
                ${isOwned ? "Owned ✓" : "Buy Now"}
            </button>
        `;

    const buyBtn = upgradeCard.querySelector(".buy-btn");
    if (!isOwned && canAfford) {
      buyBtn.addEventListener("click", () => {
        socket.emit("buyUpgrade", upgrade.id);
      });
    }

    upgradesGrid.appendChild(upgradeCard);
  });
}

function renderOwnedUpgrades() {
  ownedUpgrades.innerHTML =
    playerData.upgrades.length > 0
      ? playerData.upgrades
          .map((id) => `<span class="owned-tag">${id}</span>`)
          .join("")
      : '<p class="empty">No upgrades purchased yet!</p>';
}

function showNotification(message, type = "info") {
  // Create and show notification
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Request upgrades list on page load
socket.emit("getUpgrades");

// Handle connection errors
socket.on("error", (message) => {
  console.error("Shop error:", message);
  showNotification(`Error: ${message}`, "error");
});
