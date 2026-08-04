/* ============================================================
   input.js — Keyboard + mouse input manager
   ============================================================ */

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};           // current key states
    this.keysPressed = {};    // pressed this frame
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) this.keysPressed[k] = true;
      this.keys[k] = true;
      // Prevent space/arrow scrolling
      if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
    });
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Call at end of frame to clear per-frame state
  endFrame() {
    this.keysPressed = {};
    this.mouse.clicked = false;
  }

  isDown(...keys) { return keys.some(k => this.keys[k.toLowerCase()]); }
  wasPressed(...keys) { return keys.some(k => this.keysPressed[k.toLowerCase()]); }

  // Movement vector from WASD/Arrows
  moveVector() {
    let x = 0, y = 0;
    if (this.isDown('a','arrowleft'))  x -= 1;
    if (this.isDown('d','arrowright')) x += 1;
    if (this.isDown('w','arrowup'))    y -= 1;
    if (this.isDown('s','arrowdown'))  y += 1;
    return Utils.vecNorm({ x, y });
  }
}

window.InputManager = InputManager;
