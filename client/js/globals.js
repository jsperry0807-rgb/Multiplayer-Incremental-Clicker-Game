let playerId = localStorage.getItem("playerId");
if (!playerId) {
  playerId = crypto.randomUUID();
  localStorage.setItem("playerId", playerId);
}

export const socket = io({ query: { id: playerId } });

export const player = { data: null };
