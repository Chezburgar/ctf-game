/* ============================================================
   ai.js — Bot AI controller
   ============================================================ */

class AIController {
  constructor(difficulty='medium') {
    this.difficulty = difficulty;
    const presets = {
      easy:   { reactDelay: 0.45, errAngle: 0.35, speedMul: 0.85, tagAggression: 0.4, throwChance: 0.05 },
      medium: { reactDelay: 0.25, errAngle: 0.18, speedMul: 0.95, tagAggression: 0.7, throwChance: 0.15 },
      hard:   { reactDelay: 0.10, errAngle: 0.06, speedMul: 1.05, tagAggression: 0.95, throwChance: 0.35 },
    };
    this.preset = presets[difficulty] || presets.medium;

    // === Per-bot personality — randomized so each bot feels different ===
    // Aggressiveness: how willing to chase tags vs focus on objective (0..1)
    this.aggression = Utils.rand(0.2, 1.0);
    // Route preference: -1 = prefer top routes, +1 = prefer bottom routes, 0 = neutral
    this.routeBias = Utils.rand(-1, 1);
    // Speed variance: each bot is slightly faster or slower (0.85..1.15)
    this.speedVariance = Utils.rand(0.85, 1.15);
    // Wander tendency: how often the bot deviates from direct path (0..1)
    this.wander = Utils.rand(0.1, 0.6);
    // Throw willingness: how eager to pass the flag (0..1)
    this.throwWillingness = Utils.rand(0.2, 1.0);
    // Defend tendency: how often to fall back and defend (0..1)
    this.defendBias = Utils.rand(0.0, 0.6);
    // Reaction time variance: some bots are quicker to react
    this.reactVariance = Utils.rand(0.5, 1.5);
    // Random wander offset — changes over time for organic movement
    this.wanderAngle = Utils.rand(0, Math.PI * 2);
    this.wanderTimer = 0;
    // Strafe direction: each bot has a preferred side to strafe (left/right)
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 0;

    this.reactTimer = 0;
    this.target = null;
    this.lastDecision = 0;
    // Smoothed move vector — prevents per-frame jitter
    this.smoothMove = { x: 0, y: 0 };
  }

