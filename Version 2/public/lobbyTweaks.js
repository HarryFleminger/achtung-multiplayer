// ============================================================================
// LOBBY TWEAKS, PRESETS & POWER-UP PICKER EVENT LISTENERS (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG;
  const sfx = window.soundFX;
  const $ = (id) => document.getElementById(id);

  function renderPowerupGrid() {
    const grid = $("powerupGrid");
    if (!grid || !cfg.powerupCatalog) return;
    grid.innerHTML = "";
    cfg.powerupCatalog.forEach((item) => {
      const card = document.createElement("div");
      card.className = `powerup-card target-${item.target}${item.enabled ? "" : " off"}`;
      card.innerHTML = `
        <div class="powerup-orb-preview">${item.icon}</div>
        <div class="powerup-card-info">
          <div class="powerup-card-title">${item.name}</div>
          <div class="powerup-card-desc">${item.desc}</div>
        </div>
        <input type="checkbox" ${item.enabled ? "checked" : ""} style="width:16px;height:16px;cursor:pointer;" />
      `;
      card.addEventListener("click", () => {
        item.enabled = !item.enabled;
        if (sfx) sfx.playClick();
        renderPowerupGrid();
      });
      grid.appendChild(card);
    });
  }

  function syncTweaksUI() {
    if ($("inpMoveSpeed")) $("inpMoveSpeed").value = cfg.moveSpeed;
    if ($("valMoveSpeed")) $("valMoveSpeed").textContent = cfg.moveSpeed.toFixed(2);
    if ($("inpTurnSpeed")) $("inpTurnSpeed").value = cfg.turnSpeed;
    if ($("valTurnSpeed")) $("valTurnSpeed").textContent = cfg.turnSpeed.toFixed(3);
    if ($("inpLineWidth")) $("inpLineWidth").value = cfg.lineWidth;
    if ($("valLineWidth")) $("valLineWidth").textContent = cfg.lineWidth.toFixed(1) + "px";
    if ($("chkPowerupsEnabled")) $("chkPowerupsEnabled").checked = cfg.powerupsEnabled;
    if ($("chkGapsEnabled")) $("chkGapsEnabled").checked = cfg.gapsEnabled;
    if ($("chkWrapWalls")) $("chkWrapWalls").checked = cfg.wrapWalls;
    if ($("chkSelfCollision")) $("chkSelfCollision").checked = cfg.selfCollision;
    renderPowerupGrid();
  }

  function applyPreset(name) {
    if (sfx) sfx.playClick();
    if (name === "powerups") { cfg.moveSpeed = 2.35; cfg.turnSpeed = 0.052; cfg.lineWidth = 4.5; cfg.gapsEnabled = true; cfg.wrapWalls = false; cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = true)); }
    else if (name === "classic") { cfg.moveSpeed = 2.35; cfg.turnSpeed = 0.052; cfg.lineWidth = 4.5; cfg.gapsEnabled = true; cfg.wrapWalls = false; cfg.powerupsEnabled = false; }
    else if (name === "turbo") { cfg.moveSpeed = 3.85; cfg.turnSpeed = 0.078; cfg.lineWidth = 4.5; cfg.powerupsEnabled = true; }
    else if (name === "needle") { cfg.moveSpeed = 2.5; cfg.turnSpeed = 0.065; cfg.lineWidth = 2.0; }
    else if (name === "torus") { cfg.moveSpeed = 2.55; cfg.turnSpeed = 0.056; cfg.wrapWalls = true; }
    else if (name === "tron") { cfg.moveSpeed = 2.6; cfg.turnSpeed = 0.064; cfg.gapsEnabled = false; }
    document.querySelectorAll(".preset-chip[data-preset]").forEach((b) => b.classList.toggle("highlight", b.dataset.preset === name));
    syncTweaksUI();
  }

  if ($("togglePowerupsBtn")) $("togglePowerupsBtn").addEventListener("click", () => { if (sfx) sfx.playClick(); $("powerupsSection").classList.toggle("hidden"); $("tweaksSection").classList.add("hidden"); });
  if ($("toggleTweaksBtn")) $("toggleTweaksBtn").addEventListener("click", () => { if (sfx) sfx.playClick(); $("tweaksSection").classList.toggle("hidden"); $("powerupsSection").classList.add("hidden"); });
  document.querySelectorAll(".preset-chip[data-preset]").forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));

  if ($("btnAllPowerups")) $("btnAllPowerups").addEventListener("click", () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = true)); syncTweaksUI(); });
  if ($("btnGreenOnly")) $("btnGreenOnly").addEventListener("click", () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "others")); syncTweaksUI(); });
  if ($("btnRedOnly")) $("btnRedOnly").addEventListener("click", () => { cfg.powerupsEnabled = true; cfg.powerupCatalog.forEach((p) => (p.enabled = p.target === "self")); syncTweaksUI(); });
  if ($("btnNoPowerups")) $("btnNoPowerups").addEventListener("click", () => { cfg.powerupsEnabled = false; cfg.powerupCatalog.forEach((p) => (p.enabled = false)); syncTweaksUI(); });

  if ($("inpMoveSpeed")) $("inpMoveSpeed").addEventListener("input", (e) => { cfg.moveSpeed = parseFloat(e.target.value); syncTweaksUI(); });
  if ($("inpTurnSpeed")) $("inpTurnSpeed").addEventListener("input", (e) => { cfg.turnSpeed = parseFloat(e.target.value); syncTweaksUI(); });
  if ($("inpLineWidth")) $("inpLineWidth").addEventListener("input", (e) => { cfg.lineWidth = parseFloat(e.target.value); syncTweaksUI(); });
  if ($("chkPowerupsEnabled")) $("chkPowerupsEnabled").addEventListener("change", (e) => { cfg.powerupsEnabled = e.target.checked; syncTweaksUI(); });
  if ($("chkGapsEnabled")) $("chkGapsEnabled").addEventListener("change", (e) => { cfg.gapsEnabled = e.target.checked; syncTweaksUI(); });
  if ($("chkWrapWalls")) $("chkWrapWalls").addEventListener("change", (e) => { cfg.wrapWalls = e.target.checked; syncTweaksUI(); });
  if ($("chkSelfCollision")) $("chkSelfCollision").addEventListener("change", (e) => { cfg.selfCollision = e.target.checked; syncTweaksUI(); });
  if ($("resetDefaultsBtn")) $("resetDefaultsBtn").addEventListener("click", () => applyPreset("powerups"));

  syncTweaksUI();
})();
