// ============================================================================
// LOCAL MODE: STANDALONE SINGLE-KEYBOARD GAME & LOBBY CONTROLLER (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG, sfx = window.soundFX, sim = window.LocalSim, $ = (id) => document.getElementById(id);
  const S = { cfg, state: "LOBBY", w: 800, h: 600, frame: 0, cd: 0, orbs: [], nextOrb: 120, runners: [], pwrF: 1, trailCtx: $("trailCanvas").getContext("2d"), headCtx: $("headCanvas").getContext("2d") };
  let players = JSON.parse(JSON.stringify(cfg.defaultPlayers)), keys = new Set(), tapped = new Set(), bind = null, goal = 10;
  const EXTRA = [{ name: "Violet", color: "#bf5af2", leftKey: "KeyQ", leftLabel: "Q", rightKey: "KeyW", rightLabel: "W" }, { name: "Minty", color: "#66d4cf", leftKey: "KeyI", leftLabel: "I", rightKey: "KeyO", rightLabel: "O" }];
  function resize() {
    const r = $("arenaWrapper").getBoundingClientRect(); S.w = Math.max(320, Math.floor(r.width)); S.h = Math.max(240, Math.floor(r.height));
    $("trailCanvas").width = $("headCanvas").width = S.w; $("trailCanvas").height = $("headCanvas").height = S.h;
    S.trailCtx.fillStyle = "#050507"; S.trailCtx.fillRect(0, 0, S.w, S.h); S.headCtx.clearRect(0, 0, S.w, S.h);
  }
  function renderUI() {
    const act = players.filter((p) => p.active); goal = 10;
    if ($("goalScoreDisplay")) $("goalScoreDisplay").textContent = goal; $("playersList").innerHTML = "";
    players.forEach((p, idx) => {
      const row = document.createElement("div"); row.className = "player-row" + (p.active ? " active" : "");
      const bL = bind && bind.idx === idx && bind.s === "L", bR = bind && bind.idx === idx && bind.s === "R";
      row.innerHTML = `<button type="button" class="player-toggle">${p.active ? "✓" : ""}</button><input type="color" class="color-swatch-input" value="${p.color}" /><input type="text" class="player-name-input" value="${p.name}" style="color:${p.color}" maxlength="16" /><button type="button" class="key-btn${bL ? " listening" : ""}">${bL ? "Press..." : p.isBot ? "🤖 AI" : "⟲ " + p.leftLabel}</button><button type="button" class="key-btn${bR ? " listening" : ""}">${bR ? "Press..." : p.isBot ? "🤖 AI" : p.rightLabel + " ⟳"}</button><button type="button" class="bot-btn${p.isBot ? " is-bot" : ""}">${p.isBot ? "🤖 Bot" : "👤 Human"}</button>`;
      const [tog, col, nam, lB, rB, bot] = row.children;
      tog.onclick = () => { p.active = !p.active; sfx.playClick(); renderUI(); }; col.oninput = (e) => { p.color = e.target.value; renderUI(); }; nam.oninput = (e) => { p.name = e.target.value; renderUI(); };
      lB.onclick = () => { if (!p.isBot) { bind = { idx, s: "L" }; renderUI(); } }; rB.onclick = () => { if (!p.isBot) { bind = { idx, s: "R" }; renderUI(); } };
      bot.onclick = () => { p.isBot = !p.isBot; p.active = true; sfx.playClick(); renderUI(); }; $("playersList").appendChild(row);
    });
    $("scoreboardList").innerHTML = "";
    [...act].sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((p) => {
      const r = S.runners.find((x) => x.id === p.id), eff = r && r.alive && r.effects.length ? ` <span class="score-effects">${sim.fmtStacks(r.effects)}</span>` : "";
      const d = document.createElement("div"); d.className = "score-row" + (r && !r.alive && S.state !== "LOBBY" ? " dead" : ""); d.style.borderLeftColor = p.color;
      d.innerHTML = `<div class="score-player-info"><div class="score-name" style="color:${p.color}"><span>${p.name}${p.isBot ? " 🤖" : ""}</span>${eff}</div><div class="score-keys">${p.isBot ? "AI Bot" : p.leftLabel + " / " + p.rightLabel}</div></div><div class="score-points" style="color:${p.color}">${p.score || 0}</div>`;
      $("scoreboardList").appendChild(d);
    });
    $("powerupGrid").innerHTML = "";
    cfg.powerupCatalog.forEach((it) => {
      const c = document.createElement("div"); c.className = `powerup-card target-${it.target}${it.enabled ? "" : " off"}`;
      c.innerHTML = `<div class="powerup-orb-preview">${it.icon}</div><div class="powerup-card-info"><div class="powerup-card-title">${it.name}</div><div class="powerup-card-desc">${it.desc}</div></div><input type="checkbox" ${it.enabled ? "checked" : ""} />`;
      c.onclick = () => { it.enabled = !it.enabled; sfx.playClick(); renderUI(); }; $("powerupGrid").appendChild(c);
    });
  }
  function startRound() {
    resize(); sim.initGrid(S.w, S.h); $("statusBanner").classList.add("hidden"); S.frame = 0; S.cd = 72; S.orbs = []; S.nextOrb = 90;
    if (players.filter((p) => p.active).length < 2) { players[0].active = players[1].active = true; renderUI(); }
    S.runners = players.filter((p) => p.active).map((p) => {
      const x = 90 + Math.random() * (S.w - 180), y = 90 + Math.random() * (S.h - 180);
      return { id: p.id, ref: p, name: p.name, color: p.color, isBot: p.isBot, leftKey: p.leftKey, rightKey: p.rightKey, x, y, angle: Math.atan2(S.h / 2 - y, S.w / 2 - x) + (Math.random() - 0.5), alive: true, inGap: false, nextGap: 160, gapRem: 0, botBias: 0, effects: [], sqCd: 0 };
    });
    S.state = "COUNTDOWN"; sfx.playRoundStart(); renderUI(); sim.draw(S);
  }
  function step() {
    if (S.state === "COUNTDOWN") { if (--S.cd <= 0) S.state = "PLAYING"; sim.draw(S); tapped.clear(); return; }
    if (S.state !== "PLAYING") { tapped.clear(); return; }
    if (cfg.powerupsEnabled && --S.nextOrb <= 0) {
      const pool = cfg.powerupCatalog.filter((p) => p.enabled);
      if (pool.length && S.orbs.length < cfg.powerupMaxOnScreen) { S.orbs.push({ x: 60 + Math.random() * (S.w - 120), y: 60 + Math.random() * (S.h - 120), radius: 15, def: pool[Math.floor(Math.random() * pool.length)], spawnFrame: S.frame }); sfx.playPowerupSpawn(); }
      S.nextOrb = Math.floor(140 / S.pwrF);
    }
    const dead = [], baseSpd = cfg.moveSpeed + (++S.frame / 60) * cfg.speedRampPerSec;
    S.runners.forEach((r) => {
      if (!r.alive) return;
      r.effects = r.effects.filter((e) => --e.rem > 0);
      const sp = sim.countEff(r, "speed"), sl = sim.countEff(r, "slow"), th = sim.countEff(r, "thick"), tn = sim.countEff(r, "thin"), wb = sim.countEff(r, "wobble"), rv = sim.countEff(r, "reverse") > 0, sq = sim.countEff(r, "square") > 0, gh = sim.countEff(r, "ghost") > 0, ww = cfg.wrapWalls || sim.countEff(r, "wallwalk") > 0 || gh;
      const spd = baseSpd * Math.max(0.2, Math.min(6, Math.pow(1.65, sp) * Math.pow(0.58, sl))), lw = Math.max(1, Math.min(64, cfg.lineWidth * Math.pow(2, th) * Math.pow(0.5, tn))), rad = lw * 0.5;
      if (r.sqCd > 0) r.sqCd--;
      if (sq) {
        let dir = r.isBot ? (r.sqCd === 0 ? sim.botSteer(S, r, rad, gh, ww) : 0) : (tapped.has(r.leftKey) ? -1 : 0) + (tapped.has(r.rightKey) ? 1 : 0);
        if (rv && !r.isBot) dir = -dir; if (dir !== 0) { r.angle += dir * (Math.PI / 2); r.sqCd = 14; }
      } else {
        let st = r.isBot ? sim.botSteer(S, r, rad, gh, ww) : (keys.has(r.leftKey) ? -1 : 0) + (keys.has(r.rightKey) ? 1 : 0);
        if (rv && !r.isBot) st = -st; if (wb > 0) st += Math.sin(S.frame * 0.24 + r.id) * 0.85 * wb; r.angle += st * cfg.turnSpeed;
      }
      const px = r.x, py = r.y; let nx = px + Math.cos(r.angle) * spd, ny = py + Math.sin(r.angle) * spd, wr = false;
      if (ww) { if (nx < 0 || nx >= S.w) { nx = (nx + S.w) % S.w; wr = true; } if (ny < 0 || ny >= S.h) { ny = (ny + S.h) % S.h; wr = true; } }
      r.x = nx; r.y = ny; r.curR = rad;
      for (let i = S.orbs.length - 1; i >= 0; i--) if (Math.hypot(nx - S.orbs[i].x, ny - S.orbs[i].y) <= rad + 17) {
        const d = S.orbs.splice(i, 1)[0].def; sfx.playPowerupPickup(d.target);
        if (d.type === "clear") { S.trailCtx.fillStyle = "#050507"; S.trailCtx.fillRect(0, 0, S.w, S.h); sim.initGrid(S.w, S.h); }
        else (d.target === "others" ? S.runners.filter((x) => x.alive && x.id !== r.id) : [r]).forEach((t) => t.effects.push({ type: d.type, icon: d.icon, col: d.target === "others" ? "#2ee65a" : "#ff3b30", rem: d.durationSec * 60, tot: d.durationSec * 60 }));
      }
      const grc = S.frame <= cfg.startGraceFrames;
      if (cfg.gapsEnabled && !grc && !gh) { if (r.inGap && --r.gapRem <= 0) { r.inGap = false; r.nextGap = 150 + Math.random() * 140; } else if (!r.inGap && --r.nextGap <= 0) { r.inGap = true; r.gapRem = 14; } }
      if ((!ww && (nx - rad <= 1 || nx + rad >= S.w - 1 || ny - rad <= 1 || ny + rad >= S.h - 1)) || (!grc && sim.hitAt(S, nx, ny, r.id, S.frame, rad * 0.85, Math.ceil((lw * 3.4) / spd) + 16, gh, ww))) { r.alive = false; dead.push(r); }
      if (!grc && !r.inGap && !wr && !gh) { S.trailCtx.strokeStyle = r.color; S.trailCtx.lineWidth = lw; S.trailCtx.lineCap = "round"; S.trailCtx.beginPath(); S.trailCtx.moveTo(px, py); S.trailCtx.lineTo(nx, ny); S.trailCtx.stroke(); sim.addSeg(px, py, nx, ny, r.id, S.frame, rad); }
    });
    tapped.clear();
    if (dead.length) { sfx.playCrash(); const surv = S.runners.filter((r) => r.alive); surv.forEach((s) => (s.ref.score = (s.ref.score || 0) + dead.length)); renderUI(); if (surv.length <= 1) { S.state = "ROUND_OVER"; sfx.playRoundEnd(); $("bannerTitle").textContent = surv[0] ? `${surv[0].name} wins the round!` : "Draw round!"; $("statusBanner").classList.remove("hidden"); } }
    sim.draw(S);
  }
  $("togglePowerupsBtn").onclick = () => $("powerupsSection").classList.toggle("hidden"); $("toggleTweaksBtn").onclick = () => $("tweaksSection").classList.toggle("hidden");
  $("btnAllPowerups").onclick = () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = true)); renderUI(); }; $("btnNoPowerups").onclick = () => { cfg.powerupsEnabled = false; cfg.powerupCatalog.forEach((p) => (p.enabled = false)); renderUI(); };
  $("btnGreenOnly").onclick = () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "others")); renderUI(); }; $("btnRedOnly").onclick = () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "self")); renderUI(); };
  $("addPlayerBtn").onclick = () => { const pr = EXTRA[players.length % EXTRA.length]; players.push({ ...pr, id: players.length, active: true, isBot: false, score: 0 }); renderUI(); }; $("addBotBtn").onclick = () => { const f = players.find((p) => !p.active); if (f) { f.active = f.isBot = true; } else $("addPlayerBtn").onclick(); renderUI(); };
  $("startGameBtn").onclick = () => { players.forEach((p) => (p.score = 0)); $("lobbyOverlay").classList.add("hidden"); startRound(); }; $("lobbyMenuBtn").onclick = () => { S.state = "LOBBY"; $("lobbyOverlay").classList.remove("hidden"); $("statusBanner").classList.add("hidden"); renderUI(); }; $("muteBtn").onclick = () => ($("muteBtn").textContent = sfx.toggleMute() ? "🔇 Sound: OFF" : "🔊 Sound: ON");
  window.addEventListener("keydown", (e) => { if (bind) { e.preventDefault(); const p = players[bind.idx], l = e.code.replace("Key", "").replace("Digit", ""); if (bind.s === "L") { p.leftKey = e.code; p.leftLabel = l; bind.s = "R"; } else { p.rightKey = e.code; p.rightLabel = l; bind = null; } renderUI(); return; } if (!keys.has(e.code)) tapped.add(e.code); keys.add(e.code); if (e.code === "Space") { e.preventDefault(); if (S.state === "LOBBY") $("startGameBtn").onclick(); else if (S.state === "ROUND_OVER") startRound(); } if (e.code === "Escape" && S.state !== "LOBBY") $("lobbyMenuBtn").onclick(); });
  window.addEventListener("keyup", (e) => keys.delete(e.code)); resize(); renderUI(); setInterval(step, 1000 / 60);
})();
