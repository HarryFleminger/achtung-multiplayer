// ============================================================================
// ACHTUNG, DIE KURVE! (VERSION 2) - CONFIGURATION & POWER-UP DEFINITIONS
// ============================================================================

window.ACHTUNG_CONFIG = {
  // --- Core Physics & Trail Settings ---
  moveSpeed: 2.35,           // Pixels per frame (at 60 FPS)
  turnSpeed: 0.052,          // Radians per frame when steering
  lineWidth: 4.5,            // Thickness of the curve trail in pixels
  headRadius: 2.4,           // Radius of the leading head dot

  // --- Trail Gap Settings ---
  gapsEnabled: true,         // Whether curves periodically leave gaps
  gapIntervalMin: 130,       // Minimum frames between gaps
  gapIntervalMax: 320,       // Maximum frames between gaps
  gapDurationMin: 11,        // Minimum frames a gap lasts
  gapDurationMax: 18,        // Maximum frames a gap lasts

  // --- Round & Arena Rules ---
  startGraceFrames: 50,      // Frames at start of round before trails become solid
  countdownSeconds: 1.2,     // Pre-round freeze time showing spawn positions & directions
  borderMargin: 16,          // Spawn safety margin from arena walls (multiplied by 5)
  wrapWalls: false,          // If true, going through a wall wraps to the opposite side
  autoGoalScore: true,       // Automatically set goal score to (players - 1) * 10
  customGoalScore: 20,       // Used when autoGoalScore is false

  // --- Optional Modifiers ---
  speedRampPerSec: 0,        // Increase speed slowly over the round (0 = constant speed)
  selfCollision: true,       // Whether crashing into your own trail kills you
  headColorMode: "yellow",   // "yellow", "white", or "match"

  // --- Power-Up Spawn Settings ---
  powerupsEnabled: true,     // Master toggle for spawning power-ups in the arena
  powerupSpawnMinFrames: 130,// ~2.1 seconds min between spawns
  powerupSpawnMaxFrames: 240,// ~4.0 seconds max between spawns
  powerupMaxOnScreen: 6,     // Max simultaneous power-up orbs in the arena
  powerupOrbRadius: 15,      // Radius of power-up items on the canvas

  // --- Power-Up Catalog (Effects Stack When Collected Multiple Times!) ---
  // target: "others" = GREEN orb (affects all other living players)
  // target: "self"   = RED orb   (affects only the player who collects it)
  powerupCatalog: [
    {
      id: "speed_self",
      type: "speed",
      target: "self",
      name: "Turbo Speed (You)",
      desc: "Red: Speeds ONLY YOU up (stacks: 1.65x per orb!)",
      icon: "⚡",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "speed_others",
      type: "speed",
      target: "others",
      name: "Turbo Speed (Others)",
      desc: "Green: Speeds OTHER players up (stacks: 1.65x per orb!)",
      icon: "⚡",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "slow_self",
      type: "slow",
      target: "self",
      name: "Slow-Mo (You)",
      desc: "Red: Slows ONLY YOU down (stacks: 0.58x per orb!)",
      icon: "🐢",
      durationSec: 5.5,
      enabled: true,
    },
    {
      id: "slow_others",
      type: "slow",
      target: "others",
      name: "Slow-Mo (Others)",
      desc: "Green: Slows OTHER players down (stacks: 0.58x per orb!)",
      icon: "🐢",
      durationSec: 5.5,
      enabled: true,
    },
    {
      id: "thick_others",
      type: "thick",
      target: "others",
      name: "Giant Body (Others)",
      desc: "Green: Doubles OTHER players' thickness per stack (2x, 4x, 8x!)",
      icon: "🐘",
      durationSec: 6.0,
      enabled: true,
    },
    {
      id: "thick_self",
      type: "thick",
      target: "self",
      name: "Giant Body (You)",
      desc: "Red: Doubles ONLY YOUR thickness per stack (2x, 4x, 8x!)",
      icon: "🐘",
      durationSec: 6.0,
      enabled: true,
    },
    {
      id: "thin_self",
      type: "thin",
      target: "self",
      name: "Thin Body (You)",
      desc: "Red: Halves ONLY YOUR body thickness per stack (0.5x, 0.25x!)",
      icon: "🪡",
      durationSec: 6.5,
      enabled: true,
    },
    {
      id: "thin_others",
      type: "thin",
      target: "others",
      name: "Thin Body (Others)",
      desc: "Green: Halves OTHER players' body thickness per stack",
      icon: "🪡",
      durationSec: 6.5,
      enabled: false,
    },
    {
      id: "wallwalk_self",
      type: "wallwalk",
      target: "self",
      name: "Go Through Walls (You)",
      desc: "Red: ONLY YOU can drive through arena walls & wrap around!",
      icon: "🚪",
      durationSec: 7.0,
      enabled: true,
    },
    {
      id: "wallwalk_others",
      type: "wallwalk",
      target: "others",
      name: "Go Through Walls (Others)",
      desc: "Green: OTHER players can drive through arena walls & wrap around",
      icon: "🚪",
      durationSec: 7.0,
      enabled: true,
    },
    {
      id: "ghost_self",
      type: "ghost",
      target: "self",
      name: "Ghost Phase (You)",
      desc: "Red: ONLY YOU pass through both trails & walls unhindered!",
      icon: "👻",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "reverse_others",
      type: "reverse",
      target: "others",
      name: "Reverse Controls (Others)",
      desc: "Green: Swaps Left/Right steering for OTHER players",
      icon: "⇄",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "reverse_self",
      type: "reverse",
      target: "self",
      name: "Reverse Controls (You)",
      desc: "Red: Swaps Left/Right steering for ONLY YOU",
      icon: "⇄",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "square_others",
      type: "square",
      target: "others",
      name: "90° Right Angles (Others)",
      desc: "Green: Forces OTHER players to turn in sharp 90° angles",
      icon: "📐",
      durationSec: 5.5,
      enabled: true,
    },
    {
      id: "square_self",
      type: "square",
      target: "self",
      name: "90° Right Angles (You)",
      desc: "Red: Makes ONLY YOU turn in sharp 90° angles",
      icon: "📐",
      durationSec: 5.5,
      enabled: true,
    },
    {
      id: "wobble_others",
      type: "wobble",
      target: "others",
      name: "Drunk Wobble (Others)",
      desc: "Green: Makes OTHER players weave (stacks increase wobble!)",
      icon: "🌀",
      durationSec: 5.0,
      enabled: true,
    },
    {
      id: "clear_arena",
      type: "clear",
      target: "self",
      name: "Clean Slate (Erase Trails)",
      desc: "Red: Instantly wipes all existing trails in the arena",
      icon: "🧹",
      durationSec: 0,
      enabled: true,
    },
  ],

  // --- Default 6 Players (from achtung.life) ---
  defaultPlayers: [
    {
      id: 0,
      name: "Fred",
      color: "#ff3b30",
      active: true,
      isBot: false,
      leftKey: "Digit1",
      leftLabel: "1",
      rightKey: "KeyQ",
      rightLabel: "Q",
    },
    {
      id: 1,
      name: "Greenlee",
      color: "#32d74b",
      active: true,
      isBot: false,
      leftKey: "KeyZ",
      leftLabel: "Z",
      rightKey: "KeyX",
      rightLabel: "X",
    },
    {
      id: 2,
      name: "Pinkney",
      color: "#ff2d92",
      active: false,
      isBot: false,
      leftKey: "KeyM",
      leftLabel: "M",
      rightKey: "Comma",
      rightLabel: ",",
    },
    {
      id: 3,
      name: "Bluebell",
      color: "#00d4ff",
      active: false,
      isBot: false,
      leftKey: "ArrowLeft",
      leftLabel: "←",
      rightKey: "ArrowRight",
      rightLabel: "→",
    },
    {
      id: 4,
      name: "Willem",
      color: "#ff9f0a",
      active: false,
      isBot: false,
      leftKey: "KeyC",
      leftLabel: "C",
      rightKey: "KeyV",
      rightLabel: "V",
    },
    {
      id: 5,
      name: "Greydon",
      color: "#a8a8b3",
      active: false,
      isBot: false,
      leftKey: "BracketLeft",
      leftLabel: "[",
      rightKey: "BracketRight",
      rightLabel: "]",
    },
  ],
};
