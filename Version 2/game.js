// ============================================================================
// CLIENT UI: LOCK KEYBINDS TO OWNED COLOR SLOT, ROSTER & SCORE SYNC (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG, sfx = window.soundFX, net = window.network, $ = (id) => document.getElementById(id);
  const renderer = new window.GameRenderer($("trailCanvas"), $("headCanvas"), cfg);
  renderer.resize(800, 600); renderer.setVisible(false);
  const SLOT_NAMES = ["Fred", "Greenlee", "Pinkney", "Bluebell", "Willem", "Greydon"];
  let players = JSON.parse(JSON.stringify(cfg.defaultPlayers)).map((p, i) => ({ ...p, slotName: SLOT_NAMES[i] || p.name, hasCrown: false }));
  let slotOwners = {}, bindTarget = null;
  const hideWinPopup = () => { if ($("win-popup")) $("win-popup").style.display = "none"; };

  function renderRosterUI() {
    if (bindTarget && slotOwners[players[bindTarget.idx].slotName] !== net.clientId) bindTarget = null;
    const list = $("playersList");
    if (list) {
      list.innerHTML = "";
      players.forEach((p, idx) => {
        const ownerId = slotOwners[p.slotName] ?? null;
        const isMine = Boolean(net.clientId && ownerId === net.clientId), isOther = Boolean(ownerId && ownerId !== net.clientId);
        if (Object.keys(slotOwners).length > 0) p.active = Boolean(ownerId);
        if (isMine && window.setMyKeys) window.setMyKeys(p.leftKey, p.rightKey);
        const row = document.createElement("div");
        row.className = "player-row" + (p.active ? " active" : ""); row.dataset.slot = p.slotName; row.style.opacity = isOther ? "0.45" : "1";
        const bL = isMine && bindTarget && bindTarget.idx === idx && bindTarget.side === "left", bR = isMine && bindTarget && bindTarget.idx === idx && bindTarget.side === "right";
        const dis = isOther ? "disabled" : "", keyDis = isMine ? "" : "disabled";
        row.innerHTML = `<button type="button" class="player-toggle" ${dis}>${p.active ? "✓" : ""}</button><input type="color" class="color-swatch-input" value="${p.color}" ${keyDis} /><input type="text" class="player-name-input" value="${p.name}" style="color:${p.color}" maxlength="16" ${keyDis} /><button type="button" class="key-btn${bL ? " listening" : ""}" ${keyDis}>${bL ? "Press key..." : "⟲ " + p.leftLabel}</button><button type="button" class="key-btn${bR ? " listening" : ""}" ${keyDis}>${bR ? "Press key..." : p.rightLabel + " ⟳"}</button><button type="button" class="bot-btn${p.isBot ? " is-bot" : ""}" ${keyDis}>${isMine ? "👤 You" : isOther ? "🔒 Taken" : "⚪ Free"}</button>`;
        const [tog, col, nam, lBtn, rBtn, bot] = row.children;
        lBtn.disabled = rBtn.disabled = !isMine; lBtn.style.opacity = rBtn.style.opacity = isMine ? "1" : "0.35"; lBtn.style.cursor = rBtn.style.cursor = isMine ? "pointer" : "not-allowed";
        tog.onclick = () => { if (isOther) return; if (sfx) sfx.playClick(); if (net.connected) net.send({ type: "claimSlot", slot: p.slotName }); else { p.active = !p.active; renderRosterUI(); } };
        col.oninput = (e) => { if (isMine) { p.color = e.target.value; nam.style.color = p.color; renderRosterUI(); } };
        nam.oninput = (e) => { if (isMine) p.name = e.target.value.replace(/ 👑/g, ""); };
        lBtn.onclick = () => { if (isMine) { bindTarget = { idx, side: "left" }; renderRosterUI(); } };
        rBtn.onclick = () => { if (isMine) { bindTarget = { idx, side: "right" }; renderRosterUI(); } };
        bot.onclick = () => { if (isMine) { p.isBot = !p.isBot; if (sfx) sfx.playClick(); renderRosterUI(); } };
        list.appendChild(row);
      });
    }
    const sb = $("scoreboardList");
    if (sb) {
      sb.innerHTML = "";
      players.filter((p) => p.active).forEach((p) => {
        const r = document.createElement("div"); r.className = "score-row"; r.dataset.playerId = p.id; r.style.borderLeftColor = p.color;
        const cleanName = p.name.replace(/ 👑/g, "") + (p.hasCrown ? " 👑" : "");
        r.innerHTML = `<div class="score-player-info"><div class="score-name" style="color:${p.color}">${cleanName}</div><div class="score-keys">${p.leftLabel} / ${p.rightLabel}</div></div><div class="score-points" style="color:${p.color}">${p.score || 0}</div>`;
        sb.appendChild(r);
      });
    }
  }

  window.addEventListener("keybindchange", (e) => {
    const mine = players.find((p) => slotOwners[p.slotName] === net.clientId);
    if (mine && e.detail) { mine.leftKey = mine.leftLabel = e.detail.left; mine.rightKey = mine.rightLabel = e.detail.right; renderRosterUI(); }
  });
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !bindTarget) hideWinPopup();
    if (!bindTarget) return;
    e.preventDefault(); const p = players[bindTarget.idx], k = e.key === " " ? "Space" : e.key;
    if (bindTarget.side === "left") { p.leftKey = p.leftLabel = k; if (window.setMyKeys) window.setMyKeys(k, null); bindTarget = { idx: bindTarget.idx, side: "right" }; }
    else { p.rightKey = p.rightLabel = k; if (window.setMyKeys) window.setMyKeys(null, k); bindTarget = null; }
    if (sfx) sfx.playClick(); renderRosterUI();
  });

  if ($("startGameBtn")) $("startGameBtn").onclick = () => { hideWinPopup(); net.send({ type: "requestStart" }); };
  if ($("reset-scores-btn")) $("reset-scores-btn").onclick = () => { if (sfx) sfx.playClick(); net.send({ type: "resetScores" }); };
  if ($("lobbyMenuBtn")) $("lobbyMenuBtn").onclick = () => { hideWinPopup(); net.send({ type: "abortMatch" }); };
  if ($("muteBtn")) $("muteBtn").onclick = () => { const m = sfx.toggleMute(); $("muteBtn").textContent = m ? "🔇 Sound: OFF" : "🔊 Sound: ON"; };

  net.on("assigned", () => renderRosterUI());
  net.on("rosterSync", (msg) => { slotOwners = msg.slots || {}; renderRosterUI(); });
  net.on("scoreSync", (msg) => { players.forEach((p) => { p.score = (msg.scores && msg.scores[p.id]) || 0; p.hasCrown = false; p.name = p.name.replace(/ 👑/g, ""); }); hideWinPopup(); renderRosterUI(); });
  net.on("countdown", () => { hideWinPopup(); if (sfx) sfx.playClick(); });
  net.on("start", () => { hideWinPopup(); if (sfx) sfx.playRoundStart(); });
  net.on("roundEnd", (msg) => {
    if (msg.scores) players.forEach((p) => { if (typeof msg.scores[p.id] === "number") p.score = msg.scores[p.id]; });
    if (msg.matchWinner !== undefined && msg.matchWinner !== null) {
      const w = players.find((p) => p.id === msg.matchWinner); if (w) w.hasCrown = true;
      const pop = $("win-popup");
      if (pop) { pop.innerHTML = `<div class="banner-title">🏆 ${w ? w.name.replace(/ 👑/g, "") : "Player"} Wins the Match!</div><div class="banner-sub">Press <kbd>SPACE</kbd> for next round</div>`; pop.style.display = "block"; }
    }
    renderRosterUI(); if (sfx) sfx.playRoundEnd();
  });
  net.on("returnToLobby", () => { hideWinPopup(); renderer.clear(); renderer.setVisible(false); $("lobbyOverlay").classList.remove("hidden"); if (sfx) sfx.playClick(); });
  renderRosterUI();
})();
