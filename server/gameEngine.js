// ============================================================================
// SERVER 60HZ GAME ENGINE WITH ALLOWED POWER-UPS & CLEAN SLATE (< 90 LINES)
// ============================================================================
const PU_EFFECTS = [
  { effect: "speed", icon: "⚡" }, { effect: "slow", icon: "🐢" }, { effect: "thick", icon: "🐘" }, { effect: "thin", icon: "🪡" },
  { effect: "wrap", icon: "🚪" }, { effect: "ghost", icon: "👻" }, { effect: "reverse", icon: "⇄" }, { effect: "rightAngle", icon: "📐" },
  { effect: "wobble", icon: "🌀" }, { effect: "cleanSlate", icon: "🧹" },
];
const TIMED_MODS = ["wrap", "ghost", "reverse", "rightAngle", "wobble"];

class ServerGameEngine {
  constructor(width = 800, height = 600) {
    this.width = width; this.height = height; this.baseSpeed = 2.35; this.turnSpeed = 0.052; this.baseRadius = 2.25;
    this.intervalId = null; this.tickCount = 0; this.players = []; this.activePowerUps = []; this.nextPuId = 1; this.needsBoardClear = false;
    this.settings = { powerUpsEnabled: true, gapsEnabled: true, wrapWalls: false, selfCollision: true, allowedPowerUps: PU_EFFECTS.map((e) => e.effect) };
    this.resetGrid();
  }
  setSettings(s = {}) {
    Object.assign(this.settings, s);
    this.baseSpeed = Number(s.moveSpeed) || 2.35; this.turnSpeed = Number(s.turnSpeed) || 0.052; this.baseRadius = (Number(s.lineWidth) || 4.5) * 0.5;
    if (!this.settings.powerUpsEnabled) this.activePowerUps = [];
  }
  resetGrid() {
    this.grid = new Uint8Array(this.width * this.height); this.stepGrid = new Uint16Array(this.width * this.height);
    this.activePowerUps = []; this.needsBoardClear = false;
  }
  markDisc(cx, cy, r, ownerId, step) {
    const rad = Math.ceil(r), rSq = r * r, w = this.width, h = this.height;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(h - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(w - 1, Math.ceil(cx + rad)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rSq) { this.grid[y * w + x] = ownerId + 1; this.stepGrid[y * w + x] = step; }
  }
  checkCollision(px, py, r, id, step, canWrap) {
    if (!canWrap && (px - r <= 1 || px + r >= this.width - 1 || py - r <= 1 || py + r >= this.height - 1)) return true;
    const rad = Math.ceil(r * 0.85), rSq = (r * 0.85) ** 2;
    for (let y = Math.max(0, Math.floor(py - rad)); y <= Math.min(this.height - 1, Math.ceil(py + rad)); y++)
      for (let x = Math.max(0, Math.floor(px - rad)); x <= Math.min(this.width - 1, Math.ceil(px + rad)); x++) {
        const idx = y * this.width + x, val = this.grid[idx];
        if ((x - px) ** 2 + (y - py) ** 2 <= rSq && val !== 0 && !(val === id + 1 && step - this.stepGrid[idx] <= 24)) return true;
      }
    return false;
  }
  initMatch(roster) {
    this.stopLoop(); this.resetGrid(); this.tickCount = 0;
    this.players = roster.map((p) => {
      const x = 100 + Math.random() * (this.width - 200), y = 100 + Math.random() * (this.height - 200);
      return { id: p.id, name: p.name, color: p.color, x, y, angle: Math.atan2(this.height / 2 - y, this.width / 2 - x) + (Math.random() - 0.5), steer: p.steer || 0, lastSteer: 0, gap: false, alive: true, gapTimer: 130 + Math.floor(Math.random() * 180), speedMult: 1, radius: this.baseRadius, effectTimer: 0, wrap: 0, ghost: 0, reverse: 0, rightAngle: 0, wobble: 0 };
    });
    return this.getSnapshot();
  }
  getSnapshot() { return this.players.map((p) => ({ id: p.id, name: p.name, color: p.color, x: +p.x.toFixed(2), y: +p.y.toFixed(2), angle: +p.angle.toFixed(3), gap: p.gap, alive: p.alive, lineWidth: +(p.radius * 2).toFixed(1), isGhost: p.ghost > 0, isWrap: p.wrap > 0 || Boolean(this.settings.wrapWalls) })); }
  applyPowerUp(collector, pu) {
    if (pu.effect === "cleanSlate") { this.grid.fill(0); this.stepGrid.fill(0); this.needsBoardClear = true; return; }
    (pu.type === "red" ? [collector] : this.players.filter((t) => t.alive && t.id !== collector.id)).forEach((t) => {
      if (TIMED_MODS.includes(pu.effect)) { t[pu.effect] = 300; return; }
      t.effectTimer = 300; t.speedMult = pu.effect === "speed" ? 1.65 : pu.effect === "slow" ? 0.6 : t.speedMult;
      t.radius = pu.effect === "thick" ? this.baseRadius * 2 : pu.effect === "thin" ? this.baseRadius * 0.55 : t.radius;
    });
  }
  startLoop(roster, onTick) { if (!this.players.length) this.initMatch(roster); this.stopLoop(); this.intervalId = setInterval(() => { if (onTick) onTick(this.step()); }, 1000 / 30); }
  stopLoop() { if (this.intervalId) clearInterval(this.intervalId); this.intervalId = null; }
  step() {
    const grace = ++this.tickCount <= 45, canWrapGlobal = Boolean(this.settings.wrapWalls);
    const allowed = Array.isArray(this.settings.allowedPowerUps) ? PU_EFFECTS.filter((e) => this.settings.allowedPowerUps.includes(e.effect)) : PU_EFFECTS;
    if (this.settings.powerUpsEnabled && allowed.length > 0 && this.activePowerUps.length < 5 && Math.random() < 0.009) {
      const m = allowed[Math.floor(Math.random() * allowed.length)];
      this.activePowerUps.push({ id: this.nextPuId++, x: Math.round(70 + Math.random() * (this.width - 140)), y: Math.round(70 + Math.random() * (this.height - 140)), radius: 15, type: m.effect === "cleanSlate" ? "red" : Math.random() < 0.5 ? "green" : "red", effect: m.effect, icon: m.icon });
    }
    const deltas = this.players.map((p) => {
      if (p.alive) {
        if (p.effectTimer > 0 && --p.effectTimer === 0) { p.speedMult = 1; p.radius = this.baseRadius; }
        TIMED_MODS.forEach((k) => { if (p[k] > 0) p[k]--; });
        const dir = (p.steer || 0) * (p.reverse > 0 ? -1 : 1), wrapOn = canWrapGlobal || p.wrap > 0 || p.ghost > 0;
        p.angle += p.rightAngle > 0 ? (dir !== 0 && dir !== p.lastSteer ? dir * (Math.PI / 2) : 0) : dir * this.turnSpeed;
        p.lastSteer = dir; if (p.wobble > 0) p.angle += Math.sin(this.tickCount * 0.25) * 0.09;
        p.x += Math.cos(p.angle) * this.baseSpeed * p.speedMult; p.y += Math.sin(p.angle) * this.baseSpeed * p.speedMult;
        if (wrapOn) { p.x = (p.x + this.width) % this.width; p.y = (p.y + this.height) % this.height; }
        if (this.settings.gapsEnabled !== false && --p.gapTimer <= 0) { p.gap = !p.gap; p.gapTimer = p.gap ? 14 : 130 + Math.floor(Math.random() * 180); }
        for (let i = this.activePowerUps.length - 1; i >= 0; i--) if (Math.hypot(p.x - this.activePowerUps[i].x, p.y - this.activePowerUps[i].y) <= p.radius + this.activePowerUps[i].radius) this.applyPowerUp(p, this.activePowerUps.splice(i, 1)[0]);
        if (p.ghost <= 0 && this.checkCollision(p.x, p.y, p.radius, p.id, this.tickCount, wrapOn)) p.alive = false;
        if (p.alive && !grace && !p.gap && p.ghost <= 0) this.markDisc(p.x, p.y, p.radius, p.id, this.tickCount);
      }
      return { id: p.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), angle: +p.angle.toFixed(3), gap: p.gap || grace, alive: p.alive, lineWidth: +(p.radius * 2).toFixed(1), isGhost: p.ghost > 0, isWrap: p.wrap > 0 || canWrapGlobal, isReverse: p.reverse > 0, isRightAngle: p.rightAngle > 0, isWobble: p.wobble > 0 };
    });
    const alive = this.players.filter((p) => p.alive), roundOver = alive.length <= (this.players.length > 1 ? 1 : 0);
    if (roundOver) this.stopLoop();
    const clearBoard = this.needsBoardClear; this.needsBoardClear = false;
    return { players: deltas, activePowerUps: this.activePowerUps, clearBoard, roundOver, winnerId: alive[0] ? alive[0].id : null };
  }
}
module.exports = new ServerGameEngine(800, 600);
