// ============================================================================
// SERVER: GHOST CONNECTION CLEANUP, SLOT RESET & WS SYNC (< 90 LINES)
// ============================================================================
const http = require("http"), path = require("path"), express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const roomManager = require("./roomManager"), gameEngine = require("./gameEngine");

const PORT = process.env.PORT || 8080;
const ROOT_DIR = path.join(__dirname, "..", "Version 2"), PUBLIC_DIR = path.join(ROOT_DIR, "public");
const app = express();
app.use(express.static(PUBLIC_DIR)); app.use("/public", express.static(PUBLIC_DIR)); app.use(express.static(ROOT_DIR));
const server = http.createServer(app), wss = new WebSocketServer({ server });
let countdownTimer = null;
const scores = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
}
function broadcastRosterSync() {
  const players = roomManager.getRoster();
  broadcast({ type: "rosterSync", slots: roomManager.getSlotMap(), players });
  broadcast({ type: "roster", players });
}
function clearCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
function zeroScores() {
  Object.keys(scores).forEach((k) => { scores[k] = 0; });
  roomManager.getRoster().forEach((p) => { p.score = 0; scores[p.id] = 0; });
  broadcast({ type: "scoreSync", scores, players: roomManager.getRoster() });
}
function startSynchronizedCountdown() {
  const roster = roomManager.getRoster();
  if (roster.length === 0 || countdownTimer || gameEngine.intervalId) return;
  gameEngine.setSettings(roomManager.gameSettings);
  let count = 3;
  broadcast({ type: "countdown", count, players: gameEngine.initMatch(roster) });
  countdownTimer = setInterval(() => {
    if (--count > 0) { broadcast({ type: "countdown", count, players: gameEngine.getSnapshot() }); return; }
    clearCountdown(); broadcast({ type: "start" });
    gameEngine.startLoop(roster, (res) => {
      broadcast({ type: "tick", players: res.players, activePowerUps: res.activePowerUps, clearBoard: Boolean(res.clearBoard) });
      if (res.roundOver) {
        let matchWinner = null;
        roomManager.getRoster().forEach((p) => {
          if (p.id === res.winnerId) p.score = (p.score || 0) + 1;
          scores[p.id] = p.score || 0;
          if (scores[p.id] >= 10) matchWinner = p.id;
        });
        broadcast({ type: "roundEnd", winnerId: res.winnerId, matchWinner, scores, players: roomManager.getRoster() });
      }
    });
  }, 1000);
}
wss.on("connection", (ws) => {
  const assignedPlayer = roomManager.addPlayer(ws);
  ws.send(JSON.stringify({ type: "assigned", clientId: assignedPlayer.clientId, player: assignedPlayer }));
  ws.send(JSON.stringify({ type: "settingsSync", settings: roomManager.gameSettings }));
  broadcastRosterSync();
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.type === "claimSlot" && msg.slot && roomManager.claimSlot(ws, msg.slot)) {
      ws.send(JSON.stringify({ type: "assigned", clientId: assignedPlayer.clientId, player: assignedPlayer }));
      broadcastRosterSync();
    } else if (msg.type === "updateSetting" && msg.key) {
      const settings = roomManager.updateSetting(msg.key, msg.value);
      gameEngine.setSettings(settings); broadcast({ type: "settingsSync", settings });
    } else if (msg.type === "resetScores") zeroScores();
    else if (msg.type === "requestStart" || msg.type === "start") {
      if (countdownTimer || gameEngine.intervalId) return;
      const matchOver = Object.values(scores).some((s) => s >= 10) || roomManager.getRoster().some((p) => (p.score || 0) >= 10);
      if (matchOver) zeroScores();
      startSynchronizedCountdown();
    } else if (msg.type === "abortMatch") {
      clearCountdown(); gameEngine.stopLoop(); gameEngine.resetGrid(); gameEngine.players = []; broadcast({ type: "returnToLobby" });
    } else if (msg.type === "input" && assignedPlayer && assignedPlayer.slot >= 0) {
      const turnVal = Math.max(-1, Math.min(1, Number(msg.turn ?? msg.steer) || 0));
      assignedPlayer.steer = turnVal;
      const runner = gameEngine.players.find((p) => p.id === assignedPlayer.id); if (runner) runner.steer = turnVal;
    }
  });
  ws.on("close", () => {
    const cid = (assignedPlayer && assignedPlayer.clientId) || ws.clientId;
    Object.keys(roomManager.slots).forEach((k) => { if (roomManager.slots[k] === cid) roomManager.slots[k] = null; });
    if (assignedPlayer) gameEngine.players = gameEngine.players.filter((p) => p.id !== assignedPlayer.id && p.clientId !== cid);
    roomManager.removePlayer(ws);
    if (roomManager.getRoster().length === 0) { clearCountdown(); gameEngine.stopLoop(); gameEngine.players = []; }
    broadcastRosterSync();
  });
});
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
