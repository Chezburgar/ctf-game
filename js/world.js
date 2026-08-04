/* ============================================================
   world.js — Game world: field, bases, flags, players, walls
   ============================================================ */

class World {
  constructor() {
    this.players = [];
    this.flags = { red: null, blue: null };
    this.scores = { red: 0, blue: 0 };
    this.time = 0;
    this.matchOver = false;
    this.winner = null;
    this.walls = [];
    this.decorations = [];
    this._buildMap();
  }

  // Build the map layout — walls, tunnels, obstacles, decorations
  _buildMap() {
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
    const cx = W / 2, cy = H / 2;
    this.walls = [];
    this.decorations = [];

    // --- Outer boundary walls ---
    const t = 30; // wall thickness
    this.walls.push({ x: 0, y: 0, w: W, h: t, type: 'boundary' });
    this.walls.push({ x: 0, y: H - t, w: W, h: t, type: 'boundary' });
    this.walls.push({ x: 0, y: 0, w: t, h: H, type: 'boundary' });
    this.walls.push({ x: W - t, y: 0, w: t, h: H, type: 'boundary' });

    // --- Central fortress (creates a chokepoint with 4 entry corridors) ---
    // Top wall of fortress (with gap in middle for top corridor)
    this.walls.push({ x: cx - 280, y: cy - 280, w: 230, h: 28, type: 'wall' });
    this.walls.push({ x: cx + 50, y: cy - 280, w: 230, h: 28, type: 'wall' });
    // Bottom wall of fortress (with gap for bottom corridor)
    this.walls.push({ x: cx - 280, y: cy + 252, w: 230, h: 28, type: 'wall' });
    this.walls.push({ x: cx + 50, y: cy + 252, w: 230, h: 28, type: 'wall' });
    // Left wall of fortress (with gap for left corridor)
    this.walls.push({ x: cx - 280, y: cy - 280, w: 28, h: 230, type: 'wall' });
    this.walls.push({ x: cx - 280, y: cy + 50, w: 28, h: 230, type: 'wall' });
    // Right wall of fortress (with gap for right corridor)
    this.walls.push({ x: cx + 252, y: cy - 280, w: 28, h: 230, type: 'wall' });
    this.walls.push({ x: cx + 252, y: cy + 50, w: 28, h: 230, type: 'wall' });
    // Central pillar (obstacle inside fortress)
    this.walls.push({ x: cx - 40, y: cy - 40, w: 80, h: 80, type: 'pillar' });

    // --- Upper side cover (L-shaped walls) ---
    this.walls.push({ x: 700, y: 350, w: 28, h: 280, type: 'wall' });
    this.walls.push({ x: 700, y: 350, w: 280, h: 28, type: 'wall' });
    this.walls.push({ x: 2220, y: 350, w: 280, h: 28, type: 'wall' });
    this.walls.push({ x: 2472, y: 350, w: 28, h: 280, type: 'wall' });

    // --- Lower side cover (mirror of upper) ---
    this.walls.push({ x: 700, y: 1370, w: 28, h: 280, type: 'wall' });
    this.walls.push({ x: 700, y: 1622, w: 280, h: 28, type: 'wall' });
    this.walls.push({ x: 2220, y: 1622, w: 280, h: 28, type: 'wall' });
    this.walls.push({ x: 2472, y: 1370, w: 28, h: 280, type: 'wall' });

    // --- Pillars near bases ---
    this.walls.push({ x: 950, y: 650, w: 60, h: 60, type: 'pillar' });
    this.walls.push({ x: 950, y: 1290, w: 60, h: 60, type: 'pillar' });
    this.walls.push({ x: 2190, y: 650, w: 60, h: 60, type: 'pillar' });
    this.walls.push({ x: 2190, y: 1290, w: 60, h: 60, type: 'pillar' });

    // --- Mid-field diagonal cover blocks ---
    this.walls.push({ x: 1050, y: 880, w: 120, h: 28, type: 'wall' });
    this.walls.push({ x: 1050, y: 1092, w: 120, h: 28, type: 'wall' });
    this.walls.push({ x: 2030, y: 880, w: 120, h: 28, type: 'wall' });
    this.walls.push({ x: 2030, y: 1092, w: 120, h: 28, type: 'wall' });

    // --- Tunnel entrances (narrow corridors formed by wall pairs) ---
    // Upper tunnel
    this.walls.push({ x: 1200, y: 450, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1300, y: 450, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1872, y: 450, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1972, y: 450, w: 28, h: 150, type: 'wall' });
    // Lower tunnel
    this.walls.push({ x: 1200, y: 1400, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1300, y: 1400, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1872, y: 1400, w: 28, h: 150, type: 'wall' });
    this.walls.push({ x: 1972, y: 1400, w: 28, h: 150, type: 'wall' });

    // --- Decorations (non-colliding visual elements) ---
    // Center courtyard decorations
    this.decorations.push({ x: cx, y: cy, type: 'rune', r: 60 });
    // Torches near fortress entrances
    this.decorations.push({ x: cx - 50, y: cy - 310, type: 'torch' });
    this.decorations.push({ x: cx + 50, y: cy - 310, type: 'torch' });
    this.decorations.push({ x: cx - 50, y: cy + 338, type: 'torch' });
    this.decorations.push({ x: cx + 50, y: cy + 338, type: 'torch' });
    // Grass tufts scattered around
    for (let i = 0; i < 40; i++) {
      this.decorations.push({
        x: Utils.rand(60, W - 60),
        y: Utils.rand(60, H - 60),
        type: 'grass',
        variant: Utils.randInt(0, 2),
      });
    }
    // Flowers
    for (let i = 0; i < 25; i++) {
      this.decorations.push({
        x: Utils.rand(60, W - 60),
        y: Utils.rand(60, H - 60),
        type: 'flower',
        color: Utils.pick(['#ff6b85', '#ffd23f', '#a855f7', '#ffffff']),
      });
    }
  }

