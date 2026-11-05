// ============================================================================
// SERVER ROOM MANAGER: REAL-TIME SLOT SYNC & COLOR LOCKING (< 90 LINES)
// ============================================================================
const CLASSIC_SLOTS = [
  { slot: 0, name: "Fred", color: "#ff3b30", leftLabel: "1", rightLabel: "Q" },
  { slot: 1, name: "Greenlee", color: "#32d74b", leftLabel: "Z", rightLabel: "X" },
  { slot: 2, name: "Pinkney", color: "#ff2d92", leftLabel: "M", rightLabel: "," },
  { slot: 3, name: "Bluebell", color: "#00d4ff", leftLabel: "←", rightLabel: "→" },
  { slot: 4, name: "Willem", color: "#ff9f0a", leftLabel: "C", rightLabel: "V" },
  { slot: 5, name: "Greydon", color: "#a8a8b3", leftLabel: "[", rightLabel: "]" },
];

class RoomManager {
  constructor() {
    this.state = "LOBBY";
    this.nextClientSeq = 1;
    this.clients = new Map();
    this.slots = { Fred: null, Greenlee: null, Pinkney: null, Bluebell: null, Willem: null, Greydon: null };
  }

  addPlayer(ws) {
    const clientId = `client_${this.nextClientSeq++}`;
    ws.clientId = clientId;
    const freePreset = CLASSIC_SLOTS.find((s) => this.slots[s.name] === null);
    if (!freePreset) {
      this.clients.set(ws, { clientId, id: -1, slot: -1, name: null, score: 0 });
      return this.clients.get(ws);
    }
    this.slots[freePreset.name] = clientId;
    const player = {
      clientId, id: freePreset.slot, slot: freePreset.slot, name: freePreset.name,
      color: freePreset.color, leftLabel: freePreset.leftLabel, rightLabel: freePreset.rightLabel,
      active: true, score: 0,
    };
    this.clients.set(ws, player);
    return player;
  }

  claimSlot(ws, slotName) {
    const player = this.clients.get(ws);
    const preset = CLASSIC_SLOTS.find((s) => s.name === slotName);
    if (!player || !preset) return false;
    const currentOwner = this.slots[slotName];
    if (currentOwner !== null && currentOwner !== player.clientId) return false;
    for (const key of Object.keys(this.slots)) {
      if (this.slots[key] === player.clientId) this.slots[key] = null;
    }
    this.slots[slotName] = player.clientId;
    Object.assign(player, {
      id: preset.slot, slot: preset.slot, name: preset.name,
      color: preset.color, leftLabel: preset.leftLabel, rightLabel: preset.rightLabel, active: true,
    });
    return true;
  }

  removePlayer(ws) {
    const player = this.clients.get(ws);
    if (player) {
      for (const key of Object.keys(this.slots)) {
        if (this.slots[key] === player.clientId) this.slots[key] = null;
      }
    }
    return this.clients.delete(ws);
  }

  getSlotMap() { return { ...this.slots }; }
  getRoster() {
    return Array.from(this.clients.values()).filter((p) => p.slot >= 0).sort((a, b) => a.slot - b.slot);
  }
}

module.exports = new RoomManager();
