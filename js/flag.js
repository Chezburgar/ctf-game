/* ============================================================
   flag.js — Flag entity (pickup, drop, throw, return)
   ============================================================ */

class Flag {
  constructor(team) {
    this.team = team;
    this.teamConfig = CONFIG.TEAMS[team];
    this.x = this.teamConfig.baseX;
    this.y = this.teamConfig.baseY;
    this.homeX = this.teamConfig.baseX;
    this.homeY = this.teamConfig.baseY;
    this.state = 'base';
    this.carrier = null;
    this.vx = 0; this.vy = 0;
    this.throwTimer = 0;
    this.droppedTimer = 0;
    this.angle = 0;
    this.trail = [];
    this.thrower = null;           // Player who threw (for immunity)
    this.throwerTeam = null;       // Team of the thrower (persists for catch logic)
    this.throwerImmunity = 0;      // seconds remaining of thrower immunity
  }

  canPickupBy(player) {
    if (this.state !== 'base' && this.state !== 'dropped') return false;
    return Utils.dist(this.x, this.y, player.x, player.y) <= CONFIG.FLAG_PICKUP_RADIUS + player.radius;
  }

  pickup(carrier) {
    this.state = 'carried';
    this.carrier = carrier;
    this.x = carrier.x;
    this.y = carrier.y;
    this.trail = [];
    this.thrower = null;
    this.throwerImmunity = 0;
  }

  drop(x, y) {
    this.state = 'dropped';
    this.x = x; this.y = y;
    this.carrier = null;
    this.vx = 0; this.vy = 0;
    this.droppedTimer = 0;
    this.thrower = null;
    this.throwerImmunity = 0;
  }

  throw(x, y, angle, thrower) {
    this.state = 'thrown';
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * CONFIG.FLAG_THROW_SPEED;
    this.vy = Math.sin(angle) * CONFIG.FLAG_THROW_SPEED;
    this.throwTimer = CONFIG.FLAG_THROW_LIFETIME;
    this.carrier = null;
    this.trail = [];
    this.thrower = thrower || null;
    this.throwerTeam = thrower ? thrower.team : null;
    this.throwerImmunity = CONFIG.FLAG_THROWER_IMMUNITY;
  }

  returnHome() {
    this.state = 'base';
    this.carrier = null;
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0; this.vy = 0;
    this.trail = [];
    this.thrower = null;
    this.throwerTeam = null;
    this.throwerImmunity = 0;
  }

  update(dt, world) {
    this.angle += dt * 3;

    // Decrement thrower immunity
    if (this.throwerImmunity > 0) {
      this.throwerImmunity -= dt;
      if (this.throwerImmunity <= 0) {
        this.thrower = null;
        // Keep throwerTeam so catch logic still knows who threw it
      }
    }

    if (this.state === 'carried' && this.carrier) {
      this.x = this.carrier.x;
      this.y = this.carrier.y - this.carrier.radius - 8;
    } else if (this.state === 'thrown') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.throwTimer -= dt;

      // Trail
      this.trail.push({ x: this.x, y: this.y, life: 0.35 });
      if (this.trail.length > 14) this.trail.shift();
      for (const t of this.trail) t.life -= dt;

      // Wall collision — bounce off walls
      if (world) {
        for (const wall of world.walls) {
          if (world.circleRectCollide(this.x, this.y, CONFIG.FLAG_RADIUS, wall.x, wall.y, wall.w, wall.h)) {
            // Determine bounce direction
            const closestX = Math.max(wall.x, Math.min(this.x, wall.x + wall.w));
            const closestY = Math.max(wall.y, Math.min(this.y, wall.y + wall.h));
            const dx = this.x - closestX;
            const dy = this.y - closestY;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.001) {
              // Push out and reflect velocity
              const nx = dx / dist;
              const ny = dy / dist;
              const push = CONFIG.FLAG_RADIUS - dist;
              this.x += nx * push;
              this.y += ny * push;
              // Reflect velocity
              const dot = this.vx * nx + this.vy * ny;
              this.vx -= 2 * dot * nx * 0.6;  // 0.6 = energy loss
              this.vy -= 2 * dot * ny * 0.6;
            }
          }
        }
      }

