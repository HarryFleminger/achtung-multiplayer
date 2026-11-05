// ============================================================================
// CLIENT UI & INTERACTIVE LOBBY CONTROLLER (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG;
  const sfx = window.soundFX;
  const net = window.network;
  const $ = (id) => document.getElementById(id);

  const renderer = new window.GameRenderer($("trailCanvas"), $("headCanvas"), cfg);
  renderer.resize(800, 600);
  renderer.setVisible(false);

  let players = JSON.parse(JSON.stringify(cfg.defaultPlayers));
  let bindTarget = null;

  function renderRosterUI() {
    const activeCount = players.filter((p) => p.active).length;
    if ($("goalScoreDisplay")) $("goalScoreDisplay").textContent = Math.max(10, (Math.max(2, activeCount) - 1) * 10);
    const list = $("playersList");
    if (list) {
      list.innerHTML = "";
      players.forEach((p, idx) => {
        const row = document.createElement("div");
        row.className = "player-row" + (p.active ? " active" : "");
        const bL = bindTarget && bindTarget.idx === idx && bindTarget.side === "left";
        const bR = bindTarget && bindTarget.idx === idx && bindTarget.side === "right";
        row.innerHTML = `
          <button type="button" class="player-toggle">${p.active ? "✓" : ""}</button>
          <input type="color" class="color-swatch-input" value="${p.color}" />
          <input type="text" class="player-name-input" value="${p.name}" style="color:${p.color}" maxlength="16" />
          <button type="button" class="key-btn${bL ? " listening" : ""}">${bL ? "Press key..." : "⟲ " + p.leftLabel}</button>
          <button type="button" class="key-btn${bR ? " listening" : ""}">${bR ? "Press key..." : p.rightLabel + " ⟳"}</button>
          <button type="button" class="bot-btn${p.isBot ? " is-bot" : ""}">${p.isBot ? "🤖 Bot" : "👤 Human"}</button>
        `;
        const [tog, col, nam, lBtn, rBtn, bot] = row.children;
        tog.onclick = () => { p.active = !p.active; if (sfx) sfx.playClick(); renderRosterUI(); };
        col.oninput = (e) => { p.color = e.target.value; nam.style.color = p.color; renderRosterUI(); };
        nam.oninput = (e) => { p.name = e.target.value; };
        lBtn.onclick = () => { p.active = true; bindTarget = { idx, side: "left" }; renderRosterUI(); };
        rBtn.onclick = () => { p.active = true; bindTarget = { idx, side: "right" }; renderRosterUI(); };
        bot.onclick = () => { p.isBot = !p.isBot; p.active = true; if (sfx) sfx.playClick(); renderRosterUI(); };
        list.appendChild(row);
      });
    }
    const sb = $("scoreboardList");
    if (sb) {
      sb.innerHTML = "";
      players.filter((p) => p.active).forEach((p) => {
        const r = document.createElement("div");
        r.className = "score-row"; r.style.borderLeftColor = p.color;
        r.innerHTML = `<div class="score-player-info"><div class="score-name" style="color:${p.color}">${p.name}</div><div class="score-keys">${p.leftLabel} / ${p.rightLabel}</div></div><div class="score-points" style="color:${p.color}">${p.score || 0}</div>`;
        sb.appendChild(r);
      });
    }
  }

  window.addEventListener("keydown", (e) => {
    if (!bindTarget) return;
    e.preventDefault();
    const p = players[bindTarget.idx];
    const lbl = e.code.replace("Key", "").replace("Digit", "").replace("ArrowLeft", "←").replace("ArrowRight", "→");
    if (bindTarget.side === "left") { p.leftKey = e.code; p.leftLabel = lbl; bindTarget = { idx: bindTarget.idx, side: "right" }; }
    else { p.rightKey = e.code; p.rightLabel = lbl; bindTarget = null; }
    if (sfx) sfx.playClick();
    renderRosterUI();
  });

  if ($("addPlayerBtn")) $("addPlayerBtn").onclick = () => { players.push({ id: players.length, name: "Player " + (players.length + 1), color: "#bf5af2", active: true, isBot: false, leftKey: "KeyQ", leftLabel: "Q", rightKey: "KeyW", rightLabel: "W", score: 0 }); renderRosterUI(); };
  if ($("addBotBtn")) $("addBotBtn").onclick = () => { const inact = players.find((p) => !p.active); if (inact) { inact.active = true; inact.isBot = true; } renderRosterUI(); };
  if ($("startGameBtn")) $("startGameBtn").onclick = () => net.send({ type: "requestStart" });
  if ($("lobbyMenuBtn")) $("lobbyMenuBtn").onclick = () => net.send({ type: "abortMatch" });
  if ($("muteBtn")) $("muteBtn").onclick = () => { const m = sfx.toggleMute(); $("muteBtn").textContent = m ? "🔇 Sound: OFF" : "🔊 Sound: ON"; };

  net.on("countdown", () => { if (sfx) sfx.playClick(); });
  net.on("start", () => { if (sfx) sfx.playRoundStart(); });
  net.on("roundEnd", (msg) => {
    if (msg.scores) {
      players.forEach((p) => {
        if (typeof msg.scores[p.id] === "number") p.score = msg.scores[p.id];
      });
      renderRosterUI();
    }
    if (sfx) sfx.playRoundEnd();
  });
  net.on("returnToLobby", () => { renderer.clear(); renderer.setVisible(false); $("lobbyOverlay").classList.remove("hidden"); if (sfx) sfx.playClick(); });

  renderRosterUI();
})();
