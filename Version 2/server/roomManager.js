// ============================================================================
// SERVER ROOM MANAGER: SLOTS, SETTINGS & ALLOWED POWER-UPS (< 90 LINES)
// ============================================================================
const CLASSIC_SLOTS = [
  { slot: 0, name: "Fred", color: "#ff3b30", leftLabel: "1", rightLabel: "Q" },
  { slot: 1, name: "Greenlee", color: "#32d74b", leftLabel: "Z", rightLabel: "X" },
  { slot: 2, name: "Pinkney", color: "#ff2d92", leftLabel: "M", rightLabel: "," },
  { slot: 3, name: "Bluebell", color: "#00d4ff", leftLabel: "←", rightLabel: "→" },
  { slot: 4, name: "Willem", color: "#ff9f0a", leftLabel: "C", rightLabel: "V" },
  { slot: 5, name: "Greydon", color: "#a8a8b3", leftLabel: "[", rightLabel: "]" },
];
const ALL_POWERS = ["speed", "slow", "thick", "thin", "ghost", "wrap", "reverse", "wobble", "rightAngle", "cleanSlate"];

class RoomManager {
  constructor() {
    this.state = "LOBBY"; this.nextClientSeq = 1; this.clients = new Map();
    this.slots = { Fred: null, Greenlee: null, Pinkney: null, Bluebell: null, Willem: null, Greydon: null };
    this.gameSettings = {
      powerUpsEnabled: true, gapsEnabled: true, wrapWalls: false, selfCollision: true,
      moveSpeed: 2.35, turnSpeed: 0.052, lineWidth: 4.5, preset: "powerups",
      allowedPowerUps: [...ALL_POWERS],
    };
  }

  updateSetting(key, value) {
    const s = this.gameSettings;
    if (key === "preset") {
      s.preset = value;
      if (value === "powerups") Object.assign(s, { moveSpeed: 2.35, turnSpeed: 0.052, lineWidth: 4.5, gapsEnabled: true, wrapWalls: false, powerUpsEnabled: true, allowedPowerUps: [...ALL_POWERS] });
      else if (value === "classic") Object.assign(s, { moveSpeed: 2.35, turnSpeed: 0.052, lineWidth: 4.5, gapsEnabled: true, wrapWalls: false, powerUpsEnabled: false });
      else if (value === "turbo") Object.assign(s, { moveSpeed: 3.85, turnSpeed: 0.078, lineWidth: 4.5, powerUpsEnabled: true });
      else if (value === "needle") Object.assign(s, { moveSpeed: 2.5, turnSpeed: 0.065, lineWidth: 2.0 });
      else if (value === "torus") Object.assign(s, { moveSpeed: 2.55, turnSpeed: 0.056, wrapWalls: true });
      else if (value === "tron") Object.assign(s, { moveSpeed: 2.6, turnSpeed: 0.064, gapsEnabled: false });
    } else if (key === "togglePowerUp" && value) {
      const idx = s.allowedPowerUps.indexOf(value);
      if (idx >= 0) s.allowedPowerUps.splice(idx, 1); else s.allowedPowerUps.push(value);
    } else if (key === "allowedPowerUps" && Array.isArray(value)) {
      s.allowedPowerUps = value;
    } else if (key === "powerupsEnabled") {
      s.powerUpsEnabled = Boolean(value);
    } else if (key in s) {
      s[key] = value;
    }
    return s;
  }

  addPlayer(ws) {
    const clientId = `client_${this.nextClientSeq++}`; ws.clientId = clientId;
    const freePreset = CLASSIC_SLOTS.find((s) => this.slots[s.name] === null);
    if (!freePreset) { this.clients.set(ws, { clientId, id: -1, slot: -1, name: null, score: 0 }); return this.clients.get(ws); }
    this.slots[freePreset.name] = clientId;
    const p = { clientId, id: freePreset.slot, slot: freePreset.slot, name: freePreset.name, color: freePreset.color, leftLabel: freePreset.leftLabel, rightLabel: freePreset.rightLabel, active: true, score: 0 };
    this.clients.set(ws, p); return p;
  }

  claimSlot(ws, slotName) {
    const player = this.clients.get(ws), preset = CLASSIC_SLOTS.find((s) => s.name === slotName);
    if (!player || !preset || (this.slots[slotName] !== null && this.slots[slotName] !== player.clientId)) return false;
    for (const k of Object.keys(this.slots)) if (this.slots[k] === player.clientId) this.slots[k] = null;
    this.slots[slotName] = player.clientId;
    Object.assign(player, { id: preset.slot, slot: preset.slot, name: preset.name, color: preset.color, leftLabel: preset.leftLabel, rightLabel: preset.rightLabel, active: true });
    return true;
  }

  removePlayer(ws) {
    const player = this.clients.get(ws);
    if (player) for (const k of Object.keys(this.slots)) if (this.slots[k] === player.clientId) this.slots[k] = null;
    return this.clients.delete(ws);
  }
  getSlotMap() { return { ...this.slots }; }
  getRoster() { return Array.from(this.clients.values()).filter((p) => p.slot >= 0).sort((a, b) => a.slot - b.slot); }
}
module.exports = new RoomManager();