  // Decide what the bot should do this frame
  // Returns { move: {x,y}, aim, sprint: bool, throw: bool, pickup: bool }
  compute(bot, world, dt) {
    const preset = this.preset;
    const team = bot.team;
    const enemyTeam = team === 'red' ? 'blue' : 'red';
    const enemyFlag = world.flags[enemyTeam];
    const ownFlag = world.flags[team];

    let move = { x: 0, y: 0 };
    let aim = bot.aim;
    let sprint = false;
    let throwFlag = false;
    let pickup = false;

    // Update wander timer — wander angle drifts over time for organic movement
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = Utils.rand(0.3, 1.2);
      this.wanderAngle += Utils.rand(-0.8, 0.8);
    }
    // Update strafe timer — bots periodically switch strafe direction
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = Utils.rand(1.5, 4.0);
      this.strafeDir *= -1;
    }

    // Reaction delay — varies per bot (reactVariance)
    this.reactTimer -= dt;
    if (this.reactTimer <= 0) {
      this.reactTimer = preset.reactDelay * this.reactVariance;
      this._reconsider(bot, world);
    }

    // Behavior based on bot's role
    if (bot.isCarrier) {
      const home = bot.teamConfig;
      // Route bias: biased bots take indirect routes (upper/lower) to avoid defenders
      let targetX = home.baseX;
      let targetY = home.baseY;
      if (Math.abs(this.routeBias) > 0.3) {
        // Detour: aim for a point offset vertically from the direct path
        const midX = (bot.x + home.baseX) / 2;
        const offsetY = this.routeBias * 300;
        targetY = home.baseY + offsetY * 0.5;
        // Use bezier-like intermediate point
        if (Math.abs(bot.x - home.baseX) > 400) {
          targetX = midX;
          targetY = home.baseY + offsetY;
        }
      }
      const ang = Utils.angle(bot.x, bot.y, targetX, targetY);
      move = Utils.vecFromAngle(ang, 1);
      const enemy = this._nearestEnemy(bot, world, 140);
      if (enemy) {
        const away = Utils.angle(enemy.x, enemy.y, bot.x, bot.y);
        move = Utils.vecNorm(Utils.vecAdd(move, Utils.vecFromAngle(away, 1.2)));
      }
      aim = Utils.angle(bot.x, bot.y, home.baseX, home.baseY);
      // Throw willingness affects pass frequency
      if (Math.random() < preset.throwChance * this.throwWillingness * dt * 30) {
        const mate = this._teammateAhead(bot, world, home);
        if (mate) {
          aim = Utils.angle(bot.x, bot.y, mate.x, mate.y);
          throwFlag = true;
        }
      }
      sprint = bot.stamina > 30;
    } else if (bot.aiState === 'defend') {
      const invader = this._nearestEnemyNearOwnBase(bot, world);
      if (invader) {
        const ang = Utils.angle(bot.x, bot.y, invader.x, invader.y);
        // Aggressive bots charge directly; cautious bots strafe/approach at angle
        if (this.aggression > 0.5) {
          move = Utils.vecFromAngle(ang, 1);
        } else {
          // Strafe around the invader
          const strafeAng = ang + (Math.PI / 2) * this.strafeDir;
          move = Utils.vecNorm(Utils.vecAdd(
            Utils.vecFromAngle(ang, 0.6),
            Utils.vecFromAngle(strafeAng, 0.5)
          ));
        }
        aim = ang;
      } else {
        // Patrol near base — each bot has a different patrol pattern
        const home = bot.teamConfig;
        const t = performance.now() * 0.001;
        const patrolR = 60 + this.defendBias * 40;
        const patrolSpeed = 0.5 + this.aggression * 0.5;
        const tx = home.baseX + (enemyTeam === 'red' ? 80 : -80) + Math.sin(t * patrolSpeed + bot.id.charCodeAt(0)) * patrolR;
        const ty = home.baseY + Math.cos(t * patrolSpeed * 0.7 + bot.id.charCodeAt(0)) * patrolR;
        const ang = Utils.angle(bot.x, bot.y, tx, ty);
        move = Utils.vecFromAngle(ang, 0.7);
        aim = ang;
      }
    } else {
      // Attack
      if (enemyFlag.state === 'carried' && enemyFlag.carrier && enemyFlag.carrier.team === team) {
        const carrier = enemyFlag.carrier;
        const home = carrier.teamConfig;
        const ang = Utils.angle(carrier.x, carrier.y, home.baseX, home.baseY);
        const leadX = carrier.x + Math.cos(ang) * 80;
        const leadY = carrier.y + Math.sin(ang) * 80;
        const ta = Utils.angle(bot.x, bot.y, leadX, leadY);
        move = Utils.vecFromAngle(ta, 1);
        aim = ta;
      } else if (enemyFlag.state === 'thrown') {
        const ang = Utils.angle(bot.x, bot.y, enemyFlag.x, enemyFlag.y);
        move = Utils.vecFromAngle(ang, 1);
        aim = ang;
        sprint = true;
      } else if (enemyFlag.state === 'dropped') {
        const ang = Utils.angle(bot.x, bot.y, enemyFlag.x, enemyFlag.y);
        move = Utils.vecFromAngle(ang, 1);
        aim = ang;
        sprint = true;
      } else if (enemyFlag.state === 'base') {
        // Route to enemy flag — apply route bias for variety
        let targetX = enemyFlag.x;
        let targetY = enemyFlag.y;
        if (Math.abs(this.routeBias) > 0.3) {
          // Take upper or lower route
          const midX = (bot.x + enemyFlag.x) / 2;
          const offsetY = this.routeBias * 250;
          if (Math.abs(bot.x - enemyFlag.x) > 400) {
            targetX = midX;
            targetY = enemyFlag.y + offsetY;
          }
        }
        const ang = Utils.angle(bot.x, bot.y, targetX, targetY);
        move = Utils.vecFromAngle(ang, 1);
        aim = ang;
        // Aggressive bots chase nearby enemies; passive bots avoid them
        const enemy = this._nearestEnemy(bot, world, 120);
        if (enemy) {
          if (this.aggression > 0.6 && bot.stamina > 30) {
            // Aggressive: veer toward enemy to tag
            const toEnemy = Utils.angle(bot.x, bot.y, enemy.x, enemy.y);
            move = Utils.vecNorm(Utils.vecAdd(move, Utils.vecFromAngle(toEnemy, 0.5)));
          } else {
            // Passive: avoid enemy
            const away = Utils.angle(enemy.x, enemy.y, bot.x, bot.y);
            const avoid = Utils.vecFromAngle(away, 0.8);
            move = Utils.vecNorm(Utils.vecAdd(move, avoid));
          }
        }
        sprint = bot.stamina > 40 && this.aggression > 0.4;
      }
    }

    // Apply wander — adds small random deviations for organic, non-deterministic movement
    if (this.wander > 0.1 && Utils.vecLen(move) > 0.1) {
      const wanderStrength = this.wander * 0.35;
      const wanderVec = Utils.vecFromAngle(this.wanderAngle, wanderStrength);
      move = Utils.vecNorm(Utils.vecAdd(move, wanderVec));
    }

    // Apply error
    if (preset.errAngle > 0) {
      aim += Utils.rand(-preset.errAngle, preset.errAngle);
    }

    // Smooth the move vector to prevent per-frame jitter.
    // Blend new desired move with previous move (strong damping).
    const damp = 0.15;  // low = more damping
    this.smoothMove.x = Utils.lerp(this.smoothMove.x, move.x, damp);
    this.smoothMove.y = Utils.lerp(this.smoothMove.y, move.y, damp);
    let smoothed = Utils.vecNorm({ x: this.smoothMove.x, y: this.smoothMove.y });
    if (Utils.vecLen(this.smoothMove) < 0.05) smoothed = { x: 0, y: 0 };

    // Wall avoidance — try to find a clear path around obstacles
    smoothed = this._avoidWalls(bot, world, smoothed);

    // Speed multiplier — apply per-bot speed variance for variety
    move = Utils.vecScale(smoothed, preset.speedMul * this.speedVariance);

    return { move, aim, sprint, throwFlag, pickup };
  }

  // Steer bot around walls using whisker-based pathfinding.
  // Instead of bouncing, try the desired direction first; if blocked,
  // try turning left and right; pick the clearer option.
  _avoidWalls(bot, world, move) {
    if (!world.walls) return move;
    const moveLen = Utils.vecLen(move);
    if (moveLen < 0.01) return move;

    const moveAngle = Math.atan2(move.y, move.x);
    const lookAhead = bot.radius + 40;

    // Check if the direct path is clear
    if (this._pathClear(bot, world, moveAngle, lookAhead)) {
      return move;
    }

    // Try turning left and right at increasing angles
    const angles = [0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6];
    for (const offset of angles) {
      const testAngle = moveAngle + offset;
      if (this._pathClear(bot, world, testAngle, lookAhead)) {
        return Utils.vecFromAngle(testAngle, moveLen);
      }
    }

    // All directions blocked — keep last move (will be resolved by collision)
    return move;
  }

  // Check if a path is clear of walls ahead of the bot
  _pathClear(bot, world, angle, distance) {
    const probeR = bot.radius * 0.7;
    // Check 3 points along the path: near, mid, far
    for (const dist of [distance * 0.4, distance * 0.7, distance]) {
      const px = bot.x + Math.cos(angle) * dist;
      const py = bot.y + Math.sin(angle) * dist;
      for (const wall of world.walls) {
        if (world.circleRectCollide(px, py, probeR, wall.x, wall.y, wall.w, wall.h)) {
          return false;
        }
      }
    }
    return true;
  }

  _reconsider(bot, world) {
    // Decide role: attack vs defend
    const enemyTeam = bot.team === 'red' ? 'blue' : 'red';
    const ownFlag = world.flags[bot.team];
    const enemyFlag = world.flags[enemyTeam];

    // If own flag is dropped/carried by enemy → defend (try to recover)
    if (ownFlag.state !== 'base') {
      // Use defendBias to determine if this bot goes for recovery or continues attacking
      if (this.defendBias > 0.3 || ownFlag.state === 'carried') {
        bot.aiState = 'defend';
        return;
      }
    }
    // If 2+ teammates already attacking, bots with high defendBias fall back
    const attackers = world.players.filter(p => p.team === bot.team && p.alive && p.aiState === 'attack' && p !== bot).length;
    if (attackers >= 2 && !bot.isCarrier && this.defendBias > Utils.rand(0.1, 0.5)) {
      bot.aiState = 'defend';
    } else if (this.defendBias > 0.7 && Utils.rand(0, 1) < 0.3) {
      // Very defensive bots sometimes just hang back
      bot.aiState = 'defend';
    } else {
      bot.aiState = 'attack';
    }
  }

  _nearestEnemy(bot, world, maxDist=Infinity) {
    let best = null, bestD = maxDist;
    for (const p of world.players) {
      if (p.team === bot.team || !p.alive) continue;
      const d = Utils.dist(bot.x, bot.y, p.x, p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  _nearestEnemyNearOwnBase(bot, world) {
    const home = bot.teamConfig;
    let best = null, bestScore = Infinity;
    for (const p of world.players) {
      if (p.team === bot.team || !p.alive) continue;
      // Enemy must be on our side (or near our base)
      const onOurSide = (bot.team === 'red' && p.x < CONFIG.HALFWAY_X) || (bot.team === 'blue' && p.x > CONFIG.HALFWAY_X);
      if (!onOurSide) continue;
      const d = Utils.dist(bot.x, bot.y, p.x, p.y);
      if (d < bestScore) { bestScore = d; best = p; }
    }
    return best;
  }

  _teammateAhead(bot, world, home) {
    let best = null, bestScore = -Infinity;
    for (const p of world.players) {
      if (p.team !== bot.team || p === bot || !p.alive) continue;
      // Teammate closer to home than bot?
      const dMate = Utils.dist(p.x, p.y, home.baseX, home.baseY);
      const dBot = Utils.dist(bot.x, bot.y, home.baseX, home.baseY);
      if (dMate >= dBot) continue;
      // And not too far from bot
      const dTo = Utils.dist(bot.x, bot.y, p.x, p.y);
      if (dTo > 250) continue;
      const score = (dBot - dMate) - dTo * 0.3;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    return best;
  }
}

window.AIController = AIController;
