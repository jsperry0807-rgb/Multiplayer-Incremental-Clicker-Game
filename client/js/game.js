import { socket, player as playerRef } from "./globals.js";

const clickBtn = document.getElementById("clickBtn");
const moneyEl = document.getElementById("money");

// State management
let localMoney = 0;
let localCPS = 0;
let lastDisplayedMoney = -1; // Track last displayed value
let lastDisplayedCPS = -1; // Track last displayed CPS

// Load from localStorage
const savedMoney = localStorage.getItem("localMoney");
if (savedMoney) {
  localMoney = parseFloat(savedMoney);
  updateMoneyDisplay(); // Initial display
}

// Optimized UI update functions
function updateMoneyDisplay() {
  const flooredMoney = Math.floor(localMoney);
  if (flooredMoney !== lastDisplayedMoney) {
    moneyEl.innerText = flooredMoney;
    lastDisplayedMoney = flooredMoney;
  }
}

function updateCPSDisplay() {
  // Optional: if you have a CPS display element
  const cpsEl = document.getElementById("cps");
  if (cpsEl && localCPS !== lastDisplayedCPS) {
    cpsEl.textContent = `CPS: ${localCPS.toFixed(1)}`;
    lastDisplayedCPS = localCPS;
  }
}

// Click handler
clickBtn.onclick = () => {
  localMoney++;
  updateMoneyDisplay();
  socket.emit("click");
  localStorage.setItem("localMoney", localMoney);
};

// Smooth CPS animation (throttled updates)
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 50; // Update every 50ms for smoother animation

function smoothCPSUpdate(timestamp) {
  if (timestamp - lastUpdateTime >= UPDATE_INTERVAL) {
    localMoney += localCPS / (1000 / UPDATE_INTERVAL); // Adjust for actual time passed
    updateMoneyDisplay();
    localStorage.setItem("localMoney", localMoney);
    lastUpdateTime = timestamp;
  }
  requestAnimationFrame(smoothCPSUpdate);
}

// Use requestAnimationFrame for smoother, synchronized updates
requestAnimationFrame(smoothCPSUpdate);

// Socket event handlers
socket.on("init", (playerData) => {
  localMoney = playerData.money;
  localCPS = playerData.cps;
  updateMoneyDisplay();
  updateCPSDisplay();
  playerRef.data = playerData;
});

socket.on("updateAll", (allPlayers) => {
  const playerId = localStorage.getItem("playerId");
  if (!playerId || !allPlayers[playerId]) return;

  const me = allPlayers[playerId];

  // Only update if values actually changed
  const moneyChanged = me.money !== localMoney;
  const cpsChanged = me.cps !== localCPS;

  if (moneyChanged || cpsChanged) {
    localMoney = me.money;
    localCPS = me.cps;

    if (moneyChanged) updateMoneyDisplay();
    if (cpsChanged) updateCPSDisplay();

    playerRef.data = me;
  }
});

socket.on("upgradeBought", (data) => {
  console.log("Bought upgrade:", data.upgradeId);
});

socket.on("error", (message) => {
  console.error("Server error:", message);
});

socket.on("assignId", (newId) => {
  localStorage.setItem("playerId", newId);
  console.log("Assigned new player ID:", newId);
});

socket.on("offlineEarnings", (data) => {
  const hours = Math.floor(data.timeOffline / (1000 * 60 * 60));
  const minutes = Math.floor(
    (data.timeOffline % (1000 * 60 * 60)) / (1000 * 60)
  );

  // Update local money with offline earnings
  localMoney += data.earnings;
  updateMoneyDisplay();

  console.log(
    `Offline earnings: ${Math.floor(
      data.earnings
    )} coins (${hours}h ${minutes}m offline)`
  );
});