      // Bounce off field bounds
      const pad = CONFIG.FIELD_PADDING;
      if (this.x < pad + CONFIG.FLAG_RADIUS) { this.x = pad + CONFIG.FLAG_RADIUS; this.vx *= -0.5; }
      if (this.x > CONFIG.WIDTH - pad - CONFIG.FLAG_RADIUS) { this.x = CONFIG.WIDTH - pad - CONFIG.FLAG_RADIUS; this.vx *= -0.5; }
      if (this.y < pad + CONFIG.FLAG_RADIUS) { this.y = pad + CONFIG.FLAG_RADIUS; this.vy *= -0.5; }
      if (this.y > CONFIG.HEIGHT - pad - CONFIG.FLAG_RADIUS) { this.y = CONFIG.HEIGHT - pad - CONFIG.FLAG_RADIUS; this.vy *= -0.5; }

      // Expire -> drop
      if (this.throwTimer <= 0) {
        this.drop(this.x, this.y);
      }
    } else if (this.state === 'dropped') {
      this.droppedTimer += dt;
    }
  }

  draw(ctx, time) {
    // Trail
    if (this.state === 'thrown') {
      for (const t of this.trail) {
        if (t.life <= 0) continue;
        ctx.globalAlpha = (t.life / 0.35) * 0.6;
        ctx.fillStyle = this.teamConfig.glow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, CONFIG.FLAG_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    const cx = this.x, cy = this.y;
    const color = this.teamConfig.color;
    const glow = this.teamConfig.glow;

    let pulse = 1;
    if (this.state === 'dropped') {
      pulse = 1 + Math.sin(this.droppedTimer * 6) * 0.18;
    }
    if (this.state === 'base') {
      pulse = 1 + Math.sin(time * 2) * 0.1;
    }

    ctx.save();
    ctx.translate(cx, cy);

    // Glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = 25;

    // Flag pole
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(-2.5, -CONFIG.FLAG_RADIUS * pulse, 4, CONFIG.FLAG_RADIUS * 2 * pulse);
    // Pole top finial
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, -CONFIG.FLAG_RADIUS * pulse - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Flag cloth (waving)
    const wave = Math.sin(this.angle) * 5;
    const wave2 = Math.sin(this.angle + 1) * 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(1.5, -CONFIG.FLAG_RADIUS * pulse);
    ctx.lineTo(CONFIG.FLAG_RADIUS * 1.6 * pulse + wave, -CONFIG.FLAG_RADIUS * 0.5 * pulse + wave2);
    ctx.lineTo(CONFIG.FLAG_RADIUS * 1.4 * pulse + wave * 0.5, 0);
    ctx.lineTo(1.5, 0);
    ctx.closePath();
    ctx.fill();

    // Cloth highlight
    ctx.fillStyle = Utils.rgba(glow, 0.6);
    ctx.beginPath();
    ctx.moveTo(1.5, -CONFIG.FLAG_RADIUS * pulse);
    ctx.lineTo(CONFIG.FLAG_RADIUS * 0.8 * pulse + wave * 0.5, -CONFIG.FLAG_RADIUS * 0.65 * pulse + wave2 * 0.5);
    ctx.lineTo(1.5, -CONFIG.FLAG_RADIUS * 0.35 * pulse);
    ctx.closePath();
    ctx.fill();

    // Cloth shadow edge
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(1.5, -CONFIG.FLAG_RADIUS * 0.2 * pulse);
    ctx.lineTo(CONFIG.FLAG_RADIUS * 1.4 * pulse + wave * 0.5, -CONFIG.FLAG_RADIUS * 0.1 * pulse);
    ctx.lineTo(1.5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Base ring (when at home)
    if (this.state === 'base') {
      ctx.strokeStyle = Utils.rgba(glow, 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, CONFIG.FLAG_RADIUS + 10 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glow aura for thrown/dropped
    if (this.state === 'thrown' || this.state === 'dropped') {
      const auraGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 50);
      auraGrad.addColorStop(0, Utils.rgba(glow, 0.3));
      auraGrad.addColorStop(1, Utils.rgba(glow, 0));
      ctx.fillStyle = auraGrad;
      ctx.fillRect(cx - 50, cy - 50, 100, 100);
    }
  }
}

window.Flag = Flag;
