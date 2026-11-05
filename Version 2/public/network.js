// ============================================================================
// CLIENT NETWORK WITH SLOT CLAIMING, ROSTER SYNC & POWER-UP TICKS (< 90 LINES)
// ============================================================================
class NetworkClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.clientId = null;
    this.assignedPlayer = null;
    this.slots = {};
    this.roster = [];
    this.latestTick = null;
    this.listeners = new Map();
    this.leftDown = false;
    this.rightDown = false;
    this.currentTurn = 0;
    this.leftKeys = new Set(["ArrowLeft", "KeyA", "Digit1", "KeyZ", "KeyM", "KeyC", "BracketLeft"]);
    this.rightKeys = new Set(["ArrowRight", "KeyD", "KeyQ", "KeyX", "Comma", "KeyV", "BracketRight"]);
    this.connect();
    this.bindControls();
  }

  connect() {
    const wsUrl = window.location.protocol === "https:"
      ? `wss://${window.location.host}`
      : window.location.host ? `ws://${window.location.host}` : "ws://localhost:8080";
    try { this.ws = new WebSocket(wsUrl); } catch (err) { return; }

    this.ws.addEventListener("open", () => {
      this.connected = true;
    });

    this.ws.addEventListener("message", (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type === "assigned") {
        this.clientId = msg.clientId || (msg.player && msg.player.clientId) || this.clientId;
        this.assignedPlayer = msg.player;
      } else if (msg.type === "rosterSync") {
        this.slots = msg.slots || {};
        this.roster = msg.players || [];
        window.dispatchEvent(new CustomEvent("rostersync", { detail: msg }));
      } else if (msg.type === "roster") {
        this.roster = msg.players || [];
      } else if (msg.type === "countdown") {
        window.dispatchEvent(new CustomEvent("servercountdown", { detail: msg }));
      } else if (msg.type === "start") {
        window.dispatchEvent(new CustomEvent("serverstart"));
      } else if (msg.type === "roundEnd") {
        window.dispatchEvent(new CustomEvent("serverroundend", { detail: msg }));
      } else if (msg.type === "tick") {
        this.latestTick = msg.players;
        window.latestServerTick = msg;
        window.dispatchEvent(new CustomEvent("servertick", { detail: msg }));
      }
      const handler = this.listeners.get(msg.type);
      if (handler) handler(msg);
    });

    this.ws.addEventListener("close", () => (this.connected = false));
    this.ws.addEventListener("error", () => {});
  }

  updateTurnState() {
    const nextTurn = (this.leftDown ? -1 : 0) + (this.rightDown ? 1 : 0);
    if (nextTurn !== this.currentTurn) {
      this.currentTurn = nextTurn;
      this.send({ type: "input", turn: this.currentTurn });
    }
  }

  bindControls() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && this.connected && !e.repeat) { e.preventDefault(); this.send({ type: "abortMatch" }); }
      if (e.code === "Space" && this.connected && !e.repeat) { this.send({ type: "requestStart" }); }
      if (this.leftKeys.has(e.code)) { this.leftDown = true; this.updateTurnState(); }
      if (this.rightKeys.has(e.code)) { this.rightDown = true; this.updateTurnState(); }
    });
    window.addEventListener("keyup", (e) => {
      if (this.leftKeys.has(e.code)) { this.leftDown = false; this.updateTurnState(); }
      if (this.rightKeys.has(e.code)) { this.rightDown = false; this.updateTurnState(); }
    });
  }

  on(type, cb) { this.listeners.set(type, cb); }
  send(payload) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload)); }
}

window.network = new NetworkClient();
