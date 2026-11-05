// ============================================================================
// SERVER-SIDE 60HZ GAME ENGINE WITH COLLISION & ROUND OVER (< 90 LINES)
// ============================================================================

class ServerGameEngine {
  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;
    this.speed = 2.35;
    this.turnSpeed = 0.052;
    this.radius = 2.25;
    this.intervalId = null;
    this.tickCount = 0;
    this.players = [];
    this.resetGrid();
  }

  resetGrid() {
    this.grid = new Uint8Array(this.width * this.height);
    this.stepGrid = new Uint16Array(this.width * this.height);
  }

  markDisc(cx, cy, r, ownerId, step) {
    const rad = Math.ceil(r), rSq = r * r, w = this.width, h = this.height;
    const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(w - 1, Math.ceil(cx + rad));
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(h - 1, Math.ceil(cy + rad));
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

  checkCollision(px, py, r, id, step) {
    if (px - r <= 1 || px + r >= this.width - 1 || py - r <= 1 || py + r >= this.height - 1) return true;
    const rad = Math.ceil(r * 0.85), rSq = (r * 0.85) ** 2;
    const x0 = Math.max(0, Math.floor(px - rad)), x1 = Math.min(this.width - 1, Math.ceil(px + rad));
    const y0 = Math.max(0, Math.floor(py - rad)), y1 = Math.min(this.height - 1, Math.ceil(py + rad));
    for (let y = y0; y <= y1; y++) {
      const dy = y - py, row = y * this.width;
      for (let x = x0; x <= x1; x++) {
        if ((x - px) * (x - px) + dy * dy <= rSq) {
          const val = this.grid[row + x];
          if (val !== 0 && !(val === id + 1 && step - this.stepGrid[row + x] <= 24)) return true;
        }
      }
    }
    return false;
  }

  initMatch(roster) {
    this.stopLoop();
    this.resetGrid();
    this.tickCount = 0;
    this.players = roster.map((p) => {
      const x = 100 + Math.random() * (this.width - 200);
      const y = 100 + Math.random() * (this.height - 200);
      return {
        id: p.id, name: p.name, color: p.color, x, y,
        angle: Math.atan2(this.height / 2 - y, this.width / 2 - x) + (Math.random() - 0.5),
        steer: p.steer || 0, gap: false, alive: true,
        gapTimer: 130 + Math.floor(Math.random() * 180),
      };
    });
    return this.getSnapshot();
  }

  getSnapshot() {
    return this.players.map((p) => ({
      id: p.id, name: p.name, color: p.color,
      x: +p.x.toFixed(2), y: +p.y.toFixed(2), angle: +p.angle.toFixed(3),
      gap: p.gap, alive: p.alive,
    }));
  }

  startLoop(roster, onTick) {
    if (!this.players.length) this.initMatch(roster);
    this.stopLoop();
    this.intervalId = setInterval(() => {
      const result = this.step();
      if (onTick) onTick(result);
    }, 16.6);
  }

  stopLoop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  step() {
    this.tickCount++;
    const grace = this.tickCount <= 45;
    const deltas = this.players.map((p) => {
      if (p.alive) {
        p.angle += (p.steer || 0) * this.turnSpeed;
        p.x += Math.cos(p.angle) * this.speed;
        p.y += Math.sin(p.angle) * this.speed;
        if (--p.gapTimer <= 0) {
          p.gap = !p.gap;
          p.gapTimer = p.gap ? 14 : 130 + Math.floor(Math.random() * 180);
        }
        if (this.checkCollision(p.x, p.y, this.radius, p.id, this.tickCount)) p.alive = false;
        if (p.alive && !grace && !p.gap) this.markDisc(p.x, p.y, this.radius, p.id, this.tickCount);
      }
      return { id: p.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), angle: +p.angle.toFixed(3), gap: p.gap || grace, alive: p.alive };
    });
    const alive = this.players.filter((p) => p.alive);
    const minAlive = this.players.length > 1 ? 1 : 0;
    const roundOver = alive.length <= minAlive;
    if (roundOver) this.stopLoop();
    return { players: deltas, roundOver, winnerId: alive[0] ? alive[0].id : null };
  }
}

module.exports = new ServerGameEngine(800, 600);