  setupMatch(teamSize, playerTeam, playerProfile, botDifficulty) {
    this.players = [];
    this.scores = { red: 0, blue: 0 };
    this.matchOver = false;
    this.winner = null;

    this.flags.red = new Flag('red');
    this.flags.blue = new Flag('blue');

    const teams = ['red', 'blue'];
    let botId = 0;

    teams.forEach(team => {
      const teamConfig = CONFIG.TEAMS[team];
      for (let i = 0; i < teamSize; i++) {
        const angle = (i / teamSize) * Math.PI * 2 + (team === 'red' ? 0 : Math.PI);
        const spawnR = Math.min(CONFIG.BASE_RADIUS * 0.6, 30 + teamSize * 10);
        const spawnX = teamConfig.baseX + Math.cos(angle) * spawnR;
        const spawnY = teamConfig.baseY + Math.sin(angle) * spawnR;
        const isLocalPlayer = (team === playerTeam && i === 0);
        if (isLocalPlayer) {
          const p = new Player('local', team, {
            ...playerProfile,
            isBot: false,
            inputSource: 'local',
          });
          p.x = spawnX;
          p.y = spawnY;
          this.players.push(p);
        } else {
          const botProfile = this._randomBotProfile(team, botId++);
          const bot = new Player(`bot_${team}_${i}`, team, {
            ...botProfile,
            isBot: true,
            inputSource: 'ai',
          });
          bot.x = spawnX;
          bot.y = spawnY;
          this.players.push(bot);
        }
      }
    });
  }

  _randomBotProfile(team, idx) {
    const colors = CONFIG.CHAR_COLORS;
    const shapes = ['circle', 'circle', 'circle', 'square', 'triangle', 'diamond']; // bias toward circle (Gimkit-like)
    const hats = ['none', 'none', 'cap', 'crown', 'horns', 'halo'];
    const fanfares = CONFIG.FANFARES.map(f => f.id);
    const namePool = ['Ace', 'Blaze', 'Cipher', 'Dash', 'Echo', 'Frost', 'Ghost', 'Havoc', 'Iris', 'Jinx', 'Knox', 'Lynx', 'Nova', 'Onyx', 'Pixel', 'Quartz', 'Razor', 'Sable', 'Tide', 'Volt'];
    const usedNames = new Set(this.players.filter(p => p.isBot).map(p => p.name));
    const available = namePool.filter(n => !usedNames.has(n));
    const baseName = available.length > 0 ? Utils.pick(available) : Utils.pick(namePool) + idx;
    const teamColor = CONFIG.TEAMS[team].color;
    const useTeamColor = Math.random() < 0.6;
    return {
      color: useTeamColor ? teamColor : Utils.pick(colors),
      shape: Utils.pick(shapes),
      hat: Utils.pick(hats),
      name: baseName,
      fanfare: Utils.pick(fanfares),
      banner: {
        color: Utils.pick(CONFIG.BANNER_COLORS),
        accent: Utils.pick(CONFIG.BANNER_COLORS),
        pattern: Utils.pick(['stripes', 'stars', 'chevron', 'solid', 'flames', 'checker', 'diamonds', 'waves', 'burst', 'circuit']),
        text: Utils.pick(['GG', 'BOOM', 'EZ', 'POG', 'WIN', 'YES']),
        textColor: Utils.pick(['#ffffff', '#000000', '#ffd23f']),
        font: Utils.pick(['russo', 'rubik', 'mono']),
      },
    };
  }

