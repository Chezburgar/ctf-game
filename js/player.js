/* ============================================================
   player.js — Player entity (Gimkit-style character)
   ============================================================ */

class Player {
  constructor(id, team, opts={}) {
    this.id = id;
    this.team = team;
    this.teamConfig = CONFIG.TEAMS[team];

    this.x = this.teamConfig.baseX;
    this.y = this.teamConfig.baseY;
    this.vx = 0; this.vy = 0;
    this.aim = 0;

    this.alive = true;
    this.respawnTimer = 0;
    this.tagCooldown = 0;
    this.tagFlash = 0;
    this.hurtFlash = 0;

    this.carriedFlag = null;
    this.stamina = CONFIG.STAMINA_MAX;

    // Customization (NO size/speed — fixed for balance)
    this.color = opts.color || this.teamConfig.color;
    this.shape = opts.shape || 'circle';  // visual variety only, same hitbox
    this.radius = CONFIG.PLAYER_RADIUS;   // FIXED — not customizable
    this.hat = opts.hat || 'none';
    this.name = opts.name || 'Player';
    this.fanfare = opts.fanfare || 'charge';
    this.banner = opts.banner || { color: '#ffd23f', pattern: 'stripes', text: 'VICTORY' };

    this.isBot = opts.isBot || false;
    this.aiState = 'attack';
    this.inputSource = opts.inputSource || 'local';

    // Network interpolation
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetAim = this.aim;

    // Animation
    this.bobPhase = Math.random() * Math.PI * 2;
    this.facingX = 1;  // for sprite flipping
  }

  get baseSpeed() {
    return this.carriedFlag ? CONFIG.PLAYER_CARRIER_SPEED : CONFIG.PLAYER_BASE_SPEED;
  }

  get isCarrier() { return this.carriedFlag != null; }

  get canBeTagged() {
    if (!this.alive) return false;
    if (this.tagCooldown > 0) return false;
    return true;
  }

  applyMove(moveVec, aimAngle, sprint, dt, world) {
    if (!this.alive) return;

    let speed = this.baseSpeed;
    if (sprint && this.stamina > 0 && !this.isCarrier) {
      speed *= CONFIG.SPRINT_MULTIPLIER;
      this.stamina = Math.max(0, this.stamina - CONFIG.STAMINA_DRAIN * dt);
    } else {
      this.stamina = Math.min(CONFIG.STAMINA_MAX, this.stamina + CONFIG.STAMINA_REGEN * dt);
    }

    this.vx = moveVec.x * speed;
    this.vy = moveVec.y * speed;

    // Move X, resolve wall collisions on X
    this.x += this.vx * dt;
    if (world) world.resolveWalls(this);

    // Move Y, resolve wall collisions on Y
    this.y += this.vy * dt;
    if (world) world.resolveWalls(this);

    this.aim = aimAngle;
    if (Math.abs(Math.cos(this.aim)) > 0.1) this.facingX = Math.cos(this.aim) > 0 ? 1 : -1;

    // Clamp to field
    const pad = CONFIG.FIELD_PADDING + this.radius;
    this.x = Utils.clamp(this.x, pad, CONFIG.WIDTH - pad);
    this.y = Utils.clamp(this.y, pad, CONFIG.HEIGHT - pad);

    // Player-player soft collision
    world.players.forEach(other => {
      if (other === this || !other.alive) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const d = Math.hypot(dx, dy);
      const minD = this.radius + other.radius;
      if (d < minD && d > 0.001) {
        const push = (minD - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        this.x += nx * push;
        this.y += ny * push;
      }
    });

    // Bob animation
    if (Math.abs(this.vx) > 5 || Math.abs(this.vy) > 5) {
      this.bobPhase += dt * 12;
    }
  }

  netInterpolate(dt) {
    if (this.inputSource !== 'remote') return;
    const t = Math.min(1, dt * 12);
    this.x = Utils.lerp(this.x, this.targetX, t);
    this.y = Utils.lerp(this.y, this.targetY, t);
    this.aim = Utils.lerp(this.aim, this.targetAim, t);
  }

  update(dt, world) {
    if (this.tagCooldown > 0) this.tagCooldown -= dt;
    if (this.tagFlash > 0) this.tagFlash -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    this.bobPhase += dt * 4;

    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn(world);
      return;
    }

    this.netInterpolate(dt);

    if (this.carriedFlag) {
      this.carriedFlag.x = this.x;
      this.carriedFlag.y = this.y - this.radius - 8;
    }
  }

  tagged(world) {
    if (!this.canBeTagged) return false;
    this.alive = false;
    this.respawnTimer = CONFIG.RESPAWN_TIME;
    this.tagCooldown = 1.0;
    this.hurtFlash = 0.5;
    if (this.carriedFlag) {
      this.carriedFlag.drop(this.x, this.y);
      this.carriedFlag = null;
    }
    return true;
  }

  respawn(world) {
    this.alive = true;
    this.x = this.teamConfig.baseX + Utils.rand(-40, 40);
    this.y = this.teamConfig.baseY + Utils.rand(-40, 40);
    this.vx = 0; this.vy = 0;
    this.stamina = CONFIG.STAMINA_MAX;
  }

