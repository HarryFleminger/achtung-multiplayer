// ============================================================================
// LOBBY TWEAKS, PRESETS & GRANULAR POWER-UP SYNC (< 90 LINES)
// ============================================================================
(function () {
  const cfg = window.ACHTUNG_CONFIG;
  const sfx = window.soundFX;
  const net = window.network;
  const $ = (id) => document.getElementById(id);
  const EFFECT_MAP = { wallwalk: "wrap", square: "rightAngle", clear: "cleanSlate" };
  const toServerKey = (type) => EFFECT_MAP[type] || type;

  function sendSetting(key, value) {
    if (sfx) sfx.playClick();
    if (net && net.connected) net.send({ type: "updateSetting", key, value });
    else syncTweaksUI({ [key]: value });
  }

  function renderPowerupGrid() {
    const grid = $("powerupGrid");
    if (!grid || !cfg.powerupCatalog) return;
    grid.innerHTML = "";
    cfg.powerupCatalog.forEach((item) => {
      const card = document.createElement("div");
      card.className = `powerup-card target-${item.target}${item.enabled ? "" : " off"}`;
      card.innerHTML = `<div class="powerup-orb-preview">${item.icon}</div><div class="powerup-card-info"><div class="powerup-card-title">${item.name}</div><div class="powerup-card-desc">${item.desc}</div></div><input type="checkbox" ${item.enabled ? "checked" : ""} style="width:16px;height:16px;cursor:pointer;" />`;
      card.addEventListener("click", () => {
        const srvKey = toServerKey(item.type);
        sendSetting("togglePowerUp", srvKey);
      });
      grid.appendChild(card);
    });
  }

  function syncTweaksUI(s) {
    if (s) {
      if (typeof s.powerUpsEnabled === "boolean") cfg.powerupsEnabled = s.powerUpsEnabled;
      if (typeof s.gapsEnabled === "boolean") cfg.gapsEnabled = s.gapsEnabled;
      if (typeof s.wrapWalls === "boolean") cfg.wrapWalls = s.wrapWalls;
      if (typeof s.selfCollision === "boolean") cfg.selfCollision = s.selfCollision;
      if (typeof s.moveSpeed === "number") cfg.moveSpeed = s.moveSpeed;
      if (typeof s.turnSpeed === "number") cfg.turnSpeed = s.turnSpeed;
      if (typeof s.lineWidth === "number") cfg.lineWidth = s.lineWidth;
      if (Array.isArray(s.allowedPowerUps) && cfg.powerupCatalog) {
        cfg.powerupCatalog.forEach((item) => { item.enabled = s.allowedPowerUps.includes(toServerKey(item.type)); });
      }
      if (s.preset) document.querySelectorAll(".preset-chip[data-preset]").forEach((b) => b.classList.toggle("highlight", b.dataset.preset === s.preset));
    }
    if ($("inpMoveSpeed")) $("inpMoveSpeed").value = cfg.moveSpeed;
    if ($("valMoveSpeed")) $("valMoveSpeed").textContent = Number(cfg.moveSpeed).toFixed(2);
    if ($("inpTurnSpeed")) $("inpTurnSpeed").value = cfg.turnSpeed;
    if ($("valTurnSpeed")) $("valTurnSpeed").textContent = Number(cfg.turnSpeed).toFixed(3);
    if ($("inpLineWidth")) $("inpLineWidth").value = cfg.lineWidth;
    if ($("valLineWidth")) $("valLineWidth").textContent = Number(cfg.lineWidth).toFixed(1) + "px";
    if ($("chkPowerupsEnabled")) $("chkPowerupsEnabled").checked = Boolean(cfg.powerupsEnabled);
    if ($("chkGapsEnabled")) $("chkGapsEnabled").checked = Boolean(cfg.gapsEnabled);
    if ($("chkWrapWalls")) $("chkWrapWalls").checked = Boolean(cfg.wrapWalls);
    if ($("chkSelfCollision")) $("chkSelfCollision").checked = Boolean(cfg.selfCollision);
    renderPowerupGrid();
  }

  if ($("togglePowerupsBtn")) $("togglePowerupsBtn").addEventListener("click", () => { if (sfx) sfx.playClick(); $("powerupsSection").classList.toggle("hidden"); $("tweaksSection").classList.add("hidden"); });
  if ($("toggleTweaksBtn")) $("toggleTweaksBtn").addEventListener("click", () => { if (sfx) sfx.playClick(); $("tweaksSection").classList.toggle("hidden"); $("powerupsSection").classList.add("hidden"); });
  document.querySelectorAll(".preset-chip[data-preset]").forEach((b) => b.addEventListener("click", () => sendSetting("preset", b.dataset.preset)));

  const ALL_SRV_KEYS = ["speed", "slow", "thick", "thin", "ghost", "wrap", "reverse", "wobble", "rightAngle", "cleanSlate"];
  if ($("btnAllPowerups")) $("btnAllPowerups").addEventListener("click", () => { sendSetting("powerUpsEnabled", true); sendSetting("allowedPowerUps", ALL_SRV_KEYS); });
  if ($("btnGreenOnly")) $("btnGreenOnly").addEventListener("click", () => { sendSetting("powerUpsEnabled", true); sendSetting("allowedPowerUps", ["speed", "slow", "thick", "thin", "wrap", "reverse", "rightAngle", "wobble"]); });
  if ($("btnRedOnly")) $("btnRedOnly").addEventListener("click", () => { sendSetting("powerUpsEnabled", true); sendSetting("allowedPowerUps", ["speed", "slow", "thick", "thin", "wrap", "ghost", "reverse", "rightAngle", "cleanSlate"]); });
  if ($("btnNoPowerups")) $("btnNoPowerups").addEventListener("click", () => { sendSetting("allowedPowerUps", []); sendSetting("powerUpsEnabled", false); });

  if ($("inpMoveSpeed")) $("inpMoveSpeed").addEventListener("input", (e) => sendSetting("moveSpeed", parseFloat(e.target.value)));
  if ($("inpTurnSpeed")) $("inpTurnSpeed").addEventListener("input", (e) => sendSetting("turnSpeed", parseFloat(e.target.value)));
  if ($("inpLineWidth")) $("inpLineWidth").addEventListener("input", (e) => sendSetting("lineWidth", parseFloat(e.target.value)));
  if ($("chkPowerupsEnabled")) $("chkPowerupsEnabled").addEventListener("change", (e) => sendSetting("powerUpsEnabled", e.target.checked));
  if ($("chkGapsEnabled")) $("chkGapsEnabled").addEventListener("change", (e) => sendSetting("gapsEnabled", e.target.checked));
  if ($("chkWrapWalls")) $("chkWrapWalls").addEventListener("change", (e) => sendSetting("wrapWalls", e.target.checked));
  if ($("chkSelfCollision")) $("chkSelfCollision").addEventListener("change", (e) => sendSetting("selfCollision", e.target.checked));
  if ($("resetDefaultsBtn")) $("resetDefaultsBtn").addEventListener("click", () => sendSetting("preset", "powerups"));

  if (net) net.on("settingsSync", (msg) => syncTweaksUI(msg.settings));
  syncTweaksUI();
})();