  addRemotePlayer(id, team, profile) {
    const p = new Player(id, team, { ...profile, isBot: false, inputSource: 'remote' });
    const tc = CONFIG.TEAMS[team];
    p.x = tc.baseX + Utils.rand(-30, 30);
    p.y = tc.baseY + Utils.rand(-30, 30);
    this.players.push(p);
    return p;
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx >= 0) {
      const p = this.players[idx];
      if (p.carriedFlag) {
        p.carriedFlag.drop(p.x, p.y);
        p.carriedFlag = null;
      }
      this.players.splice(idx, 1);
    }
  }

  getPlayer(id) { return this.players.find(p => p.id === id); }
  getLocalPlayer() { return this.players.find(p => p.inputSource === 'local'); }

  // === Safe zone checks ===
  isInOwnSafeZone(player) {
    const tc = player.teamConfig;
    const d = Utils.dist(player.x, player.y, tc.baseX, tc.baseY);
    return d <= CONFIG.BASE_RADIUS;
  }

  isInEnemySafeZone(player) {
    const enemyTeam = player.team === 'red' ? 'blue' : 'red';
    const tc = CONFIG.TEAMS[enemyTeam];
    const d = Utils.dist(player.x, player.y, tc.baseX, tc.baseY);
    return d <= CONFIG.BASE_RADIUS;
  }

  isOnEnemySide(player) {
    if (player.team === 'red') return player.x > CONFIG.HALFWAY_X;
    return player.x < CONFIG.HALFWAY_X;
  }

  // === Tagging ===
  // Rules:
  //  1. You can only tag enemies (different team)
  //  2. You can only tag when victim is on YOUR side (they're the invader)
  //  3. Safe zones protect the player inside them — BOTH your own safe zone
  //     AND the enemy's safe zone make you immune (so invaders can grab the flag)
  //  4. Victim must be within tag range
  canTag(tagger, victim) {
    if (tagger.team === victim.team) return false;
    if (!victim.canBeTagged) return false;
    if (!tagger.alive) return false;
    if (tagger.tagCooldown > 0) return false;
    const d = Utils.dist(tagger.x, tagger.y, victim.x, victim.y);
    if (d > CONFIG.PLAYER_TAG_RANGE + tagger.radius) return false;

    // Safe zone immunity — can't tag anyone inside ANY safe zone
    if (this.isInOwnSafeZone(victim)) return false;
    if (this.isInEnemySafeZone(victim)) return false;

    // Victim must be on the tagger's side (i.e., victim is the invader)
    const victimOnTaggerSide = (tagger.team === 'red' && victim.x < CONFIG.HALFWAY_X) ||
                                (tagger.team === 'blue' && victim.x > CONFIG.HALFWAY_X);
    return victimOnTaggerSide;
  }

  // === Flag checks ===
  canPickupEnemyFlag(player) {
    if (!player.alive || player.carriedFlag) return false;
    const enemyTeam = player.team === 'red' ? 'blue' : 'red';
    const flag = this.flags[enemyTeam];
    return flag.canPickupBy(player);
  }

  canReturnOwnFlag(player) {
    if (!player.alive) return false;
    const flag = this.flags[player.team];
    if (flag.state !== 'dropped' && flag.state !== 'thrown') return false;
    // Only the owning team can return their own flag by touching it
    const d = Utils.dist(flag.x, flag.y, player.x, player.y);
    return d <= CONFIG.FLAG_PICKUP_RADIUS + player.radius;
  }

  canCatchThrownFlag(player) {
    if (!player.alive) return null;
    for (const team of ['red', 'blue']) {
      const flag = this.flags[team];
      if (flag.state !== 'thrown') continue;
      // Thrower immunity — can't catch own thrown flag for a brief period
      if (flag.thrower === player && flag.throwerImmunity > 0) continue;
      const d = Utils.dist(flag.x, flag.y, player.x, player.y);
      if (d <= CONFIG.FLAG_CATCH_RADIUS + player.radius) {
        return flag;
      }
    }
    return null;
  }

  // === Wall collision ===
  circleRectCollide(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < r * r;
  }

  // Resolve collision: pushes circle out of rect along smallest penetration axis
  resolveCircleRect(player, rect) {
    const cx = player.x, cy = player.y, r = player.radius;
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= r * r) return false;
    const dist = Math.sqrt(distSq);
    if (dist < 0.001) {
      // Center is inside rect — push out along nearest edge
      const distLeft = cx - rect.x;
      const distRight = (rect.x + rect.w) - cx;
      const distTop = cy - rect.y;
      const distBottom = (rect.y + rect.h) - cy;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      if (minDist === distLeft) player.x = rect.x - r;
      else if (minDist === distRight) player.x = rect.x + rect.w + r;
      else if (minDist === distTop) player.y = rect.y - r;
      else player.y = rect.y + rect.h + r;
      return true;
    }
    const push = r - dist;
    player.x += (dx / dist) * push;
    player.y += (dy / dist) * push;
    return true;
  }

  resolveWalls(player) {
    for (const wall of this.walls) {
      this.resolveCircleRect(player, wall);
    }
  }

  // === Update ===
  update(dt) {
    this.time += dt;
    this.flags.red.update(dt, this);
    this.flags.blue.update(dt, this);
    for (const p of this.players) p.update(dt, this);
  }

  // === Rendering ===
  draw(ctx, camera) {
    this._drawField(ctx, camera);
    this._drawDecorations(ctx, camera);
    this._drawSafeZones(ctx);
    this._drawWalls(ctx, camera);
    this.flags.red.draw(ctx, this.time);
    this.flags.blue.draw(ctx, this.time);
    for (const p of this.players) p.draw(ctx, this.time);
  }

  _drawField(ctx, camera) {
    const pad = CONFIG.FIELD_PADDING;
    const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

    // Base grass gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1e4032');
    grad.addColorStop(0.5, '#234a36');
    grad.addColorStop(1, '#1a3528');
    ctx.fillStyle = grad;
    ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);

    // Turf stripes (alternating shade)
    const stripeW = 100;
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = pad; x < W - pad; x += stripeW * 2) {
      ctx.fillRect(x, pad, stripeW, H - pad * 2);
    }

    // Side tints (red on left, blue on right)
    ctx.fillStyle = Utils.rgba('#ff3b5c', 0.05);
    ctx.fillRect(pad, pad, CONFIG.HALFWAY_X - pad, H - pad * 2);
    ctx.fillStyle = Utils.rgba('#3ba9ff', 0.05);
    ctx.fillRect(CONFIG.HALFWAY_X, pad, W - pad - CONFIG.HALFWAY_X, H - pad * 2);

    // Pathways (dirt paths from base to base)
    ctx.strokeStyle = 'rgba(180, 150, 100, 0.15)';
    ctx.lineWidth = 60;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CONFIG.TEAMS.red.baseX, CONFIG.TEAMS.red.baseY);
    ctx.lineTo(CONFIG.HALFWAY_X, H / 2);
    ctx.lineTo(CONFIG.TEAMS.blue.baseX, CONFIG.TEAMS.blue.baseY);
    ctx.stroke();
    // Upper path
    ctx.lineWidth = 40;
    ctx.strokeStyle = 'rgba(180, 150, 100, 0.1)';
    ctx.beginPath();
    ctx.moveTo(CONFIG.TEAMS.red.baseX, CONFIG.TEAMS.red.baseY);
    ctx.lineTo(800, 500);
    ctx.lineTo(CONFIG.HALFWAY_X, 500);
    ctx.lineTo(2400, 500);
    ctx.lineTo(CONFIG.TEAMS.blue.baseX, CONFIG.TEAMS.blue.baseY);
    ctx.stroke();
    // Lower path
    ctx.beginPath();
    ctx.moveTo(CONFIG.TEAMS.red.baseX, CONFIG.TEAMS.red.baseY);
    ctx.lineTo(800, 1500);
    ctx.lineTo(CONFIG.HALFWAY_X, 1500);
    ctx.lineTo(2400, 1500);
    ctx.lineTo(CONFIG.TEAMS.blue.baseX, CONFIG.TEAMS.blue.baseY);
    ctx.stroke();

    // Field border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // Halfway line (dashed)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(CONFIG.HALFWAY_X, pad);
    ctx.lineTo(CONFIG.HALFWAY_X, H - pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CONFIG.HALFWAY_X, H / 2, 100, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawDecorations(ctx, camera) {
    for (const d of this.decorations) {
      // Cull off-screen decorations
      if (d.x < camera.x - 50 || d.x > camera.x + camera.viewW + 50) continue;
      if (d.y < camera.y - 50 || d.y > camera.y + camera.viewH + 50) continue;

      if (d.type === 'grass') {
        ctx.strokeStyle = 'rgba(80, 140, 70, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 4, d.y - 8);
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y - 10);
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 4, d.y - 8);
        ctx.stroke();
      } else if (d.type === 'flower') {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.ellipse(d.x + Math.cos(a) * 4, d.y + Math.sin(a) * 4, 3, 3, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'torch') {
        // Torch base
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(d.x - 4, d.y - 10, 8, 20);
        // Flame
        const flicker = Math.sin(this.time * 12 + d.x) * 3;
        ctx.fillStyle = 'rgba(255, 160, 40, 0.8)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y - 18 + flicker, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 230, 100, 0.9)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y - 16 + flicker, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        const glowGrad = ctx.createRadialGradient(d.x, d.y - 16, 5, d.x, d.y - 16, 60);
        glowGrad.addColorStop(0, 'rgba(255, 180, 60, 0.3)');
        glowGrad.addColorStop(1, 'rgba(255, 180, 60, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(d.x - 60, d.y - 76, 120, 120);
      } else if (d.type === 'rune') {
        // Center rune circle
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(this.time * 0.2);
        ctx.strokeStyle = Utils.rgba('#ffd23f', 0.2 + Math.sin(this.time * 2) * 0.1);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.moveTo(Math.cos(a) * d.r * 0.7, Math.sin(a) * d.r * 0.7);
          ctx.lineTo(Math.cos(a) * d.r, Math.sin(a) * d.r);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawWalls(ctx, camera) {
    for (const wall of this.walls) {
      // Cull off-screen walls
      if (wall.x + wall.w < camera.x - 10 || wall.x > camera.x + camera.viewW + 10) continue;
      if (wall.y + wall.h < camera.y - 10 || wall.y > camera.y + camera.viewH + 10) continue;

      if (wall.type === 'boundary') {
        this._drawBoundaryWall(ctx, wall);
      } else if (wall.type === 'pillar') {
        this._drawPillar(ctx, wall);
      } else {
        this._drawWall(ctx, wall);
      }
    }
  }

  _drawWall(ctx, wall) {
    const { x, y, w, h } = wall;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + 5, y + 5, w, h);
    // Stone gradient body
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#525e74');
    grad.addColorStop(0.3, '#3a4458');
    grad.addColorStop(0.7, '#2a3242');
    grad.addColorStop(1, '#1e2530');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, w, 3);
    // Left highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, y, 3, h);
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x, y + h - 4, w, 4);
    // Brick texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    const brickH = 20;
    for (let by = y + brickH; by < y + h; by += brickH) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }
    // Vertical brick lines (offset alternating)
    const brickW = 40;
    let row = 0;
    for (let by = y; by < y + h; by += brickH) {
      const offset = (row % 2) * (brickW / 2);
      for (let bx = x + offset + brickW; bx < x + w; bx += brickW) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + brickH);
        ctx.stroke();
      }
      row++;
    }
    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawBoundaryWall(ctx, wall) {
    const { x, y, w, h } = wall;
    const grad = ctx.createLinearGradient(x, y, x + (w > h ? 0 : w), y + (h > w ? 0 : h));
    grad.addColorStop(0, '#3a4458');
    grad.addColorStop(0.5, '#252d3d');
    grad.addColorStop(1, '#15192a');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    // Inner edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    if (w > h) ctx.fillRect(x, y, w, 2);
    else ctx.fillRect(x, y, 2, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  _drawPillar(ctx, wall) {
    const { x, y, w, h } = wall;
    const cx = x + w / 2, cy = y + h / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 4, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stone pillar with radial gradient
    const grad = ctx.createRadialGradient(cx - w * 0.2, cy - h * 0.2, 2, cx, cy, w * 0.7);
    grad.addColorStop(0, '#6a7488');
    grad.addColorStop(0.5, '#3e4858');
    grad.addColorStop(1, '#1e2530');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.15, cy - h * 0.15, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawSafeZones(ctx) {
    for (const team of ['red', 'blue']) {
      const tc = CONFIG.TEAMS[team];
      const pulse = 1 + Math.sin(this.time * 1.5) * 0.05;
      // Outer glow
      const grad = ctx.createRadialGradient(tc.baseX, tc.baseY, CONFIG.BASE_RADIUS * 0.2, tc.baseX, tc.baseY, CONFIG.BASE_RADIUS);
      grad.addColorStop(0, Utils.rgba(tc.glow, 0.22));
      grad.addColorStop(0.7, Utils.rgba(tc.glow, 0.08));
      grad.addColorStop(1, Utils.rgba(tc.glow, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(tc.baseX, tc.baseY, CONFIG.BASE_RADIUS * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Dashed ring
      ctx.strokeStyle = Utils.rgba(tc.glow, 0.7);
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(tc.baseX, tc.baseY, CONFIG.BASE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Inner pad
      ctx.fillStyle = Utils.rgba(tc.color, 0.3);
      ctx.beginPath();
      ctx.arc(tc.baseX, tc.baseY, CONFIG.BASE_RADIUS * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = Utils.rgba(tc.color, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tc.baseX, tc.baseY, CONFIG.BASE_RADIUS * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      // Team letter
      ctx.fillStyle = Utils.rgba(tc.glow, 0.5);
      ctx.font = 'bold 52px Russo One';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tc.name[0], tc.baseX, tc.baseY);
    }
  }

  // === Minimap (drawn in screen space, not world space) ===
  drawMinimap(ctx, viewW, viewH, camera) {
    const mmW = 220, mmH = mmW * (CONFIG.HEIGHT / CONFIG.WIDTH);
    const mmX = viewW - mmW - 20;
    const mmY = 20;
    const sx = mmW / CONFIG.WIDTH;
    const sy = mmH / CONFIG.HEIGHT;

    // Background
    ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // Walls
    ctx.fillStyle = 'rgba(120, 130, 150, 0.5)';
    for (const wall of this.walls) {
      if (wall.type === 'boundary') continue;
      ctx.fillRect(mmX + wall.x * sx, mmY + wall.y * sy, Math.max(1, wall.w * sx), Math.max(1, wall.h * sy));
    }

    // Bases
    for (const team of ['red', 'blue']) {
      const tc = CONFIG.TEAMS[team];
      ctx.fillStyle = tc.color;
      ctx.beginPath();
      ctx.arc(mmX + tc.baseX * sx, mmY + tc.baseY * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flags (if not carried)
    for (const team of ['red', 'blue']) {
      const flag = this.flags[team];
      if (!flag) continue;
      if (flag.state === 'carried') continue;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(mmX + flag.x * sx, mmY + flag.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of this.players) {
      if (!p.alive) continue;
      ctx.fillStyle = p.teamConfig.color;
      ctx.beginPath();
      ctx.arc(mmX + p.x * sx, mmY + p.y * sy, p.inputSource === 'local' ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Highlight local player
      if (p.inputSource === 'local') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mmX + p.x * sx, mmY + p.y * sy, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Camera viewport rectangle
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mmX + camera.x * sx, mmY + camera.y * sy, viewW * sx, viewH * sy);
  }
}

window.World = World;