  pickupFlag(flag) {
    if (flag.team === this.team) return false;
    if (this.carriedFlag) return false;
    flag.pickup(this);
    this.carriedFlag = flag;
    return true;
  }

  throwFlag() {
    if (!this.carriedFlag) return null;
    const flag = this.carriedFlag;
    flag.throw(this.x, this.y, this.aim, this);
    this.carriedFlag = null;
    return flag;
  }

  hasScored() {
    if (!this.carriedFlag) return false;
    // Score when the carrier crosses back into their own half of the field
    if (this.team === 'red') return this.x < CONFIG.HALFWAY_X;
    return this.x > CONFIG.HALFWAY_X;
  }

  // === RENDERING — Gimkit-style character ===
  draw(ctx, time) {
    if (!this.alive) {
      const bx = this.teamConfig.baseX, by = this.teamConfig.baseY;
      ctx.save();
      ctx.globalAlpha = 0.7;
      // Respawn circle
      ctx.fillStyle = Utils.rgba(this.teamConfig.glow, 0.2);
      ctx.beginPath();
      ctx.arc(bx, by, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = Utils.rgba(this.teamConfig.glow, 0.6);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(bx, by, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Countdown number
      ctx.fillStyle = this.teamConfig.glow;
      ctx.font = 'bold 22px Russo One';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = this.teamConfig.glow;
      ctx.shadowBlur = 10;
      ctx.fillText(`${Math.ceil(this.respawnTimer)}`, bx, by);
      ctx.shadowBlur = 0;
      ctx.font = '10px Rubik';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('RESPAWN', bx, by + 22);
      ctx.restore();
      return;
    }

    const bob = Math.sin(this.bobPhase) * 2;
    const r = this.radius;

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // Shadow (on ground, not bobbing)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75 - bob, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aim indicator (small arrow)
    if (this.inputSource !== 'remote') {
      const aimLen = r + 16;
      ctx.save();
      ctx.rotate(this.aim);
      ctx.fillStyle = Utils.rgba(this.color, 0.7);
      ctx.beginPath();
      ctx.moveTo(aimLen, 0);
      ctx.lineTo(aimLen - 10, -5);
      ctx.lineTo(aimLen - 10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Body color (with flash effects)
    let bodyColor = this.color;
    if (this.tagFlash > 0) bodyColor = Utils.lighten(this.color, 80);
    if (this.hurtFlash > 0) {
      const t = this.hurtFlash / 0.5;
      bodyColor = Utils.lighten(this.color, Math.floor(120 * t));
    }

    // Spawn immunity shimmer
    let alpha = 1;
    if (this.tagCooldown > 0) {
      alpha = 0.5 + Math.sin(time * 20) * 0.3;
    }
    ctx.globalAlpha = alpha;

    // === Gimkit-style body ===
    // Outer glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;

    // Main body (round, slightly squashed — like a little blob creature)
    this._drawBody(ctx, r, bodyColor);

    // Team-colored thick outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.teamConfig.color;
    ctx.lineWidth = 4;
    this._drawBodyOutline(ctx, r);

    // Inner highlight (gives 3D look)
    ctx.fillStyle = Utils.rgba('#ffffff', 0.25);
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // === Eyes (big, expressive — Gimkit style) ===
    // Eyes look toward aim direction
    const eyeOff = r * 0.32;
    const eyeY = -r * 0.15;
    const eyeR = r * 0.28;
    const pupilOff = eyeR * 0.35;
    const pupilX = Math.cos(this.aim) * pupilOff;
    const pupilY = Math.sin(this.aim) * pupilOff;

    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeOff, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeOff, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    // Eye outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-eyeOff, eyeY, eyeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeOff, eyeY, eyeR, 0, Math.PI * 2);
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-eyeOff + pupilX, eyeY + pupilY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.arc(eyeOff + pupilX, eyeY + pupilY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // Pupil shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeOff + pupilX - eyeR * 0.15, eyeY + pupilY - eyeR * 0.15, eyeR * 0.18, 0, Math.PI * 2);
    ctx.arc(eyeOff + pupilX - eyeR * 0.15, eyeY + pupilY - eyeR * 0.15, eyeR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // === Mouth (small smile) ===
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.isCarrier) {
      // Open happy mouth when carrying flag
      ctx.arc(0, r * 0.25, r * 0.2, 0.2, Math.PI - 0.2);
    } else {
      // Slight smile
      ctx.arc(0, r * 0.2, r * 0.18, 0.3, Math.PI - 0.3);
    }
    ctx.stroke();

    // Cheeks (cute blush)
    ctx.fillStyle = Utils.rgba('#ff6b85', 0.3);
    ctx.beginPath();
    ctx.arc(-r * 0.45, r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.45, r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // === Hat ===
    this._drawHat(ctx, r);

    // === Little feet (visible when moving) ===
    const footBob = Math.sin(this.bobPhase * 2) * 3;
    ctx.fillStyle = Utils.darken(this.color, 30);
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, r * 0.75 + footBob, r * 0.18, r * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, r * 0.75 - footBob, r * 0.18, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();

    // === Name label (above head) ===
    ctx.save();
    ctx.font = 'bold 13px Rubik';
    ctx.textAlign = 'center';
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(this.name, this.x + 1, this.y - r - 16 + 1);
    // Text
    ctx.fillStyle = this.isCarrier ? '#ffd23f' : 'rgba(255,255,255,0.9)';
    if (this.isCarrier) {
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 8;
    }
    ctx.fillText(this.name, this.x, this.y - r - 16);
    ctx.shadowBlur = 0;

    // Carrier star
    if (this.isCarrier) {
      ctx.font = '16px Rubik';
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 10;
      const nameW = ctx.measureText(this.name).width;
      ctx.fillText('★', this.x + nameW / 2 + 12, this.y - r - 14);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // === Stamina bar (local player only) ===
    if (this.inputSource === 'local') {
      const bw = 42, bh = 5;
      const bx = this.x - bw / 2;
      const by = this.y + r + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = this.stamina > 30 ? '#4ade80' : '#f59e0b';
      ctx.fillRect(bx, by, bw * (this.stamina / CONFIG.STAMINA_MAX), bh);
    }
  }

  // Draw body shape (filled)
  _drawBody(ctx, r, color) {
    ctx.fillStyle = color;
    switch (this.shape) {
      case 'square':
        // Rounded square (Gimkit-like)
        this._roundRect(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.95, r * 0.75);
        ctx.lineTo(-r * 0.95, r * 0.75);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'circle':
      default:
        // Slightly squashed circle (blob-like, Gimkit style)
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // Draw body shape outline
  _drawBodyOutline(ctx, r) {
    switch (this.shape) {
      case 'square':
        this._roundRect(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25);
        ctx.stroke();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.95, r * 0.75);
        ctx.lineTo(-r * 0.95, r * 0.75);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'circle':
      default:
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _drawHat(ctx, r) {
    switch (this.hat) {
      case 'cap':
        ctx.fillStyle = Utils.darken(this.color, 40);
        ctx.beginPath();
        ctx.arc(0, -r * 0.55, r * 0.75, Math.PI, 0);
        ctx.fill();
        // Brim
        ctx.fillStyle = Utils.darken(this.color, 60);
        ctx.fillRect(-r * 0.75, -r * 0.6, r * 1.5, 5);
        // Cap button
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(0, -r * 0.9, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'crown':
        ctx.fillStyle = '#ffd23f';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.45);
        ctx.lineTo(-r * 0.7, -r * 1.15);
        ctx.lineTo(-r * 0.35, -r * 0.75);
        ctx.lineTo(0, -r * 1.25);
        ctx.lineTo(r * 0.35, -r * 0.75);
        ctx.lineTo(r * 0.7, -r * 1.15);
        ctx.lineTo(r * 0.7, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Gems
        ctx.fillStyle = '#ff3b5c';
        ctx.beginPath();
        ctx.arc(0, -r * 0.7, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3ba9ff';
        ctx.beginPath();
        ctx.arc(-r * 0.4, -r * 0.6, 2.5, 0, Math.PI * 2);
        ctx.arc(r * 0.4, -r * 0.6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'horns':
        ctx.fillStyle = '#8b0000';
        ctx.strokeStyle = '#4a0000';
        ctx.lineWidth = 1.5;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.65);
        ctx.quadraticCurveTo(-r * 1.1, -r * 1.0, -r * 0.85, -r * 1.35);
        ctx.quadraticCurveTo(-r * 0.55, -r * 1.0, -r * 0.35, -r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(r * 0.6, -r * 0.65);
        ctx.quadraticCurveTo(r * 1.1, -r * 1.0, r * 0.85, -r * 1.35);
        ctx.quadraticCurveTo(r * 0.55, -r * 1.0, r * 0.35, -r * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'halo':
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ffd23f';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, -r * 1.1, r * 0.75, r * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
    }
  }

  serialize() {
    return {
      id: this.id,
      team: this.team,
      x: this.x, y: this.y,
      aim: this.aim,
      alive: this.alive,
      respawnTimer: this.respawnTimer,
      tagCooldown: this.tagCooldown,
      isCarrier: this.isCarrier,
      stamina: this.stamina,
      color: this.color,
      shape: this.shape,
      hat: this.hat,
      name: this.name,
    };
  }

  applyNetState(s) {
    this.targetX = s.x;
    this.targetY = s.y;
    this.targetAim = s.aim;
    this.alive = s.alive;
    this.respawnTimer = s.respawnTimer;
    this.tagCooldown = s.tagCooldown;
    this.stamina = s.stamina;
    if (this.color !== s.color) this.color = s.color;
    if (this.shape !== s.shape) this.shape = s.shape;
    if (this.hat !== s.hat) this.hat = s.hat;
    if (this.name !== s.name) this.name = s.name;
  }
}

window.Player = Player;
