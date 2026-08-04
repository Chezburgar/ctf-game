/* ============================================================
   config.js — Game configuration & constants
   ============================================================ */

const CONFIG = {
  // Field dimensions (world size — much bigger than viewport)
  WIDTH: 3200,
  HEIGHT: 2000,

  // Viewport (canvas logical size — camera shows this much of the world)
  VIEW_WIDTH: 1280,
  VIEW_HEIGHT: 720,

  // Field play area
  FIELD_PADDING: 40,
  BASE_RADIUS: 130,       // safe zone circle radius
  FLAG_RADIUS: 18,

  // Player
  PLAYER_BASE_SPEED: 240,    // px/s
  PLAYER_CARRIER_SPEED: 160, // px/s (slower when carrying flag)
  PLAYER_RADIUS: 26,
  PLAYER_TAG_RANGE: 50,
  PLAYER_TAG_COOLDOWN: 0.8,  // seconds
  RESPAWN_TIME: 3.0,         // seconds
  SPRINT_MULTIPLIER: 1.4,
  STAMINA_MAX: 100,
  STAMINA_DRAIN: 35,         // per second sprinting
  STAMINA_REGEN: 22,         // per second resting

  // Flag throwing
  FLAG_THROW_SPEED: 480,
  FLAG_THROW_ARC: 0,
  FLAG_THROW_LIFETIME: 1.2,
  FLAG_CATCH_RADIUS: 42,
  FLAG_PICKUP_RADIUS: 36,
  FLAG_THROWER_IMMUNITY: 0.45,  // seconds — thrower can't catch own flag

  // Teams
  TEAMS: {
    red:  { name: 'RED',  color: '#ff3b5c', glow: '#ff6b85', baseX: 700,  baseY: 1000, side: 'left'  },
    blue: { name: 'BLUE', color: '#3ba9ff', glow: '#6bc4ff', baseX: 2500, baseY: 1000, side: 'right' },
  },

  // Halfway X coordinate
  HALFWAY_X: 1600,

  // Match
  DEFAULT_SCORE_LIMIT: 5,
  DEFAULT_TEAM_SIZE: 2,

  // Colors for character customization
  CHAR_COLORS: [
    '#ff3b5c', '#3ba9ff', '#ffd23f', '#4ade80',
    '#a855f7', '#f97316', '#06b6d4', '#ec4899',
    '#84cc16', '#eab308', '#14b8a6', '#f43f5e'
  ],

  // Banner colors
  BANNER_COLORS: [
    '#ffd23f', '#ff3b5c', '#3ba9ff', '#4ade80',
    '#a855f7', '#f97316', '#ffffff', '#0a0e1a'
  ],

  // Fanfare files (in /assets/fanfares/)
  FANFARES: [
    { id: '8bit',          name: '8bit',           file: 'assets/fanfares/8bit.mp3' },
    { id: 'charge',        name: 'Charge',         file: 'assets/fanfares/charge.mp3' },
    { id: 'crossed_wires', name: 'Crossed Wires',  file: 'assets/fanfares/crossed_wires.mp3' },
    { id: 'electric',      name: 'Electric',       file: 'assets/fanfares/tuff.mp3' },
    { id: 'flamenco',      name: 'Flamenco',       file: 'assets/fanfares/flamenco.mp3' },
    { id: 'hardcore',      name: 'Hardcore',       file: 'assets/fanfares/hardcore.mp3' },
    { id: 'knockout',      name: 'Knockout',       file: 'assets/fanfares/knockout.mp3' },
    { id: 'neo',           name: 'Neo',            file: 'assets/fanfares/neo.mp3' },
    { id: 'phantom',       name: 'The Phantom',    file: 'assets/fanfares/phantom.mp3' },
    { id: 'summer_splash', name: 'Summer Splash',  file: 'assets/fanfares/summer_splash.mp3' },
    { id: 'swing',         name: 'Swing',          file: 'assets/fanfares/swing.mp3' },
    { id: 'teatime',       name: 'Teatime',        file: 'assets/fanfares/teatime.mp3' },
  ],

  // WebRTC / TURN configuration
  TURN: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },

  // Metered TURN credentials (hardcoded for this deployment).
  METERED: {
    apiKey: '6e25060164ad49aa8e565944fc453654e8bf',
    domain: 'chezzy.metered.live',
    endpoint: () => `https://chezzy.metered.live/api/v1/turn/credentials?apiKey=6e25060164ad49aa8e565944fc453654e8bf`,
  },

  // PeerJS config (signaling).
  PEERJS: {
    host: undefined,
    port: undefined,
    path: undefined,
    secure: true,
  },

  // Network
  NET_TICK_RATE: 20,
  NET_INPUT_RATE: 30,
};

window.CONFIG = CONFIG;
