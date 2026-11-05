// ============================================================================
// PHASE 3: SERVER-SIDE ROOM MANAGER & 6-PLAYER CLASSIC ROSTER (< 90 LINES)
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
    this.clients = new Map(); // ws -> player object
  }

  getNextAvailableSlot() {
    const usedSlots = new Set();
    for (const player of this.clients.values()) {
      usedSlots.add(player.slot);
    }
    for (let i = 0; i < CLASSIC_SLOTS.length; i++) {
      if (!usedSlots.has(i)) {
        return CLASSIC_SLOTS[i];
      }
    }
    return null;
  }

  addPlayer(ws) {
    const preset = this.getNextAvailableSlot();
    if (!preset) return null;

    const player = {
      id: preset.slot,
      slot: preset.slot,
      name: preset.name,
      color: preset.color,
      leftLabel: preset.leftLabel,
      rightLabel: preset.rightLabel,
      active: true,
      score: 0,
    };

    this.clients.set(ws, player);
    return player;
  }

  removePlayer(ws) {
    const existed = this.clients.has(ws);
    this.clients.delete(ws);
    return existed;
  }

  getRoster() {
    return Array.from(this.clients.values()).sort((a, b) => a.slot - b.slot);
  }
}

module.exports = new RoomManager();
