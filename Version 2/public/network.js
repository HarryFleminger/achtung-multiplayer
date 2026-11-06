// ============================================================================
// CLIENT NETWORK: CUSTOM KEYBINDS, SLOT CLAIMING & WS EMITTERS (< 90 LINES)
// ============================================================================
let myLeftKey = "ArrowLeft";
let myRightKey = "ArrowRight";
window.setMyKeys = (l, r) => {
  if (l) { myLeftKey = l; const bL = document.getElementById("bind-left"); if (bL) bL.textContent = l; }
  if (r) { myRightKey = r; const bR = document.getElementById("bind-right"); if (bR) bR.textContent = r; }
};

class NetworkClient {
  constructor() {
    this.ws = null; this.connected = false; this.clientId = null; this.assignedPlayer = null;
    this.slots = {}; this.roster = []; this.latestTick = null; this.listeners = new Map();
    this.leftDown = false; this.rightDown = false; this.currentTurn = 0; this.rebindActive = false;
    this.connect();
    this.bindControls();
    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", () => this.initKeybindUI());
    else this.initKeybindUI();
  }

  initKeybindUI() {
    const bindBtn = (id, isLeft) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener("click", () => {
        btn.textContent = "Press key...";
        this.rebindActive = true;
        window.addEventListener("keydown", (event) => {
          event.preventDefault(); event.stopImmediatePropagation();
          const k = event.key === " " ? "Space" : event.key;
          if (isLeft) myLeftKey = k; else myRightKey = k;
          btn.textContent = k;
          this.rebindActive = false;
          window.dispatchEvent(new CustomEvent("keybindchange", { detail: { left: myLeftKey, right: myRightKey } }));
        }, { once: true, capture: true });
      });
    };
    bindBtn("bind-left", true);
    bindBtn("bind-right", false);
  }

  connect() {
    const wsUrl = window.location.protocol === "https:" ? `wss://${window.location.host}` : window.location.host ? `ws://${window.location.host}` : "ws://localhost:8080";
    try { this.ws = new WebSocket(wsUrl); } catch (err) { return; }
    this.ws.addEventListener("open", () => { this.connected = true; });
    this.ws.addEventListener("message", (event) => {
      let msg; try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type === "assigned") { this.clientId = msg.clientId || (msg.player && msg.player.clientId) || this.clientId; this.assignedPlayer = msg.player; }
      else if (msg.type === "rosterSync") { this.slots = msg.slots || {}; this.roster = msg.players || []; window.dispatchEvent(new CustomEvent("rostersync", { detail: msg })); }
      else if (msg.type === "roster") this.roster = msg.players || [];
      else if (msg.type === "countdown") window.dispatchEvent(new CustomEvent("servercountdown", { detail: msg }));
      else if (msg.type === "start") window.dispatchEvent(new CustomEvent("serverstart"));
      else if (msg.type === "roundEnd") window.dispatchEvent(new CustomEvent("serverroundend", { detail: msg }));
      else if (msg.type === "tick") { this.latestTick = msg.players; window.latestServerTick = msg; window.dispatchEvent(new CustomEvent("servertick", { detail: msg })); }
      const handler = this.listeners.get(msg.type);
      if (handler) handler(msg);
    });
    this.ws.addEventListener("close", () => (this.connected = false));
    this.ws.addEventListener("error", () => {});
    window.addEventListener("pagehide", () => { if (this.ws) this.ws.close(); });
  }

  updateTurnState() {
    const nextTurn = (this.leftDown ? -1 : 0) + (this.rightDown ? 1 : 0);
    if (nextTurn !== this.currentTurn) { this.currentTurn = nextTurn; this.send({ type: "input", turn: this.currentTurn }); }
  }

  bindControls() {
    window.addEventListener("keydown", (event) => {
      if (this.rebindActive || (document.activeElement && document.activeElement.tagName === "INPUT")) return;
      if (event.code === "Escape" && this.connected && !event.repeat) { event.preventDefault(); this.send({ type: "abortMatch" }); return; }
      if (event.code === "Space" && this.connected && !event.repeat && myLeftKey !== "Space" && myRightKey !== "Space") { this.send({ type: "requestStart" }); }
      if (event.key === myLeftKey || event.code === myLeftKey) { this.leftDown = true; this.updateTurnState(); }
      if (event.key === myRightKey || event.code === myRightKey) { this.rightDown = true; this.updateTurnState(); }
    });
    window.addEventListener("keyup", (event) => {
      if (event.key === myLeftKey || event.code === myLeftKey) { this.leftDown = false; this.updateTurnState(); }
      if (event.key === myRightKey || event.code === myRightKey) { this.rightDown = false; this.updateTurnState(); }
    });
  }

  on(type, cb) { this.listeners.set(type, cb); }
  send(payload) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload)); }
}
window.network = new NetworkClient();
