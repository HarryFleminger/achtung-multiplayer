// ============================================================================
// PHASE 1: DECOUPLED PHYSICS ENGINE & UINT8ARRAY OCCUPANCY GRID (< 90 LINES)
// ============================================================================
class GameEngine {
  constructor(width = 800, height = 600, cfg = {}) {
    this.cfg = cfg;
    this.resize(width, height);
  }
  resize(w, h) {
    this.width = Math.max(320, Math.floor(w));
    this.height = Math.max(240, Math.floor(h));
    this.clearGrid();
  }
  clearGrid() {
    this.grid = new Uint8Array(this.width * this.height);
    this.stepGrid = new Uint16Array(this.width * this.height);
  }
  markDisc(cx, cy, radius, ownerId, step) {
    const r = Math.ceil(radius), rSq = radius * radius, w = this.width, h = this.height;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy, row = y * w;
      for (let x = x0; x <= x1; x++) {
        if ((x - cx) * (x - cx) + dy * dy <= rSq) {
          this.grid[row + x] = ownerId + 1;
          this.stepGrid[row + x] = step;
        }
      }
    }
  }
  markSegment(x1, y1, x2, y2, radius, ownerId, step) {
    const dist = Math.hypot(x2 - x1, y2 - y1), steps = Math.max(1, Math.ceil(dist / 1.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.markDisc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius, ownerId, step);
    }
  }
  checkCollision(px, py, radius, runnerId, step, ignoreSelfFrames, ignoreTrails, canWrap) {
    const w = this.width, h = this.height;
    if (!canWrap && (px - radius <= 1 || px + radius >= w - 1 || py - radius <= 1 || py + radius >= h - 1)) {
      return true;
    }
    if (ignoreTrails) return false;
    const r = Math.ceil(radius * 0.85), rSq = (radius * 0.85) ** 2;
    const x0 = Math.max(0, Math.floor(px - r)), x1 = Math.min(w - 1, Math.ceil(px + r));
    const y0 = Math.max(0, Math.floor(py - r)), y1 = Math.min(h - 1, Math.ceil(py + r));
    for (let y = y0; y <= y1; y++) {
      const dy = y - py, row = y * w;
      for (let x = x0; x <= x1; x++) {
        if ((x - px) * (x - px) + dy * dy <= rSq) {
          const val = this.grid[row + x];
          if (val === 0) continue;
          if (val === runnerId + 1) {
            if (!this.cfg.selfCollision || step - this.stepGrid[row + x] <= ignoreSelfFrames) continue;
          }
          return true;
        }
      }
    }
    return false;
  }
  countStacks(runner, type) {
    let c = 0;
    for (let i = 0; i < runner.effects.length; i++) if (runner.effects[i].type === type) c++;
    return c;
  }
  getModifiers(r, baseSpeed) {
    const sp = this.countStacks(r, "speed"), sl = this.countStacks(r, "slow");
    const tk = this.countStacks(r, "thick"), tn = this.countStacks(r, "thin");
    const wb = this.countStacks(r, "wobble"), gh = this.countStacks(r, "ghost") > 0;
    const canWrap = this.cfg.wrapWalls || this.countStacks(r, "wallwalk") > 0 || gh;
    const speedMult = Math.max(0.2, Math.min(6.0, Math.pow(1.65, sp) * Math.pow(0.58, sl)));
    const turnMult = Math.pow(1.22, sp) * Math.pow(0.8, sl) * Math.pow(0.88, tk) * Math.pow(1.2, tn);
    const lineWidth = Math.max(1.0, Math.min(64, this.cfg.lineWidth * Math.pow(2.0, tk) * Math.pow(0.5, tn)));
    return {
      speed: baseSpeed * speedMult,
      turnSpeed: this.cfg.turnSpeed * turnMult,
      lineWidth,
      radius: lineWidth * 0.5,
      isReversed: this.countStacks(r, "reverse") > 0,
      isSquare: this.countStacks(r, "square") > 0,
      isGhost: gh,
      canWrap,
      wobbleStacks: wb,
    };
  }
}
if (typeof window !== "undefined") window.GameEngine = GameEngine;
if (typeof module !== "undefined") module.exports = GameEngine;
