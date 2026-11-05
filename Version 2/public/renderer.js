// ============================================================================
// SERVER-AUTHORITATIVE RENDERER WITH GHOST ALPHA & POWER-UPS (< 90 LINES)
// ============================================================================
const SLOT_COLORS = ["#ff3b30", "#32d74b", "#ff2d92", "#00d4ff", "#ff9f0a", "#a8a8b3"];

class GameRenderer {
  constructor(trailCanvas, headCanvas, cfg = {}) {
    this.trailCanvas = trailCanvas; this.headCanvas = headCanvas;
    this.trailCtx = trailCanvas.getContext("2d");
    this.ctxUI = headCanvas.getContext("2d"); this.headCtx = this.ctxUI;
    this.cfg = cfg; this.prevPos = new Map();
    this.trailCanvas.style.pointerEvents = "none"; this.headCanvas.style.pointerEvents = "none";
    window.addEventListener("servercountdown", (e) => this.renderCountdown(e.detail));
    window.addEventListener("serverstart", () => this.ctxUI.clearRect(0, 0, this.width, this.height));
    window.addEventListener("servertick", (e) => { this.setVisible(true); this.renderServerTick(e.detail); });
    window.addEventListener("serverroundend", (e) => this.renderRoundEnd(e.detail));
  }
  setVisible(visible) {
    const disp = visible ? "block" : "none";
    if (this.trailCanvas.style.display !== disp) { this.trailCanvas.style.display = disp; this.headCanvas.style.display = disp; }
  }
  resize(w, h) {
    this.width = w; this.height = h;
    this.trailCanvas.width = w; this.trailCanvas.height = h;
    this.headCanvas.width = w; this.headCanvas.height = h; this.clear();
  }
  clear() {
    this.prevPos.clear();
    this.trailCtx.clearRect(0, 0, this.width, this.height);
    this.ctxUI.clearRect(0, 0, this.width, this.height);
  }
  renderCountdown(payload) {
    const count = typeof payload === "object" ? payload.count : payload;
    const players = (payload && payload.players) || [];
    const lobby = document.getElementById("lobbyOverlay");
    if (lobby) lobby.classList.add("hidden");
    this.setVisible(true); this.clear();
    const ctx = this.ctxUI;
    for (let i = 0; i < players.length; i++) {
      const p = players[i], color = p.color || SLOT_COLORS[p.id % SLOT_COLORS.length] || "#ff3b30";
      ctx.strokeStyle = color; ctx.lineWidth = p.lineWidth || this.cfg.lineWidth || 4.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.angle) * 20, p.y - Math.sin(p.angle) * 20); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2); ctx.fillStyle = "#ffe650"; ctx.fill();
    }
    ctx.save(); ctx.font = "900 110px sans-serif"; ctx.fillStyle = "#ffe650"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(count), this.width / 2, this.height / 2); ctx.restore();
  }
  renderRoundEnd() {
    const ctx = this.ctxUI;
    ctx.save();
    ctx.fillStyle = "rgba(8, 8, 12, 0.72)"; ctx.fillRect(this.width / 2 - 190, this.height / 2 - 55, 380, 110);
    ctx.strokeStyle = "#ffe650"; ctx.lineWidth = 2; ctx.strokeRect(this.width / 2 - 190, this.height / 2 - 55, 380, 110);
    ctx.font = "800 34px sans-serif"; ctx.fillStyle = "#ffe650"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Round Over", this.width / 2, this.height / 2 - 14);
    ctx.font = "600 16px sans-serif"; ctx.fillStyle = "#f4f4f8";
    ctx.fillText("Press SPACE for next round", this.width / 2, this.height / 2 + 24);
    ctx.restore();
  }
  drawSegment(x1, y1, x2, y2, color, lineWidth, isGhost) {
    const ctx = this.trailCtx;
    ctx.globalAlpha = isGhost ? 0.3 : 1.0;
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
  renderServerTick(payload) {
    const players = Array.isArray(payload) ? payload : (payload && payload.players) || [];
    const powerUps = (!Array.isArray(payload) && payload && payload.activePowerUps) || [];
    const ctxUI = this.ctxUI;
    ctxUI.clearRect(0, 0, this.width, this.height);
    for (let i = 0; i < powerUps.length; i++) {
      const pu = powerUps[i], isGreen = pu.type === "green";
      ctxUI.beginPath(); ctxUI.arc(pu.x, pu.y, pu.radius || 15, 0, Math.PI * 2);
      ctxUI.fillStyle = isGreen ? "rgba(50, 215, 75, 0.25)" : "rgba(255, 59, 48, 0.25)"; ctxUI.fill();
      ctxUI.lineWidth = 2.5; ctxUI.strokeStyle = isGreen ? "#32d74b" : "#ff3b30"; ctxUI.stroke();
      ctxUI.font = "16px sans-serif"; ctxUI.textAlign = "center"; ctxUI.textBaseline = "middle";
      ctxUI.fillStyle = "#ffffff"; ctxUI.fillText(pu.icon || "⚡", pu.x, pu.y);
    }
    for (let i = 0; i < players.length; i++) {
      const p = players[i], color = p.color || SLOT_COLORS[p.id % SLOT_COLORS.length] || "#ff3b30";
      const prev = this.prevPos.get(p.id), lw = p.lineWidth || this.cfg.lineWidth || 4.5;
      if (prev && p.alive && !p.gap && Math.hypot(p.x - prev.x, p.y - prev.y) < 40) this.drawSegment(prev.x, prev.y, p.x, p.y, color, lw, p.isGhost);
      this.prevPos.set(p.id, { x: p.x, y: p.y });
      ctxUI.beginPath(); ctxUI.arc(p.x, p.y, Math.max(2.4, lw * 0.55), 0, Math.PI * 2);
      ctxUI.fillStyle = p.alive ? "#ffe650" : "#ffffff"; ctxUI.fill();
    }
  }
}
window.GameRenderer = GameRenderer;
