// ============================================================================
// SERVER: REAL-TIME LOBBY SYNC, SLOT LOCKING & POWER-UP TICKS (< 90 LINES)
// ============================================================================
const http = require("http");
const path = require("path");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const roomManager = require("./roomManager");
const gameEngine = require("./gameEngine");

const PORT = process.env.PORT || 8080;
const ROOT_DIR = path.join(__dirname, "..", "Version 2");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const app = express();
app.use("/public", express.static(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));
app.use(express.static(ROOT_DIR));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let countdownTimer = null;

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
}
function broadcastRosterSync() {
  const players = roomManager.getRoster();
  broadcast({ type: "rosterSync", slots: roomManager.getSlotMap(), players });
  broadcast({ type: "roster", players });
}
function clearCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
}

function startSynchronizedCountdown() {
  const roster = roomManager.getRoster();
  if (roster.length === 0 || countdownTimer || gameEngine.intervalId) return;
  let count = 3;
  broadcast({ type: "countdown", count, players: gameEngine.initMatch(roster) });
  countdownTimer = setInterval(() => {
    if (--count > 0) {
      broadcast({ type: "countdown", count, players: gameEngine.getSnapshot() });
      return;
    }
    clearCountdown();
    broadcast({ type: "start" });
    gameEngine.startLoop(roster, (res) => {
      broadcast({ type: "tick", players: res.players, activePowerUps: res.activePowerUps });
      if (res.roundOver) {
        const scores = {};
        roomManager.getRoster().forEach((p) => {
          if (p.id === res.winnerId) p.score = (p.score || 0) + 1;
          scores[p.id] = p.score || 0;
        });
        broadcast({ type: "roundEnd", winnerId: res.winnerId, scores, players: roomManager.getRoster() });
      }
    });
  }, 1000);
}

wss.on("connection", (ws) => {
  const assignedPlayer = roomManager.addPlayer(ws);
  ws.send(JSON.stringify({ type: "assigned", clientId: assignedPlayer.clientId, player: assignedPlayer }));
  broadcastRosterSync();
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.type === "claimSlot" && msg.slot && roomManager.claimSlot(ws, msg.slot)) {
      ws.send(JSON.stringify({ type: "assigned", clientId: assignedPlayer.clientId, player: assignedPlayer }));
      broadcastRosterSync();
    } else if (msg.type === "requestStart" || msg.type === "start") {
      startSynchronizedCountdown();
    } else if (msg.type === "abortMatch") {
      clearCountdown(); gameEngine.stopLoop(); gameEngine.resetGrid(); gameEngine.players = [];
      broadcast({ type: "returnToLobby" });
    } else if (msg.type === "input" && assignedPlayer && assignedPlayer.slot >= 0) {
      const turnVal = Math.max(-1, Math.min(1, Number(msg.turn ?? msg.steer) || 0));
      assignedPlayer.steer = turnVal;
      const runner = gameEngine.players.find((p) => p.id === assignedPlayer.id);
      if (runner) runner.steer = turnVal;
    }
  });
  ws.on("close", () => {
    roomManager.removePlayer(ws);
    if (roomManager.getRoster().length === 0) { clearCountdown(); gameEngine.stopLoop(); }
    broadcastRosterSync();
  });
});
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
