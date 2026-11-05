// ============================================================================
// LOCAL MODE: SPATIAL GRID, AI BOTS, POWER-UP PHYSICS & RENDERING (< 90 LINES)
// ============================================================================
window.LocalSim = (function () {
  const CELL = 24;
  let cols = 0, rows = 0, grid = [];
  const countEff = (r, t) => r.effects.filter((e) => e.type === t).length;
  const fmtStacks = (effs) => {
    const c = new Map(), ic = new Map();
    effs.forEach((e) => { c.set(e.type, (c.get(e.type) || 0) + 1); ic.set(e.type, e.icon); });
    const out = []; c.forEach((n, t) => out.push(n > 1 ? `${ic.get(t)}×${n}` : ic.get(t)));
    return out.join(" ");
  };
  function initGrid(w, h) {
    cols = Math.ceil(w / CELL) + 1; rows = Math.ceil(h / CELL) + 1;
    grid = Array.from({ length: cols * rows }, () => []);
  }
  function addSeg(x1, y1, x2, y2, pid, step, r) {
    const x0 = Math.max(0, Math.floor((Math.min(x1, x2) - r) / CELL)), xN = Math.min(cols - 1, Math.floor((Math.max(x1, x2) + r) / CELL));
    const y0 = Math.max(0, Math.floor((Math.min(y1, y2) - r) / CELL)), yN = Math.min(rows - 1, Math.floor((Math.max(y1, y2) + r) / CELL));
    for (let cy = y0; cy <= yN; cy++) for (let cx = x0; cx <= xN; cx++) grid[cy * cols + cx].push({ x1, y1, x2, y2, pid, step, r });
  }
  function distSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return (px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2;
  }
  function hitAt(S, px, py, id, step, rad, grace, ghost, wrap) {
    if (!wrap && (px - rad <= 1 || px + rad >= S.w - 1 || py - rad <= 1 || py + rad >= S.h - 1)) return true;
    if (ghost) return false;
    const x0 = Math.max(0, Math.floor((px - rad) / CELL)), xN = Math.min(cols - 1, Math.floor((px + rad) / CELL));
    const y0 = Math.max(0, Math.floor((py - rad) / CELL)), yN = Math.min(rows - 1, Math.floor((py + rad) / CELL));
    for (let cy = y0; cy <= yN; cy++) for (let cx = x0; cx <= xN; cx++) {
      for (const s of grid[cy * cols + cx]) {
        if (s.pid === id && (!S.cfg.selfCollision || step - s.step <= grace)) continue;
        if (distSq(px, py, s.x1, s.y1, s.x2, s.y2) < (rad + s.r * 0.88) ** 2) return true;
      }
    }
    return false;
  }
  function feeler(S, r, off, maxD, rad, ghost, wrap) {
    const ang = r.angle + off, cos = Math.cos(ang), sin = Math.sin(ang), gr = Math.ceil((rad * 6.5) / Math.max(1, S.cfg.moveSpeed)) + 16;
    for (let d = 6; d <= maxD; d += 6) {
      let tx = r.x + cos * d, ty = r.y + sin * d;
      if (wrap) { tx = ((tx % S.w) + S.w) % S.w; ty = ((ty % S.h) + S.h) % S.h; }
      if (hitAt(S, tx, ty, r.id, S.frame, rad, gr, ghost, wrap)) return d;
    }
    return maxD;
  }
  function botSteer(S, r, rad, ghost, wrap) {
    const look = Math.min(210, Math.max(95, S.cfg.moveSpeed * 52));
    const f = feeler(S, r, 0, look, rad, ghost, wrap), lN = feeler(S, r, -0.35, look, rad, ghost, wrap), rN = feeler(S, r, 0.35, look, rad, ghost, wrap);
    const lS = lN * 1.2 + feeler(S, r, -0.78, look * 0.8, rad, ghost, wrap) * 0.85, rS = rN * 1.2 + feeler(S, r, 0.78, look * 0.8, rad, ghost, wrap) * 0.85;
    if (Math.random() < 0.04) r.botBias = (Math.random() - 0.5) * 0.4;
    if (f < look * 0.78 || lN < look * 0.55 || rN < look * 0.55) return lS > rS ? -1 : 1;
    if (S.orbs.length > 0 && f > look * 0.9) {
      const orb = S.orbs.reduce((b, o) => (Math.hypot(o.x - r.x, o.y - r.y) < b.d ? { o, d: Math.hypot(o.x - r.x, o.y - r.y) } : b), { o: null, d: 220 }).o;
      if (orb) { const df = Math.atan2(Math.sin(Math.atan2(orb.y - r.y, orb.x - r.x) - r.angle), Math.cos(Math.atan2(orb.y - r.y, orb.x - r.x) - r.angle)); if (Math.abs(df) > 0.12) return df < 0 ? -1 : 1; }
    }
    return Math.abs(lS - rS) > look * 0.35 ? (lS > rS ? -1 : 1) : Math.abs(r.botBias) > 0.16 ? (r.botBias < 0 ? -1 : 1) : 0;
  }
  function draw(S) {
    const ctx = S.headCtx; ctx.clearRect(0, 0, S.w, S.h);
    S.orbs.forEach((o) => {
      const grn = o.def.target === "others", col = grn ? "#2ee65a" : "#ff3b30", rad = o.radius * (1 + Math.sin((S.frame - o.spawnFrame) * 0.12) * 0.08);
      ctx.beginPath(); ctx.arc(o.x, o.y, rad, 0, Math.PI * 2); ctx.fillStyle = "#101018"; ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = col; ctx.stroke();
      ctx.font = "15px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(o.def.icon, o.x, o.y + 1);
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    S.runners.forEach((r) => {
      if (S.state === "COUNTDOWN") {
        ctx.strokeStyle = r.color; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + Math.cos(r.angle) * 22, r.y + Math.sin(r.angle) * 22); ctx.stroke();
        ctx.font = "700 12px sans-serif"; ctx.fillStyle = r.color; ctx.fillText(r.name, r.x + 10, r.y - 10);
      }
      const hr = Math.max(2, (r.curR || S.cfg.lineWidth * 0.5) * 1.06), eff = r.alive && r.effects.length ? r.effects[r.effects.length - 1] : null;
      if (eff) {
        const fl = Math.floor(S.frame / 4) % 2 === 0, rr = hr + 5 + Math.sin(S.frame * 0.35) * 2.2;
        ctx.beginPath(); ctx.arc(r.x, r.y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, eff.rem / eff.tot));
        ctx.strokeStyle = fl ? "#fff" : eff.col; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.font = "700 12px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(fmtStacks(r.effects), r.x + rr + 4, r.y + 4);
      }
      ctx.beginPath(); ctx.arc(r.x, r.y, hr, 0, Math.PI * 2);
      ctx.fillStyle = !r.alive ? "#fff" : S.cfg.headColorMode === "yellow" ? "#ffe650" : r.color; ctx.fill();
    });
  }
  return { initGrid, addSeg, hitAt, botSteer, countEff, fmtStacks, draw };
})();
