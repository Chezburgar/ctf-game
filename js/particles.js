/* ============================================================
   particles.js — Particle effects engine
   ============================================================ */

class Particle {
  constructor(x, y, opts={}) {
    this.x = x; this.y = y;
    this.vx = opts.vx ?? Utils.rand(-50, 50);
    this.vy = opts.vy ?? Utils.rand(-50, 50);
    this.life = opts.life ?? 0.6;
    this.maxLife = this.life;
    this.size = opts.size ?? Utils.rand(2, 5);
    this.color = opts.color ?? '#ffffff';
    this.gravity = opts.gravity ?? 0;
    this.shrink = opts.shrink ?? true;
    this.glow = opts.glow ?? false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
  }
  get alive() { return this.life > 0; }
  get t() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    const a = this.t;
    const r = this.shrink ? this.size * a : this.size;
    if (r <= 0.1) return;
    ctx.globalAlpha = a;
    if (this.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

class ParticleSystem {
  constructor() { this.particles = []; }
  spawn(x, y, count, opts={}) {
    for (let i=0; i<count; i++) {
      const angle = opts.angle != null ? opts.angle + Utils.rand(-opts.spread||0, opts.spread||0) : Utils.rand(0, Math.PI*2);
      const speed = opts.speed != null ? opts.speed * Utils.rand(0.5, 1.2) : Utils.rand(40, 180);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: (opts.life ?? 0.6) * Utils.rand(0.7, 1.2),
        size: opts.size ?? Utils.rand(2,5),
        color: Array.isArray(opts.color) ? Utils.pick(opts.color) : (opts.color ?? '#fff'),
        gravity: opts.gravity ?? 0,
        glow: opts.glow ?? false,
      }));
    }
  }
  burst(x, y, color, count=20) {
    this.spawn(x, y, count, { color, speed: 220, life: 0.7, size: 4, glow: true });
  }
  trail(x, y, color) {
    this.spawn(x, y, 1, { color, speed: 0, life: 0.3, size: 3, glow: true });
  }
  confetti(x, y, colors) {
    for (let i=0;i<60;i++) {
      const angle = Utils.rand(-Math.PI, 0);
      const speed = Utils.rand(150, 400);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        life: Utils.rand(1.0, 1.8),
        size: Utils.rand(3, 6),
        color: Utils.pick(colors),
        gravity: 400,
        shrink: false,
        glow: true,
      }));
    }
  }
  update(dt) {
    for (let i=this.particles.length-1; i>=0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (!p.alive) this.particles.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
  }
  clear() { this.particles.length = 0; }
}

window.ParticleSystem = ParticleSystem;
