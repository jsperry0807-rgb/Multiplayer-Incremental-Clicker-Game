import { socket, player as playerRef } from "./globals.js";

const clickBtn = document.getElementById("clickBtn");
const moneyEl = document.getElementById("money");

let localMoney = 0;
let localCPS = 0;

const savedMoney = localStorage.getItem("localMoney");
if (savedMoney) {
  localMoney = parseFloat(savedMoney);
  moneyEl.innerText = Math.floor(localMoney);
}

clickBtn.onclick = () => {
  localMoney++;
  moneyEl.innerText = localMoney;
  socket.emit("click");

  localStorage.setItem("localMoney", localMoney);
};

// Smooth CPS animation
setInterval(() => {
  localMoney += localCPS / 10;
  moneyEl.innerText = Math.floor(localMoney);
  localStorage.setItem("localMoney", localMoney);
}, 100);

socket.on("init", (playerData) => {
  localMoney = playerData.money;
  localCPS = playerData.cps;
  moneyEl.innerText = Math.floor(localMoney);
  playerRef.data = playerData;
});

socket.on("updateAll", (allPlayers) => {
  const playerId = localStorage.getItem("playerId");
  if (!playerId || !allPlayers[playerId]) return;

  const me = allPlayers[playerId];

  localCPS = me.cps;

  localMoney = me.money;

  moneyEl.innerText = Math.floor(localMoney);
  playerRef.data = me;
});

socket.on("upgradeBought", (data) => {
  console.log("Bought upgrade:", data.upgradeId);
  // You can update UI here if needed
});

socket.on("error", (message) => {
  console.error("Server error:", message);
  alert("Error: " + message);
});

socket.on("assignId", (newId) => {
  localStorage.setItem("playerId", newId);
  console.log("Assigned new player ID:", newId);
});
