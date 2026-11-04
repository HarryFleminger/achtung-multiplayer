// ============================================================================
// ACHTUNG, DIE KURVE! (VERSION 2) - CORE ENGINE, STACKING POWER-UPS & AI BOTS
// ============================================================================

(function () {
  const cfg = window.ACHTUNG_CONFIG;
  const sfx = window.soundFX;

  // DOM Elements
  const arenaWrapper = document.getElementById("arenaWrapper");
  const trailCanvas = document.getElementById("trailCanvas");
  const headCanvas = document.getElementById("headCanvas");
  const trailCtx = trailCanvas.getContext("2d");
  const headCtx = headCanvas.getContext("2d");

  const lobbyOverlay = document.getElementById("lobbyOverlay");
  const playersListEl = document.getElementById("playersList");
  const scoreboardListEl = document.getElementById("scoreboardList");
  const goalScoreDisplay = document.getElementById("goalScoreDisplay");
  const powerupFeedEl = document.getElementById("powerupFeed");
  const statusBanner = document.getElementById("statusBanner");
  const bannerTitle = document.getElementById("bannerTitle");
  const bannerSub = document.getElementById("bannerSub");

  // Buttons & Tweaks UI
  const togglePowerupsBtn = document.getElementById("togglePowerupsBtn");
  const powerupsSection = document.getElementById("powerupsSection");
  const powerupGridEl = document.getElementById("powerupGrid");
  const chkPowerupsEnabled = document.getElementById("chkPowerupsEnabled");
  const btnAllPowerups = document.getElementById("btnAllPowerups");
  const btnGreenOnly = document.getElementById("btnGreenOnly");
  const btnRedOnly = document.getElementById("btnRedOnly");
  const btnNoPowerups = document.getElementById("btnNoPowerups");
  const inpPowerFreq = document.getElementById("inpPowerFreq");
  const valPowerFreq = document.getElementById("valPowerFreq");
  const inpPowerMax = document.getElementById("inpPowerMax");
  const valPowerMax = document.getElementById("valPowerMax");

  const toggleTweaksBtn = document.getElementById("toggleTweaksBtn");
  const tweaksSection = document.getElementById("tweaksSection");
  const addPlayerBtn = document.getElementById("addPlayerBtn");
  const addBotBtn = document.getElementById("addBotBtn");
  const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  const lobbyMenuBtn = document.getElementById("lobbyMenuBtn");
  const muteBtn = document.getElementById("muteBtn");

  // Physics Sliders & Checkboxes
  const inpMoveSpeed = document.getElementById("inpMoveSpeed");
  const valMoveSpeed = document.getElementById("valMoveSpeed");
  const inpTurnSpeed = document.getElementById("inpTurnSpeed");
  const valTurnSpeed = document.getElementById("valTurnSpeed");
  const inpLineWidth = document.getElementById("inpLineWidth");
  const valLineWidth = document.getElementById("valLineWidth");
  const inpGapFreq = document.getElementById("inpGapFreq");
  const valGapFreq = document.getElementById("valGapFreq");
  const inpGapSize = document.getElementById("inpGapSize");
  const valGapSize = document.getElementById("valGapSize");
  const inpSpeedRamp = document.getElementById("inpSpeedRamp");
  const valSpeedRamp = document.getElementById("valSpeedRamp");

  const chkGapsEnabled = document.getElementById("chkGapsEnabled");
  const chkWrapWalls = document.getElementById("chkWrapWalls");
  const chkSelfCollision = document.getElementById("chkSelfCollision");
  const chkAutoGoal = document.getElementById("chkAutoGoal");
  const customGoalWrap = document.getElementById("customGoalWrap");
  const inpCustomGoal = document.getElementById("inpCustomGoal");

  const EXTRA_PALETTE = [
    { name: "Violet", color: "#bf5af2", leftKey: "KeyQ", leftLabel: "Q", rightKey: "KeyW", rightLabel: "W" },
    { name: "Minty", color: "#66d4cf", leftKey: "KeyI", leftLabel: "I", rightKey: "KeyO", rightLabel: "O" },
    { name: "Sunny", color: "#ffd60a", leftKey: "KeyN", leftLabel: "N", rightKey: "KeyM", rightLabel: "M" },
    { name: "Coral", color: "#ff6961", leftKey: "KeyG", leftLabel: "G", rightKey: "KeyH", rightLabel: "H" },
  ];

  // State
  let gameState = "LOBBY"; // "LOBBY" | "COUNTDOWN" | "PLAYING" | "PAUSED" | "ROUND_OVER" | "MATCH_OVER"
  let players = JSON.parse(JSON.stringify(cfg.defaultPlayers));
  let pressedKeys = new Set();
  let justPressedKeys = new Set();
  let listeningKeyTarget = null;

  let arenaWidth = 800;
  let arenaHeight = 600;
  let goalScore = 10;

  // Multipliers
  let gapFreqMultiplier = 1.0;
  let gapSizeMultiplier = 1.0;
  let powerupFreqMultiplier = 1.0;

  // Spatial Grid for Collision
  const GRID_CELL_SIZE = 24;
  let gridCols = 0;
  let gridRows = 0;
  let spatialGrid = [];
  let roundFrame = 0;
  let countdownFramesLeft = 0;
  let activeRunners = [];

  // Power-ups in Arena
  let arenaPowerups = [];
  let framesUntilNextPowerup = 150;
  let feedMessages = [];

  // Fixed 60 FPS timestep accumulator
  const FIXED_STEP_MS = 1000 / 60;
  let lastFrameTime = performance.now();
  let accumulator = 0;

  // ============================================================================
  // INITIALIZATION & STORAGE
  // ============================================================================

  function loadSavedSettings() {
    try {
      const savedPlayers = localStorage.getItem("achtung_v2_players");
      if (savedPlayers) {
        const parsed = JSON.parse(savedPlayers);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          players = parsed;
        }
      }
      const savedPowerups = localStorage.getItem("achtung_v2_powerups_v2");
      if (savedPowerups) {
        const enabledMap = JSON.parse(savedPowerups);
        cfg.powerupCatalog.forEach((item) => {
          if (typeof enabledMap[item.id] === "boolean") {
            item.enabled = enabledMap[item.id];
          }
        });
      }
    } catch (e) {
      // Ignore storage errors
    }
    players.forEach((p, idx) => {
      p.id = idx;
      p.score = 0;
      p.alive = true;
    });
  }

  function savePlayersToStorage() {
    try {
      const clean = players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        active: p.active,
        isBot: p.isBot,
        leftKey: p.leftKey,
        leftLabel: p.leftLabel,
        rightKey: p.rightKey,
        rightLabel: p.rightLabel,
      }));
      localStorage.setItem("achtung_v2_players", JSON.stringify(clean));
    } catch (e) {}
  }

  function savePowerupsToStorage() {
    try {
      const map = {};
      cfg.powerupCatalog.forEach((item) => {
        map[item.id] = item.enabled;
      });
      localStorage.setItem("achtung_v2_powerups_v2", JSON.stringify(map));
    } catch (e) {}
  }

  function resizeCanvases() {
    const rect = arenaWrapper.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(240, Math.floor(rect.height));

    if (gameState === "LOBBY" || trailCanvas.width === 0) {
      arenaWidth = w;
      arenaHeight = h;
      trailCanvas.width = arenaWidth;
      trailCanvas.height = arenaHeight;
      headCanvas.width = arenaWidth;
      headCanvas.height = arenaHeight;
      clearArena();
    }
  }

  window.addEventListener("resize", resizeCanvases);

  function clearArena() {
    trailCtx.fillStyle = "#050507";
    trailCtx.fillRect(0, 0, arenaWidth, arenaHeight);
    headCtx.clearRect(0, 0, arenaWidth, arenaHeight);
  }

  // ============================================================================
  // SPATIAL HASH GRID FOR EXACT SEGMENT COLLISION
  // ============================================================================

  function initSpatialGrid() {
    gridCols = Math.ceil(arenaWidth / GRID_CELL_SIZE) + 1;
    gridRows = Math.ceil(arenaHeight / GRID_CELL_SIZE) + 1;
    spatialGrid = new Array(gridCols * gridRows);
    for (let i = 0; i < spatialGrid.length; i++) {
      spatialGrid[i] = [];
    }
  }

  function addSegmentToGrid(x1, y1, x2, y2, playerId, stepIndex, radius) {
    const minX = Math.max(0, Math.floor((Math.min(x1, x2) - radius) / GRID_CELL_SIZE));
    const maxX = Math.min(gridCols - 1, Math.floor((Math.max(x1, x2) + radius) / GRID_CELL_SIZE));
    const minY = Math.max(0, Math.floor((Math.min(y1, y2) - radius) / GRID_CELL_SIZE));
    const maxY = Math.min(gridRows - 1, Math.floor((Math.max(y1, y2) + radius) / GRID_CELL_SIZE));

    const seg = { x1, y1, x2, y2, playerId, stepIndex, radius };

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        spatialGrid[cy * gridCols + cx].push(seg);
      }
    }
  }

  function distToSegmentSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ex = px - x1;
      const ey = py - y1;
      return ex * ex + ey * ey;
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const ex = px - projX;
    const ey = py - projY;
    return ex * ex + ey * ey;
  }

  function checkCollisionAtPoint(
    px,
    py,
    runnerId,
    currentStep,
    runnerRadius,
    ignoreGraceSelfFrames,
    ignoreTrails = false,
    canWrapWalls = false
  ) {
    if (!canWrapWalls) {
      if (
        px - runnerRadius <= 1 ||
        px + runnerRadius >= arenaWidth - 1 ||
        py - runnerRadius <= 1 ||
        py + runnerRadius >= arenaHeight - 1
      ) {
        return true;
      }
    }

    if (ignoreTrails) return false;

    const minCX = Math.max(0, Math.floor((px - runnerRadius) / GRID_CELL_SIZE));
    const maxCX = Math.min(gridCols - 1, Math.floor((px + runnerRadius) / GRID_CELL_SIZE));
    const minCY = Math.max(0, Math.floor((py - runnerRadius) / GRID_CELL_SIZE));
    const maxCY = Math.min(gridRows - 1, Math.floor((py + runnerRadius) / GRID_CELL_SIZE));

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = spatialGrid[cy * gridCols + cx];
        for (let i = 0; i < cell.length; i++) {
          const seg = cell[i];
          if (seg.playerId === runnerId) {
            if (!cfg.selfCollision) continue;
            if (currentStep - seg.stepIndex <= ignoreGraceSelfFrames) continue;
          }
          const hitDist = runnerRadius + seg.radius * 0.88;
          if (distToSegmentSq(px, py, seg.x1, seg.y1, seg.x2, seg.y2) < hitDist * hitDist) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ============================================================================
  // POWER-UP UI & STACKING LOGIC
  // ============================================================================

  function countEffects(runner, effectType) {
    let count = 0;
    for (let i = 0; i < runner.effects.length; i++) {
      if (runner.effects[i].type === effectType) count++;
    }
    return count;
  }

  function formatEffectStacks(effects) {
    const counts = new Map();
    const icons = new Map();
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      counts.set(e.type, (counts.get(e.type) || 0) + 1);
      icons.set(e.type, e.icon);
    }
    const parts = [];
    counts.forEach((cnt, type) => {
      const ic = icons.get(type);
      parts.push(cnt > 1 ? `${ic}×${cnt}` : ic);
    });
    return parts.join(" ");
  }

  function renderPowerupGrid() {
    powerupGridEl.innerHTML = "";
    cfg.powerupCatalog.forEach((item) => {
      const card = document.createElement("div");
      card.className =
        `powerup-card target-${item.target}` + (item.enabled ? "" : " off");

      const orb = document.createElement("div");
      orb.className = "powerup-orb-preview";
      orb.textContent = item.icon;

      const info = document.createElement("div");
      info.className = "powerup-card-info";

      const title = document.createElement("div");
      title.className = "powerup-card-title";
      title.textContent = item.name;

      const desc = document.createElement("div");
      desc.className = "powerup-card-desc";
      desc.textContent = item.desc;

      info.appendChild(title);
      info.appendChild(desc);

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = item.enabled;
      chk.style.accentColor = item.target === "others" ? "#2ee65a" : "#ff3b30";
      chk.style.width = "16px";
      chk.style.height = "16px";
      chk.style.cursor = "pointer";

      card.addEventListener("click", (e) => {
        if (e.target !== chk) {
          chk.checked = !chk.checked;
        }
        item.enabled = chk.checked;
        sfx.playClick();
        savePowerupsToStorage();
        renderPowerupGrid();
      });

      card.appendChild(orb);
      card.appendChild(info);
      card.appendChild(chk);
      powerupGridEl.appendChild(card);
    });
  }

  function addFeedMessage(text, targetType) {
    feedMessages.unshift({ text, targetType, id: Date.now() + Math.random() });
    if (feedMessages.length > 4) {
      feedMessages.pop();
    }
    renderFeed();
  }

  function renderFeed() {
    if (!powerupFeedEl) return;
    powerupFeedEl.innerHTML = "";
    if (feedMessages.length === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "0.72rem";
      empty.style.color = "var(--text-muted)";
      empty.textContent = cfg.powerupsEnabled
        ? "Collect 🟢 Green (others) or 🔴 Red (you) orbs — effects stack!"
        : "Power-ups disabled for this mode.";
      powerupFeedEl.appendChild(empty);
      return;
    }
    feedMessages.forEach((m) => {
      const el = document.createElement("div");
      el.className = `feed-item ${m.targetType}`;
      el.textContent = m.text;
      powerupFeedEl.appendChild(el);
    });
  }

  function randomPowerupInterval() {
    const min = cfg.powerupSpawnMinFrames / powerupFreqMultiplier;
    const max = cfg.powerupSpawnMaxFrames / powerupFreqMultiplier;
    return Math.max(35, Math.floor(min + Math.random() * (max - min)));
  }

  function spawnArenaPowerup() {
    if (!cfg.powerupsEnabled) return;
    const enabledPool = cfg.powerupCatalog.filter((p) => p.enabled);
    if (enabledPool.length === 0) return;
    if (arenaPowerups.length >= cfg.powerupMaxOnScreen) return;

    const def = enabledPool[Math.floor(Math.random() * enabledPool.length)];
    const margin = 55;
    let px = arenaWidth / 2;
    let py = arenaHeight / 2;

    for (let attempt = 0; attempt < 25; attempt++) {
      const cx = margin + Math.random() * Math.max(40, arenaWidth - margin * 2);
      const cy = margin + Math.random() * Math.max(40, arenaHeight - margin * 2);
      let tooClose = false;
      for (const r of activeRunners) {
        if (r.alive && Math.hypot(cx - r.x, cy - r.y) < 75) {
          tooClose = true;
          break;
        }
      }
      for (const orb of arenaPowerups) {
        if (Math.hypot(cx - orb.x, cy - orb.y) < 50) {
          tooClose = true;
          break;
        }
      }
      px = cx;
      py = cy;
      if (!tooClose) break;
    }

    arenaPowerups.push({
      x: px,
      y: py,
      radius: cfg.powerupOrbRadius,
      def: def,
      spawnFrame: roundFrame,
    });
    sfx.playPowerupSpawn();
  }

  function applyPowerupEffect(collector, orb) {
    const def = orb.def;
    sfx.playPowerupPickup(def.target);

    if (def.type === "clear") {
      trailCtx.fillStyle = "#050507";
      trailCtx.fillRect(0, 0, arenaWidth, arenaHeight);
      initSpatialGrid();
      addFeedMessage(`${collector.name} triggered ${def.icon} Clean Slate!`, def.target);
      return;
    }

    const durationFrames = Math.round(def.durationSec * 60);
    const targets =
      def.target === "others"
        ? activeRunners.filter((r) => r.alive && r.id !== collector.id)
        : [collector];

    targets.forEach((t) => {
      // Every collected orb pushes a stack onto t.effects so effects stack!
      t.effects.push({
        type: def.type,
        icon: def.icon,
        name: def.name,
        targetType: def.target,
        targetColor: def.target === "others" ? "#2ee65a" : "#ff3b30",
        remainingFrames: durationFrames,
        totalFrames: durationFrames,
      });

      if (def.type === "square") {
        t.squareCooldown = 0;
      }
    });

    const stackCountOnTarget = targets[0] ? countEffects(targets[0], def.type) : 1;
    const stackBadge = stackCountOnTarget > 1 ? ` (×${stackCountOnTarget} STACK!)` : "";
    const targetLabel = def.target === "others" ? "→ OTHERS" : "→ SELF";
    addFeedMessage(
      `${collector.name}: ${def.icon} ${def.name}${stackBadge} (${targetLabel})`,
      def.target
    );
    renderScoreboard();
  }

  // ============================================================================
  // LOBBY & PLAYER UI RENDERING
  // ============================================================================

  function formatKeyLabel(code, key) {
    if (code === "ArrowLeft") return "←";
    if (code === "ArrowRight") return "→";
    if (code === "ArrowUp") return "↑";
    if (code === "ArrowDown") return "↓";
    if (code === "Space") return "SPACE";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code.startsWith("Numpad")) return "NP " + code.slice(6);
    if (code === "ControlLeft") return "L-Ctrl";
    if (code === "ControlRight") return "R-Ctrl";
    if (code === "ShiftLeft") return "L-Shift";
    if (code === "ShiftRight") return "R-Shift";
    if (code === "AltLeft") return "L-Alt";
    if (code === "AltRight") return "R-Alt";
    if (code === "MetaLeft") return "L-Cmd";
    if (code === "MetaRight") return "R-Cmd";
    if (code === "Comma") return ",";
    if (code === "Period") return ".";
    if (code === "Slash") return "/";
    if (code === "Semicolon") return ";";
    if (code === "Quote") return "'";
    if (code === "BracketLeft") return "[";
    if (code === "BracketRight") return "]";
    if (code === "Backquote") return "`";
    if (code === "Minus") return "-";
    if (code === "Equal") return "=";
    return key && key.length === 1 ? key.toUpperCase() : code;
  }

  function updateGoalScore() {
    const activeCount = players.filter((p) => p.active).length;
    if (cfg.autoGoalScore) {
      goalScore = Math.max(10, (Math.max(2, activeCount) - 1) * 10);
    } else {
      goalScore = Math.max(1, parseInt(inpCustomGoal.value, 10) || 20);
    }
    goalScoreDisplay.textContent = goalScore;
  }

  function renderLobbyPlayers() {
    playersListEl.innerHTML = "";
    players.forEach((p, index) => {
      const row = document.createElement("div");
      row.className = "player-row" + (p.active ? " active" : "");

      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "player-toggle";
      toggleBtn.textContent = p.active ? "✓" : "";
      toggleBtn.title = "Toggle player active";
      toggleBtn.addEventListener("click", () => {
        p.active = !p.active;
        sfx.playClick();
        savePlayersToStorage();
        renderLobbyPlayers();
        renderScoreboard();
      });

      const colorInp = document.createElement("input");
      colorInp.type = "color";
      colorInp.className = "color-swatch-input";
      colorInp.value = p.color;
      colorInp.title = "Change player color";
      colorInp.addEventListener("input", (e) => {
        p.color = e.target.value;
        nameInp.style.color = p.color;
        savePlayersToStorage();
        renderScoreboard();
      });

      const nameInp = document.createElement("input");
      nameInp.type = "text";
      nameInp.className = "player-name-input";
      nameInp.value = p.name;
      nameInp.style.color = p.color;
      nameInp.maxLength = 16;
      nameInp.addEventListener("input", (e) => {
        p.name = e.target.value || `Player ${index + 1}`;
        savePlayersToStorage();
        renderScoreboard();
      });

      const leftBtn = document.createElement("button");
      leftBtn.type = "button";
      const isListeningLeft =
        listeningKeyTarget &&
        listeningKeyTarget.playerIndex === index &&
        listeningKeyTarget.side === "left";
      leftBtn.className = "key-btn" + (isListeningLeft ? " listening" : "");
      leftBtn.textContent = isListeningLeft
        ? "Press key..."
        : p.isBot
        ? "🤖 AI Left"
        : `⟲ ${p.leftLabel}`;
      leftBtn.disabled = p.isBot;
      leftBtn.addEventListener("click", () => {
        p.active = true;
        listeningKeyTarget = { playerIndex: index, side: "left" };
        sfx.playClick();
        renderLobbyPlayers();
      });

      const rightBtn = document.createElement("button");
      rightBtn.type = "button";
      const isListeningRight =
        listeningKeyTarget &&
        listeningKeyTarget.playerIndex === index &&
        listeningKeyTarget.side === "right";
      rightBtn.className = "key-btn" + (isListeningRight ? " listening" : "");
      rightBtn.textContent = isListeningRight
        ? "Press key..."
        : p.isBot
        ? "🤖 AI Right"
        : `${p.rightLabel} ⟳`;
      rightBtn.disabled = p.isBot;
      rightBtn.addEventListener("click", () => {
        p.active = true;
        listeningKeyTarget = { playerIndex: index, side: "right" };
        sfx.playClick();
        renderLobbyPlayers();
      });

      const botBtn = document.createElement("button");
      botBtn.type = "button";
      botBtn.className = "bot-btn" + (p.isBot ? " is-bot" : "");
      botBtn.textContent = p.isBot ? "🤖 Bot" : "👤 Human";
      botBtn.title = "Switch between Human and AI Bot";
      botBtn.addEventListener("click", () => {
        p.isBot = !p.isBot;
        p.active = true;
        sfx.playClick();
        savePlayersToStorage();
        renderLobbyPlayers();
        renderScoreboard();
      });

      row.appendChild(toggleBtn);
      row.appendChild(colorInp);
      row.appendChild(nameInp);
      row.appendChild(leftBtn);
      row.appendChild(rightBtn);
      row.appendChild(botBtn);
      playersListEl.appendChild(row);
    });

    updateGoalScore();
  }

  function renderScoreboard() {
    updateGoalScore();
    scoreboardListEl.innerHTML = "";
    const activePlayers = players.filter((p) => p.active);
    const sorted = [...activePlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

    sorted.forEach((p) => {
      const runner = activeRunners.find((r) => r.id === p.id);
      const isDead = runner && !runner.alive && (gameState === "PLAYING" || gameState === "ROUND_OVER");

      const row = document.createElement("div");
      row.className = "score-row" + (isDead ? " dead" : "");
      row.style.borderLeftColor = p.color;

      const info = document.createElement("div");
      info.className = "score-player-info";

      const nameEl = document.createElement("div");
      nameEl.className = "score-name";
      nameEl.style.color = p.color;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = p.name + (p.isBot ? " 🤖" : "");
      nameEl.appendChild(nameSpan);

      // Show active stacked power-up badges next to player name in scoreboard
      if (runner && runner.alive && runner.effects && runner.effects.length > 0) {
        const effSpan = document.createElement("span");
        effSpan.className = "score-effects";
        effSpan.textContent = formatEffectStacks(runner.effects);
        nameEl.appendChild(effSpan);
      }

      const keysEl = document.createElement("div");
      keysEl.className = "score-keys";
      keysEl.textContent = p.isBot ? "AI Bot" : `${p.leftLabel} / ${p.rightLabel}`;

      info.appendChild(nameEl);
      info.appendChild(keysEl);

      const ptsEl = document.createElement("div");
      ptsEl.className = "score-points";
      ptsEl.style.color = p.color;
      ptsEl.textContent = p.score || 0;

      row.appendChild(info);
      row.appendChild(ptsEl);
      scoreboardListEl.appendChild(row);
    });
  }

  // ============================================================================
  // TWEAKS & PRESETS
  // ============================================================================

  function syncTweaksUI() {
    inpMoveSpeed.value = cfg.moveSpeed;
    valMoveSpeed.textContent = cfg.moveSpeed.toFixed(2);

    inpTurnSpeed.value = cfg.turnSpeed;
    valTurnSpeed.textContent = cfg.turnSpeed.toFixed(3);

    inpLineWidth.value = cfg.lineWidth;
    valLineWidth.textContent = cfg.lineWidth.toFixed(1) + "px";

    inpGapFreq.value = gapFreqMultiplier;
    valGapFreq.textContent = gapFreqMultiplier.toFixed(1) + "x";

    inpGapSize.value = gapSizeMultiplier;
    valGapSize.textContent = gapSizeMultiplier.toFixed(1) + "x";

    inpSpeedRamp.value = cfg.speedRampPerSec;
    valSpeedRamp.textContent =
      cfg.speedRampPerSec === 0 ? "Off" : "+" + cfg.speedRampPerSec.toFixed(2) + "/s";

    chkGapsEnabled.checked = cfg.gapsEnabled;
    chkWrapWalls.checked = cfg.wrapWalls;
    chkSelfCollision.checked = cfg.selfCollision;
    chkAutoGoal.checked = cfg.autoGoalScore;
    customGoalWrap.style.display = cfg.autoGoalScore ? "none" : "flex";
    inpCustomGoal.value = cfg.customGoalScore;

    chkPowerupsEnabled.checked = cfg.powerupsEnabled;
    inpPowerFreq.value = powerupFreqMultiplier;
    valPowerFreq.textContent = powerupFreqMultiplier.toFixed(1) + "x";
    inpPowerMax.value = cfg.powerupMaxOnScreen;
    valPowerMax.textContent = cfg.powerupMaxOnScreen;

    arenaWrapper.style.borderStyle = cfg.wrapWalls ? "dashed" : "solid";
    updateGoalScore();
    renderPowerupGrid();
    renderFeed();
  }

  function applyPreset(presetName) {
    sfx.playClick();
    if (presetName === "powerups") {
      cfg.moveSpeed = 2.35;
      cfg.turnSpeed = 0.052;
      cfg.lineWidth = 4.5;
      cfg.gapsEnabled = true;
      gapFreqMultiplier = 1.0;
      gapSizeMultiplier = 1.0;
      cfg.speedRampPerSec = 0;
      cfg.wrapWalls = false;
      cfg.selfCollision = true;
      cfg.powerupsEnabled = true;
      powerupFreqMultiplier = 1.4;
      cfg.powerupMaxOnScreen = 6;
      cfg.powerupCatalog.forEach((p) => (p.enabled = true));
      savePowerupsToStorage();
    } else if (presetName === "classic") {
      cfg.moveSpeed = 2.35;
      cfg.turnSpeed = 0.052;
      cfg.lineWidth = 4.5;
      cfg.gapsEnabled = true;
      gapFreqMultiplier = 1.0;
      gapSizeMultiplier = 1.0;
      cfg.speedRampPerSec = 0;
      cfg.wrapWalls = false;
      cfg.selfCollision = true;
      cfg.powerupsEnabled = false;
    } else if (presetName === "turbo") {
      cfg.moveSpeed = 3.85;
      cfg.turnSpeed = 0.078;
      cfg.lineWidth = 4.5;
      cfg.gapsEnabled = true;
      gapFreqMultiplier = 1.4;
      gapSizeMultiplier = 1.2;
      cfg.speedRampPerSec = 0.04;
      cfg.wrapWalls = false;
      cfg.selfCollision = true;
      cfg.powerupsEnabled = true;
      powerupFreqMultiplier = 1.8;
    } else if (presetName === "needle") {
      cfg.moveSpeed = 2.5;
      cfg.turnSpeed = 0.065;
      cfg.lineWidth = 2.0;
      cfg.gapsEnabled = true;
      gapFreqMultiplier = 0.8;
      gapSizeMultiplier = 0.8;
      cfg.speedRampPerSec = 0;
      cfg.wrapWalls = false;
      cfg.selfCollision = true;
    } else if (presetName === "torus") {
      cfg.moveSpeed = 2.55;
      cfg.turnSpeed = 0.056;
      cfg.lineWidth = 4.5;
      cfg.gapsEnabled = true;
      gapFreqMultiplier = 1.1;
      gapSizeMultiplier = 1.1;
      cfg.speedRampPerSec = 0;
      cfg.wrapWalls = true;
      cfg.selfCollision = true;
      cfg.powerupsEnabled = true;
    } else if (presetName === "tron") {
      cfg.moveSpeed = 2.6;
      cfg.turnSpeed = 0.064;
      cfg.lineWidth = 4.0;
      cfg.gapsEnabled = false;
      gapFreqMultiplier = 1.0;
      gapSizeMultiplier = 1.0;
      cfg.speedRampPerSec = 0;
      cfg.wrapWalls = false;
      cfg.selfCollision = true;
    }

    document.querySelectorAll(".preset-chip[data-preset]").forEach((btn) => {
      btn.classList.toggle("highlight", btn.dataset.preset === presetName);
    });

    syncTweaksUI();
  }

  togglePowerupsBtn.addEventListener("click", () => {
    sfx.playClick();
    const isOpening = powerupsSection.classList.contains("hidden");
    powerupsSection.classList.toggle("hidden", !isOpening);
    tweaksSection.classList.add("hidden");
    togglePowerupsBtn.classList.toggle("active-tab", isOpening);
    toggleTweaksBtn.classList.remove("active-tab");
  });

  toggleTweaksBtn.addEventListener("click", () => {
    sfx.playClick();
    const isOpening = tweaksSection.classList.contains("hidden");
    tweaksSection.classList.toggle("hidden", !isOpening);
    powerupsSection.classList.add("hidden");
    toggleTweaksBtn.classList.toggle("active-tab", isOpening);
    togglePowerupsBtn.classList.remove("active-tab");
  });

  document.querySelectorAll(".preset-chip[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  chkPowerupsEnabled.addEventListener("change", (e) => {
    cfg.powerupsEnabled = e.target.checked;
    syncTweaksUI();
  });

  btnAllPowerups.addEventListener("click", () => {
    sfx.playClick();
    cfg.powerupsEnabled = true;
    cfg.powerupCatalog.forEach((p) => (p.enabled = true));
    savePowerupsToStorage();
    syncTweaksUI();
  });

  btnGreenOnly.addEventListener("click", () => {
    sfx.playClick();
    cfg.powerupsEnabled = true;
    cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "others"));
    savePowerupsToStorage();
    syncTweaksUI();
  });

  btnRedOnly.addEventListener("click", () => {
    sfx.playClick();
    cfg.powerupsEnabled = true;
    cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "self"));
    savePowerupsToStorage();
    syncTweaksUI();
  });

  btnNoPowerups.addEventListener("click", () => {
    sfx.playClick();
    cfg.powerupsEnabled = false;
    cfg.powerupCatalog.forEach((p) => (p.enabled = false));
    savePowerupsToStorage();
    syncTweaksUI();
  });

  inpPowerFreq.addEventListener("input", (e) => {
    powerupFreqMultiplier = parseFloat(e.target.value);
    syncTweaksUI();
  });

  inpPowerMax.addEventListener("input", (e) => {
    cfg.powerupMaxOnScreen = parseInt(e.target.value, 10) || 6;
    syncTweaksUI();
  });

  inpMoveSpeed.addEventListener("input", (e) => {
    cfg.moveSpeed = parseFloat(e.target.value);
    syncTweaksUI();
  });
  inpTurnSpeed.addEventListener("input", (e) => {
    cfg.turnSpeed = parseFloat(e.target.value);
    syncTweaksUI();
  });
  inpLineWidth.addEventListener("input", (e) => {
    cfg.lineWidth = parseFloat(e.target.value);
    syncTweaksUI();
  });
  inpGapFreq.addEventListener("input", (e) => {
    gapFreqMultiplier = parseFloat(e.target.value);
    syncTweaksUI();
  });
  inpGapSize.addEventListener("input", (e) => {
    gapSizeMultiplier = parseFloat(e.target.value);
    syncTweaksUI();
  });
  inpSpeedRamp.addEventListener("input", (e) => {
    cfg.speedRampPerSec = parseFloat(e.target.value);
    syncTweaksUI();
  });
  chkGapsEnabled.addEventListener("change", (e) => {
    cfg.gapsEnabled = e.target.checked;
    syncTweaksUI();
  });
  chkWrapWalls.addEventListener("change", (e) => {
    cfg.wrapWalls = e.target.checked;
    syncTweaksUI();
  });
  chkSelfCollision.addEventListener("change", (e) => {
    cfg.selfCollision = e.target.checked;
    syncTweaksUI();
  });
  chkAutoGoal.addEventListener("change", (e) => {
    cfg.autoGoalScore = e.target.checked;
    syncTweaksUI();
  });
  inpCustomGoal.addEventListener("input", (e) => {
    cfg.customGoalScore = parseInt(e.target.value, 10) || 20;
    syncTweaksUI();
  });

  addPlayerBtn.addEventListener("click", () => {
    sfx.playClick();
    const extraIdx = (players.length - 6 + EXTRA_PALETTE.length) % EXTRA_PALETTE.length;
    const preset = EXTRA_PALETTE[extraIdx];
    players.push({
      id: players.length,
      name: preset.name,
      color: preset.color,
      active: true,
      isBot: false,
      leftKey: preset.leftKey,
      leftLabel: preset.leftLabel,
      rightKey: preset.rightKey,
      rightLabel: preset.rightLabel,
      score: 0,
    });
    savePlayersToStorage();
    renderLobbyPlayers();
    renderScoreboard();
  });

  addBotBtn.addEventListener("click", () => {
    sfx.playClick();
    const inactive = players.find((p) => !p.active);
    if (inactive) {
      inactive.active = true;
      inactive.isBot = true;
    } else {
      const extraIdx = (players.length - 6 + EXTRA_PALETTE.length) % EXTRA_PALETTE.length;
      const preset = EXTRA_PALETTE[extraIdx];
      players.push({
        id: players.length,
        name: preset.name,
        color: preset.color,
        active: true,
        isBot: true,
        leftKey: preset.leftKey,
        leftLabel: preset.leftLabel,
        rightKey: preset.rightKey,
        rightLabel: preset.rightLabel,
        score: 0,
      });
    }
    savePlayersToStorage();
    renderLobbyPlayers();
    renderScoreboard();
  });

  resetDefaultsBtn.addEventListener("click", () => {
    sfx.playClick();
    localStorage.removeItem("achtung_v2_players");
    localStorage.removeItem("achtung_v2_powerups_v2");
    players = JSON.parse(JSON.stringify(cfg.defaultPlayers));
    players.forEach((p, idx) => {
      p.id = idx;
      p.score = 0;
    });
    applyPreset("powerups");
    renderLobbyPlayers();
    renderScoreboard();
  });

  startGameBtn.addEventListener("click", () => {
    startMatchFromLobby();
  });

  lobbyMenuBtn.addEventListener("click", () => {
    returnToLobby();
  });

  muteBtn.addEventListener("click", () => {
    const isMuted = sfx.toggleMute();
    muteBtn.textContent = isMuted ? "🔇 Sound: OFF" : "🔊 Sound: ON";
  });

  // ============================================================================
  // MATCH & ROUND FLOW
  // ============================================================================

  function showBanner(title, subHtml) {
    bannerTitle.textContent = title;
    bannerSub.innerHTML = subHtml;
    statusBanner.classList.remove("hidden");
  }

  function hideBanner() {
    statusBanner.classList.add("hidden");
  }

  function returnToLobby() {
    sfx.playClick();
    listeningKeyTarget = null;
    gameState = "LOBBY";
    hideBanner();
    lobbyOverlay.classList.remove("hidden");
    renderLobbyPlayers();
    renderScoreboard();
  }

  function startMatchFromLobby() {
    let activeList = players.filter((p) => p.active);
    if (activeList.length < 2) {
      for (let i = 0; i < players.length && activeList.length < 2; i++) {
        if (!players[i].active) {
          players[i].active = true;
          activeList = players.filter((p) => p.active);
        }
      }
      renderLobbyPlayers();
    }

    players.forEach((p) => {
      p.score = 0;
    });

    lobbyOverlay.classList.add("hidden");
    startNewRound();
  }

  function randomGapInterval() {
    const min = cfg.gapIntervalMin / gapFreqMultiplier;
    const max = cfg.gapIntervalMax / gapFreqMultiplier;
    return Math.floor(min + Math.random() * (max - min));
  }

  function randomGapDuration() {
    const min = cfg.gapDurationMin * gapSizeMultiplier;
    const max = cfg.gapDurationMax * gapSizeMultiplier;
    return Math.max(4, Math.floor(min + Math.random() * (max - min)));
  }

  function startNewRound() {
    const rect = arenaWrapper.getBoundingClientRect();
    arenaWidth = Math.max(320, Math.floor(rect.width));
    arenaHeight = Math.max(240, Math.floor(rect.height));
    trailCanvas.width = arenaWidth;
    trailCanvas.height = arenaHeight;
    headCanvas.width = arenaWidth;
    headCanvas.height = arenaHeight;

    clearArena();
    initSpatialGrid();
    hideBanner();

    roundFrame = 0;
    countdownFramesLeft = Math.round(cfg.countdownSeconds * 60);
    arenaPowerups = [];
    framesUntilNextPowerup = Math.round(80 / powerupFreqMultiplier);
    feedMessages = [];
    renderFeed();

    const activePlayers = players.filter((p) => p.active);
    const margin = Math.max(85, cfg.borderMargin * 5);

    activeRunners = [];
    for (let i = 0; i < activePlayers.length; i++) {
      const p = activePlayers[i];

      let sx = arenaWidth / 2;
      let sy = arenaHeight / 2;
      for (let attempt = 0; attempt < 30; attempt++) {
        const cx = margin + Math.random() * Math.max(40, arenaWidth - margin * 2);
        const cy = margin + Math.random() * Math.max(40, arenaHeight - margin * 2);
        let tooClose = false;
        for (const other of activeRunners) {
          const dist = Math.hypot(cx - other.x, cy - other.y);
          if (dist < 75) {
            tooClose = true;
            break;
          }
        }
        sx = cx;
        sy = cy;
        if (!tooClose) break;
      }

      const angleToCenter = Math.atan2(arenaHeight / 2 - sy, arenaWidth / 2 - sx);
      const angle = angleToCenter + (Math.random() - 0.5) * 1.8;

      activeRunners.push({
        id: p.id,
        playerRef: p,
        name: p.name,
        color: p.color,
        isBot: p.isBot,
        leftKey: p.leftKey,
        rightKey: p.rightKey,
        x: sx,
        y: sy,
        angle: angle,
        alive: true,
        inGap: false,
        framesUntilNextGap: randomGapInterval(),
        gapFramesRemaining: 0,
        botWanderBias: 0,
        effects: [], // Array of active effect instances (supports multiple stacks!)
        squareCooldown: 0,
      });
    }

    gameState = "COUNTDOWN";
    sfx.playRoundStart();
    renderScoreboard();
    drawHeadsAndPowerups();
  }

  // ============================================================================
  // AI BOT STEERING LOGIC (RAYCAST FEELER SENSORS + POWER-UP SEEKING)
  // ============================================================================

  function castBotFeeler(runner, angleOffset, maxDist, currentRadius, isGhost, canWrapWalls) {
    const stepDist = 6;
    const checkAngle = runner.angle + angleOffset;
    const cos = Math.cos(checkAngle);
    const sin = Math.sin(checkAngle);
    const selfIgnoreFrames = Math.ceil((currentRadius * 6.5) / Math.max(1, cfg.moveSpeed)) + 16;

    for (let d = stepDist; d <= maxDist; d += stepDist) {
      let tx = runner.x + cos * d;
      let ty = runner.y + sin * d;

      if (canWrapWalls) {
        tx = ((tx % arenaWidth) + arenaWidth) % arenaWidth;
        ty = ((ty % arenaHeight) + arenaHeight) % arenaHeight;
      }

      if (
        checkCollisionAtPoint(
          tx,
          ty,
          runner.id,
          roundFrame,
          currentRadius,
          selfIgnoreFrames,
          isGhost,
          canWrapWalls
        )
      ) {
        return d;
      }
    }
    return maxDist;
  }

  function computeBotSteer(runner, currentRadius, isGhost, canWrapWalls) {
    const lookAhead = Math.min(210, Math.max(95, cfg.moveSpeed * 52));
    const frontDist = castBotFeeler(runner, 0, lookAhead, currentRadius, isGhost, canWrapWalls);
    const leftNarrow = castBotFeeler(runner, -0.35, lookAhead, currentRadius, isGhost, canWrapWalls);
    const rightNarrow = castBotFeeler(runner, 0.35, lookAhead, currentRadius, isGhost, canWrapWalls);
    const leftWide = castBotFeeler(runner, -0.78, lookAhead * 0.8, currentRadius, isGhost, canWrapWalls);
    const rightWide = castBotFeeler(runner, 0.78, lookAhead * 0.8, currentRadius, isGhost, canWrapWalls);

    const leftScore = leftNarrow * 1.2 + leftWide * 0.85;
    const rightScore = rightNarrow * 1.2 + rightWide * 0.85;

    if (Math.random() < 0.04) {
      runner.botWanderBias = (Math.random() - 0.5) * 0.4;
    }

    if (frontDist < lookAhead * 0.78 || leftNarrow < lookAhead * 0.55 || rightNarrow < lookAhead * 0.55) {
      return leftScore > rightScore ? -1 : 1;
    }

    if (arenaPowerups.length > 0 && frontDist > lookAhead * 0.9) {
      let bestOrb = null;
      let bestDist = 220;
      for (const orb of arenaPowerups) {
        const d = Math.hypot(orb.x - runner.x, orb.y - runner.y);
        if (d < bestDist) {
          bestDist = d;
          bestOrb = orb;
        }
      }
      if (bestOrb) {
        const desiredAngle = Math.atan2(bestOrb.y - runner.y, bestOrb.x - runner.x);
        const diff = Math.atan2(Math.sin(desiredAngle - runner.angle), Math.cos(desiredAngle - runner.angle));
        if (Math.abs(diff) > 0.12) {
          return diff < 0 ? -1 : 1;
        }
      }
    }

    if (Math.abs(leftScore - rightScore) > lookAhead * 0.35) {
      return leftScore > rightScore ? -1 : 1;
    }

    if (Math.abs(runner.botWanderBias) > 0.16) {
      return runner.botWanderBias < 0 ? -1 : 1;
    }
    return 0;
  }

  // ============================================================================
  // FIXED-STEP SIMULATION UPDATE
  // ============================================================================

  function stepSimulation() {
    if (gameState === "COUNTDOWN") {
      countdownFramesLeft--;
      drawHeadsAndPowerups();
      if (countdownFramesLeft <= 0) {
        gameState = "PLAYING";
      }
      justPressedKeys.clear();
      return;
    }

    if (gameState !== "PLAYING") {
      justPressedKeys.clear();
      return;
    }

    roundFrame++;

    // 1. Spawn Power-Ups periodically
    if (cfg.powerupsEnabled) {
      framesUntilNextPowerup--;
      if (framesUntilNextPowerup <= 0) {
        spawnArenaPowerup();
        framesUntilNextPowerup = randomPowerupInterval();
      }
    }

    const baseSpeed = cfg.moveSpeed + (roundFrame / 60) * cfg.speedRampPerSec;
    const newlyDead = [];
    let effectsChanged = false;

    for (let i = 0; i < activeRunners.length; i++) {
      const r = activeRunners[i];
      if (!r.alive) continue;

      // 2. Tick active power-up durations on this runner
      if (r.effects.length > 0) {
        for (let eIdx = r.effects.length - 1; eIdx >= 0; eIdx--) {
          r.effects[eIdx].remainingFrames--;
          if (r.effects[eIdx].remainingFrames <= 0) {
            r.effects.splice(eIdx, 1);
            effectsChanged = true;
          }
        }
      }

      // 3. Compute STACKED modifiers for this runner!
      const speedStacks = countEffects(r, "speed");
      const slowStacks = countEffects(r, "slow");
      const thickStacks = countEffects(r, "thick");
      const thinStacks = countEffects(r, "thin");
      const wobbleStacks = countEffects(r, "wobble");
      const reverseStacks = countEffects(r, "reverse");
      const squareStacks = countEffects(r, "square");
      const ghostStacks = countEffects(r, "ghost");
      const wallwalkStacks = countEffects(r, "wallwalk");

      const isReversed = reverseStacks > 0;
      const isSquare = squareStacks > 0;
      const isGhost = ghostStacks > 0;
      const canWrapWalls = cfg.wrapWalls || wallwalkStacks > 0 || isGhost;

      // Multiply per stack:
      // - Each Elephant (thick) stack DOUBLES thickness (2x, 4x, 8x...)
      // - Each Thin Body (thin) stack HALVES thickness (0.5x, 0.25x, 0.125x...)
      // - Each Turbo (speed) stack multiplies speed by 1.65x
      // - Each Slow-Mo (slow) stack multiplies speed by 0.58x
      let speedMult = Math.pow(1.65, speedStacks) * Math.pow(0.58, slowStacks);
      let turnMult =
        Math.pow(1.22, speedStacks) *
        Math.pow(0.8, slowStacks) *
        Math.pow(0.88, thickStacks) *
        Math.pow(1.2, thinStacks);
      let widthMult = Math.pow(2.0, thickStacks) * Math.pow(0.5, thinStacks);

      speedMult = Math.max(0.2, Math.min(6.0, speedMult));
      const runnerSpeed = baseSpeed * speedMult;
      const runnerTurnSpeed = cfg.turnSpeed * turnMult;
      const runnerLineWidth = Math.max(1.0, Math.min(64, cfg.lineWidth * widthMult));
      const runnerRadius = runnerLineWidth * 0.5;
      const selfIgnoreFrames =
        Math.ceil((runnerLineWidth * 3.4) / Math.max(0.6, runnerSpeed)) + 16;

      if (r.squareCooldown > 0) {
        r.squareCooldown--;
      }

      // 4. Steering (Smooth vs 90° Right-Angle Square Mode)
      if (isSquare) {
        let turnDir = 0;
        if (r.isBot) {
          if (r.squareCooldown === 0) {
            const botSteer = computeBotSteer(r, runnerRadius, isGhost, canWrapWalls);
            if (botSteer !== 0) {
              turnDir = botSteer;
            }
          }
        } else {
          const leftTap = justPressedKeys.has(r.leftKey);
          const rightTap = justPressedKeys.has(r.rightKey);
          const leftHeld = pressedKeys.has(r.leftKey);
          const rightHeld = pressedKeys.has(r.rightKey);

          if (leftTap) turnDir -= 1;
          if (rightTap) turnDir += 1;

          if (turnDir === 0 && r.squareCooldown === 0) {
            if (leftHeld) turnDir -= 1;
            if (rightHeld) turnDir += 1;
          }
          if (isReversed) {
            turnDir = -turnDir;
          }
        }

        if (turnDir !== 0) {
          r.angle += turnDir * (Math.PI / 2);
          r.squareCooldown = 14;
        }
      } else {
        let steer = 0;
        if (r.isBot) {
          steer = computeBotSteer(r, runnerRadius, isGhost, canWrapWalls);
        } else {
          if (pressedKeys.has(r.leftKey)) steer -= 1;
          if (pressedKeys.has(r.rightKey)) steer += 1;
          if (isReversed) steer = -steer;
        }
        if (wobbleStacks > 0) {
          steer += Math.sin(roundFrame * 0.24 + r.id * 1.7) * (0.85 * wobbleStacks);
        }
        r.angle += steer * runnerTurnSpeed;
      }

      // 5. Advance Position & Wall Wrapping (Global or via 🚪 Go Through Walls power-up)
      const prevX = r.x;
      const prevY = r.y;
      let nextX = prevX + Math.cos(r.angle) * runnerSpeed;
      let nextY = prevY + Math.sin(r.angle) * runnerSpeed;

      let wrappedThisStep = false;
      if (canWrapWalls) {
        if (nextX < 0) {
          nextX += arenaWidth;
          wrappedThisStep = true;
        } else if (nextX >= arenaWidth) {
          nextX -= arenaWidth;
          wrappedThisStep = true;
        }
        if (nextY < 0) {
          nextY += arenaHeight;
          wrappedThisStep = true;
        } else if (nextY >= arenaHeight) {
          nextY -= arenaHeight;
          wrappedThisStep = true;
        }
      }

      r.x = nextX;
      r.y = nextY;
      r.currentRadius = runnerRadius;

      // 6. Check Power-up Orb Collection
      for (let pIdx = arenaPowerups.length - 1; pIdx >= 0; pIdx--) {
        const orb = arenaPowerups[pIdx];
        const dist = Math.hypot(nextX - orb.x, nextY - orb.y);
        if (dist <= runnerRadius + orb.radius + 2) {
          arenaPowerups.splice(pIdx, 1);
          applyPowerupEffect(r, orb);
        }
      }

      // 7. Trail Gap State Machine
      const isInitialGrace = roundFrame <= cfg.startGraceFrames;
      if (cfg.gapsEnabled && !isInitialGrace && !isGhost) {
        if (r.inGap) {
          r.gapFramesRemaining--;
          if (r.gapFramesRemaining <= 0) {
            r.inGap = false;
            r.framesUntilNextGap = randomGapInterval();
          }
        } else {
          r.framesUntilNextGap--;
          if (r.framesUntilNextGap <= 0) {
            r.inGap = true;
            r.gapFramesRemaining = randomGapDuration();
          }
        }
      } else {
        r.inGap = false;
      }

      // 8. Collision Check
      const hitWallDuringGrace =
        !canWrapWalls &&
        (nextX - runnerRadius <= 1 ||
          nextX + runnerRadius >= arenaWidth - 1 ||
          nextY - runnerRadius <= 1 ||
          nextY + runnerRadius >= arenaHeight - 1);

      const hitTrailOrWall =
        !isInitialGrace &&
        checkCollisionAtPoint(
          nextX,
          nextY,
          r.id,
          roundFrame,
          runnerRadius * 0.85,
          selfIgnoreFrames,
          isGhost,
          canWrapWalls
        );

      if (hitWallDuringGrace || hitTrailOrWall) {
        r.alive = false;
        newlyDead.push(r);
      }

      // 9. Draw Solid Trail Segment
      const leavesSolidTrail = !isInitialGrace && !r.inGap && !wrappedThisStep && !isGhost;
      if (leavesSolidTrail) {
        trailCtx.strokeStyle = r.color;
        trailCtx.lineWidth = runnerLineWidth;
        trailCtx.lineCap = "round";
        trailCtx.beginPath();
        trailCtx.moveTo(prevX, prevY);
        trailCtx.lineTo(nextX, nextY);
        trailCtx.stroke();

        addSegmentToGrid(prevX, prevY, nextX, nextY, r.id, roundFrame, runnerRadius);
      } else if ((isInitialGrace || isGhost) && !wrappedThisStep && roundFrame % 5 < 2) {
        trailCtx.strokeStyle = r.color;
        trailCtx.lineWidth = Math.max(1.4, runnerLineWidth * 0.45);
        trailCtx.beginPath();
        trailCtx.moveTo(prevX, prevY);
        trailCtx.lineTo(nextX, nextY);
        trailCtx.stroke();
      }
    }

    justPressedKeys.clear();

    if (effectsChanged) {
      renderScoreboard();
    }

    // Award survival points when players crash
    if (newlyDead.length > 0) {
      sfx.playCrash();
      const survivors = activeRunners.filter((r) => r.alive);
      survivors.forEach((survivor) => {
        survivor.playerRef.score = (survivor.playerRef.score || 0) + newlyDead.length;
      });
      renderScoreboard();

      if (survivors.length <= 1) {
        handleRoundEnd(survivors[0] || newlyDead[0]);
      }
    }

    drawHeadsAndPowerups();
  }

  function handleRoundEnd(roundWinner) {
    const activePlayers = players.filter((p) => p.active);
    const sorted = [...activePlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    const topScore = sorted[0].score || 0;
    const secondScore = sorted[1] ? sorted[1].score || 0 : -1;

    if (topScore >= goalScore && topScore > secondScore) {
      gameState = "MATCH_OVER";
      sfx.playMatchWin();
      showBanner(
        `🏆 ${sorted[0].name} wins the match! (${topScore} pts)`,
        `Press <kbd>SPACE</kbd> for a rematch or <kbd>ESC</kbd> for setup`
      );
    } else {
      gameState = "ROUND_OVER";
      sfx.playRoundEnd();
      const titleText =
        topScore >= goalScore && topScore === secondScore
          ? `⚡ Tiebreaker! Tied at ${topScore} pts`
          : roundWinner
          ? `${roundWinner.name} wins the round!`
          : `Draw round!`;
      showBanner(titleText, `Press <kbd>SPACE</kbd> for next round`);
    }
    renderScoreboard();
  }

  // ============================================================================
  // RENDER POWER-UPS, FLASHING HEADS & DIRECTION ARROWS
  // ============================================================================

  function drawHeadsAndPowerups() {
    headCtx.clearRect(0, 0, arenaWidth, arenaHeight);

    // 1. Draw Arena Power-Up Orbs
    for (let i = 0; i < arenaPowerups.length; i++) {
      const orb = arenaPowerups[i];
      const isGreen = orb.def.target === "others";
      const mainColor = isGreen ? "#2ee65a" : "#ff3b30";
      const glowColor = isGreen ? "rgba(46, 230, 90, 0.26)" : "rgba(255, 59, 48, 0.26)";
      const pulse = 1 + Math.sin((roundFrame - orb.spawnFrame) * 0.12) * 0.08;
      const r = orb.radius * pulse;

      headCtx.beginPath();
      headCtx.arc(orb.x, orb.y, r + 4, 0, Math.PI * 2);
      headCtx.fillStyle = glowColor;
      headCtx.fill();

      headCtx.beginPath();
      headCtx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
      headCtx.fillStyle = "#101018";
      headCtx.fill();
      headCtx.lineWidth = 2.8;
      headCtx.strokeStyle = mainColor;
      headCtx.stroke();

      headCtx.font = "15px -apple-system, BlinkMacSystemFont, sans-serif";
      headCtx.textAlign = "center";
      headCtx.textBaseline = "middle";
      headCtx.fillStyle = "#ffffff";
      headCtx.fillText(orb.def.icon, orb.x, orb.y + 1);
    }

    // 2. Draw Player Heads & Active Power-up Flashing Indicators
    headCtx.textAlign = "left";
    headCtx.textBaseline = "alphabetic";

    for (let i = 0; i < activeRunners.length; i++) {
      const r = activeRunners[i];

      if (gameState === "COUNTDOWN") {
        const tailLen = 22;
        const tailX = r.x - Math.cos(r.angle) * tailLen;
        const tailY = r.y - Math.sin(r.angle) * tailLen;

        headCtx.strokeStyle = r.color;
        headCtx.lineWidth = cfg.lineWidth;
        headCtx.lineCap = "round";
        headCtx.beginPath();
        headCtx.moveTo(tailX, tailY);
        headCtx.lineTo(r.x, r.y);
        headCtx.stroke();

        headCtx.font = "700 12px -apple-system, BlinkMacSystemFont, sans-serif";
        headCtx.fillStyle = r.color;
        headCtx.fillText(r.name, r.x + 10, r.y - 10);
      }

      const baseHeadR = Math.max(2.0, (r.currentRadius || cfg.lineWidth * 0.5) * 1.06);
      const isAffected = r.alive && r.effects && r.effects.length > 0;

      if (isAffected) {
        const primaryEff = r.effects[r.effects.length - 1];
        const flashPhase = Math.floor(roundFrame / 4) % 2 === 0;
        const flashRingRadius = baseHeadR + 5 + Math.sin(roundFrame * 0.35) * 2.2;

        const fractionLeft = Math.max(0, primaryEff.remainingFrames / primaryEff.totalFrames);
        headCtx.beginPath();
        headCtx.arc(
          r.x,
          r.y,
          flashRingRadius,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * fractionLeft
        );
        headCtx.strokeStyle = flashPhase ? "#ffffff" : primaryEff.targetColor;
        headCtx.lineWidth = 2.4;
        headCtx.stroke();

        // Flashing head core
        headCtx.beginPath();
        headCtx.arc(r.x, r.y, baseHeadR * (flashPhase ? 1.35 : 1.0), 0, Math.PI * 2);
        headCtx.fillStyle = flashPhase ? primaryEff.targetColor : "#ffffff";
        headCtx.fill();

        // Floating stacked icons badge next to the flashing head (e.g. "🐘×2 ⚡")
        const iconsText = formatEffectStacks(r.effects);
        headCtx.font = "700 12px -apple-system, BlinkMacSystemFont, sans-serif";
        headCtx.fillStyle = "#ffffff";
        headCtx.fillText(iconsText, r.x + flashRingRadius + 4, r.y + 4);
      } else {
        headCtx.beginPath();
        headCtx.arc(r.x, r.y, baseHeadR, 0, Math.PI * 2);
        if (!r.alive) {
          headCtx.fillStyle = "#ffffff";
        } else if (cfg.headColorMode === "yellow") {
          headCtx.fillStyle = "#ffe650";
        } else if (cfg.headColorMode === "white") {
          headCtx.fillStyle = "#ffffff";
        } else {
          headCtx.fillStyle = r.color;
        }
        headCtx.fill();
      }
    }
  }

  // ============================================================================
  // KEYBOARD INPUT & SHORTCUTS
  // ============================================================================

  window.addEventListener("keydown", (e) => {
    if (
      document.activeElement &&
      document.activeElement.tagName === "INPUT" &&
      document.activeElement.type === "text"
    ) {
      if (e.code === "Escape" || e.code === "Enter") {
        document.activeElement.blur();
      }
      return;
    }

    if (listeningKeyTarget !== null) {
      e.preventDefault();
      if (e.code === "Escape") {
        listeningKeyTarget = null;
        renderLobbyPlayers();
        return;
      }
      const p = players[listeningKeyTarget.playerIndex];
      const label = formatKeyLabel(e.code, e.key);
      if (listeningKeyTarget.side === "left") {
        p.leftKey = e.code;
        p.leftLabel = label;
        listeningKeyTarget = { playerIndex: listeningKeyTarget.playerIndex, side: "right" };
      } else {
        p.rightKey = e.code;
        p.rightLabel = label;
        listeningKeyTarget = null;
      }
      sfx.playClick();
      savePlayersToStorage();
      renderLobbyPlayers();
      renderScoreboard();
      return;
    }

    if (!pressedKeys.has(e.code)) {
      justPressedKeys.add(e.code);
    }
    pressedKeys.add(e.code);

    if (e.code === "Space") {
      e.preventDefault();
      if (gameState === "LOBBY") {
        startMatchFromLobby();
      } else if (gameState === "PLAYING") {
        gameState = "PAUSED";
        sfx.playClick();
        showBanner("Game Paused", `Press <kbd>SPACE</kbd> to resume or <kbd>ESC</kbd> for setup`);
      } else if (gameState === "PAUSED") {
        gameState = "PLAYING";
        sfx.playClick();
        hideBanner();
      } else if (gameState === "ROUND_OVER") {
        startNewRound();
      } else if (gameState === "MATCH_OVER") {
        players.forEach((p) => (p.score = 0));
        startNewRound();
      }
      return;
    }

    if (e.code === "Escape") {
      e.preventDefault();
      if (gameState !== "LOBBY") {
        returnToLobby();
      }
      return;
    }

    if (gameState === "LOBBY" && !e.repeat) {
      const matchedPlayer = players.find(
        (p) => !p.isBot && (p.leftKey === e.code || p.rightKey === e.code)
      );
      if (matchedPlayer) {
        matchedPlayer.active = !matchedPlayer.active;
        sfx.playClick();
        savePlayersToStorage();
        renderLobbyPlayers();
        renderScoreboard();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    pressedKeys.delete(e.code);
  });

  window.addEventListener("blur", () => {
    pressedKeys.clear();
    justPressedKeys.clear();
  });

  // ============================================================================
  // MAIN ANIMATION LOOP (Fixed 60Hz Physics Step)
  // ============================================================================

  function mainLoop(now) {
    const dt = Math.min(100, now - lastFrameTime);
    lastFrameTime = now;
    accumulator += dt;

    while (accumulator >= FIXED_STEP_MS) {
      stepSimulation();
      accumulator -= FIXED_STEP_MS;
    }

    requestAnimationFrame(mainLoop);
  }

  // Boot up
  loadSavedSettings();
  resizeCanvases();
  syncTweaksUI();
  renderLobbyPlayers();
  renderScoreboard();
  requestAnimationFrame(mainLoop);
})();
