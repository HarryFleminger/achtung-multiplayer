// ============================================================================
// CLIENT UI: REAL-TIME LOBBY SYNC & COLOR SLOT LOCKING (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG;
  const sfx = window.soundFX;
  const net = window.network;
  const $ = (id) => document.getElementById(id);

  const renderer = new window.GameRenderer($("trailCanvas"), $("headCanvas"), cfg);
  renderer.resize(800, 600);
  renderer.setVisible(false);

  const SLOT_NAMES = ["Fred", "Greenlee", "Pinkney", "Bluebell", "Willem", "Greydon"];
  let players = JSON.parse(JSON.stringify(cfg.defaultPlayers)).map((p, i) => ({ ...p, slotName: SLOT_NAMES[i] || p.name }));
  let slotOwners = {};
  let bindTarget = null;

  function renderRosterUI() {
    const activeCount = players.filter((p) => p.active).length;
    if ($("goalScoreDisplay")) $("goalScoreDisplay").textContent = Math.max(10, (Math.max(2, activeCount) - 1) * 10);
    const list = $("playersList");
    if (list) {
      list.innerHTML = "";
      players.forEach((p, idx) => {
        const ownerId = slotOwners[p.slotName] ?? null;
        const isMine = Boolean(net.clientId && ownerId === net.clientId);
        const isOther = Boolean(ownerId && ownerId !== net.clientId);
        if (Object.keys(slotOwners).length > 0) p.active = Boolean(ownerId);

        const row = document.createElement("div");
        row.className = "player-row" + (p.active ? " active" : "");
        row.dataset.slot = p.slotName;
        row.style.opacity = isOther ? "0.45" : "1";
        const bL = bindTarget && bindTarget.idx === idx && bindTarget.side === "left";
        const bR = bindTarget && bindTarget.idx === idx && bindTarget.side === "right";
        const dis = isOther ? "disabled" : "";
        row.innerHTML = `<button type="button" class="player-toggle" ${dis}>${p.active ? "✓" : ""}</button><input type="color" class="color-swatch-input" value="${p.color}" ${dis} /><input type="text" class="player-name-input" value="${p.name}" style="color:${p.color}" maxlength="16" ${dis} /><button type="button" class="key-btn${bL ? " listening" : ""}" ${dis}>${bL ? "Press key..." : "⟲ " + p.leftLabel}</button><button type="button" class="key-btn${bR ? " listening" : ""}" ${dis}>${bR ? "Press key..." : p.rightLabel + " ⟳"}</button><button type="button" class="bot-btn${p.isBot ? " is-bot" : ""}" ${dis}>${isMine ? "👤 You" : isOther ? "🔒 Taken" : p.isBot ? "🤖 Bot" : "👤 Human"}</button>`;
        const [tog, col, nam, lBtn, rBtn, bot] = row.children;
        tog.onclick = () => {
          if (isOther) return;
          if (sfx) sfx.playClick();
          if (net.connected) net.send({ type: "claimSlot", slot: p.slotName });
          else { p.active = !p.active; renderRosterUI(); }
        };
        col.oninput = (e) => { p.color = e.target.value; nam.style.color = p.color; renderRosterUI(); };
        nam.oninput = (e) => { p.name = e.target.value; };
        lBtn.onclick = () => { if (!isOther) { bindTarget = { idx, side: "left" }; renderRosterUI(); } };
        rBtn.onclick = () => { if (!isOther) { bindTarget = { idx, side: "right" }; renderRosterUI(); } };
        bot.onclick = () => { if (!isOther) { p.isBot = !p.isBot; if (sfx) sfx.playClick(); renderRosterUI(); } };
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

  if ($("startGameBtn")) $("startGameBtn").onclick = () => net.send({ type: "requestStart" });
  if ($("lobbyMenuBtn")) $("lobbyMenuBtn").onclick = () => net.send({ type: "abortMatch" });
  if ($("muteBtn")) $("muteBtn").onclick = () => { const m = sfx.toggleMute(); $("muteBtn").textContent = m ? "🔇 Sound: OFF" : "🔊 Sound: ON"; };

  net.on("assigned", () => renderRosterUI());
  net.on("rosterSync", (msg) => { slotOwners = msg.slots || {}; renderRosterUI(); });
  net.on("countdown", () => { if (sfx) sfx.playClick(); });
  net.on("start", () => { if (sfx) sfx.playRoundStart(); });
  net.on("roundEnd", (msg) => {
    if (msg.scores) { players.forEach((p) => { if (typeof msg.scores[p.id] === "number") p.score = msg.scores[p.id]; }); renderRosterUI(); }
    if (sfx) sfx.playRoundEnd();
  });
  net.on("returnToLobby", () => { renderer.clear(); renderer.setVisible(false); $("lobbyOverlay").classList.remove("hidden"); if (sfx) sfx.playClick(); });
  renderRosterUI();
})();
