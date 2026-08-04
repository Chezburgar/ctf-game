/* ============================================================
   utils.js — Math & helper utilities
   ============================================================ */

const Utils = {
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (min, max) => Math.random() * (max - min) + min,
  randInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  dist2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx*dx + dy*dy; },
  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  normalize: (angle) => {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  },
  angleDiff: (a, b) => {
    const d = b - a;
    return Math.atan2(Math.sin(d), Math.cos(d));
  },
  formatTime: (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  hexToRgb: (hex) => {
    const m = hex.replace('#','').match(/.{2}/g);
    return m ? { r: parseInt(m[0],16), g: parseInt(m[1],16), b: parseInt(m[2],16) } : { r:255, g:255, b:255 };
  },
  rgba: (hex, a) => {
    const { r, g, b } = Utils.hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  },
  lighten: (hex, amt) => {
    const { r, g, b } = Utils.hexToRgb(hex);
    return `rgb(${Math.min(255, r+amt)}, ${Math.min(255, g+amt)}, ${Math.min(255, b+amt)})`;
  },
  darken: (hex, amt) => {
    const { r, g, b } = Utils.hexToRgb(hex);
    return `rgb(${Math.max(0, r-amt)}, ${Math.max(0, g-amt)}, ${Math.max(0, b-amt)})`;
  },
  // Vector helpers (plain objects {x,y})
  vec: (x=0, y=0) => ({ x, y }),
  vecAdd: (a, b) => ({ x: a.x+b.x, y: a.y+b.y }),
  vecSub: (a, b) => ({ x: a.x-b.x, y: a.y-b.y }),
  vecScale: (a, s) => ({ x: a.x*s, y: a.y*s }),
  vecLen: (a) => Math.hypot(a.x, a.y),
  vecNorm: (a) => {
    const l = Math.hypot(a.x, a.y);
    return l > 0 ? { x: a.x/l, y: a.y/l } : { x:0, y:0 };
  },
  vecFromAngle: (angle, len=1) => ({ x: Math.cos(angle)*len, y: Math.sin(angle)*len }),
  uid: () => Math.random().toString(36).substr(2, 9),
};

window.Utils = Utils;
