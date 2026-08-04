/* ============================================================
   game.js — Main game engine & state machine
   ============================================================ */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = new InputManager(this.canvas);
    this.audio = new AudioManager();
    window.gameAudio = this.audio;
    this.particles = new ParticleSystem();
    this.world = new World();
    this.ui = new UIManager();
    this.customization = new Customization(this.audio);
    this.mp = new MultiplayerManager();

    this.state = 'menu';
    this.lastTime = 0;
    this.scoreLimit = CONFIG.DEFAULT_SCORE_LIMIT;
    this.botDifficulty = 'medium';
    this.teamSize = CONFIG.DEFAULT_TEAM_SIZE;
    this.playerTeam = 'red';

    // Camera (follows local player, shows portion of large map)
    this.camera = { x: 0, y: 0, viewW: CONFIG.VIEW_WIDTH, viewH: CONFIG.VIEW_HEIGHT };

    // AI controllers per bot
    this.aiControllers = new Map();

    // Multiplayer
    this.mpMode = false;
    this.mpPlayers = new Map();
    this.netAccumulator = 0;

    // Match timer
    this.matchTime = 0;
    this.countdown = 3;      // pre-match countdown
    this.scoreDelay = 0;     // freeze period after a goal (while banner shows)

    // Bind UI events
    this._bindUI();
  }

  _bindUI() {
    this.ui.initTabs();

    document.getElementById('btn-start-local').onclick = () => {
      this.audio.init();
      this.audio.sfx('click');
      this.startLocalMatch();
    };

    document.getElementById('btn-resume').onclick = () => {
      this.audio.sfx('click');
      this.state = 'playing';
      this.ui.showPause(false);
    };

    document.getElementById('btn-quit').onclick = () => {
      this.audio.sfx('click');
      this.quitToMenu();
    };

    document.getElementById('btn-play-again').onclick = () => {
      this.audio.sfx('click');
      if (this.mpMode) {
        this.startOnlineMatch();
      } else {
        this.startLocalMatch();
      }
    };

    document.getElementById('btn-menu').onclick = () => {
      this.audio.sfx('click');
      this.quitToMenu();
    };

    // Online
    document.getElementById('btn-host').onclick = async () => {
      this.audio.init();
      this.audio.sfx('click');
      this.audio.preloadFanfares();
      this._setupNetHandlers();  // Wire up status/message handlers BEFORE connecting
      await this.mp.hostGame(this.customization.profile);
      this.mpMode = true;
      this.mp.isHost = true;
      document.getElementById('btn-start-online').disabled = false;
      // Show clear instructions to share the code and wait for players
      this._setConnStatus(`Room created! Share code: ${this.mp.roomCode} — Wait for players to join, then click Start.`, 'connected');
    };

    document.getElementById('btn-join').onclick = async () => {
      this.audio.init();
      this.audio.sfx('click');
      this.audio.preloadFanfares();
      const code = document.getElementById('room-code').value.trim();
      if (!code) {
        this._setConnStatus('Enter a room code', 'error');
        return;
      }
      await this.mp.joinGame(code, this.customization.profile);
      this.mpMode = true;
      this.mp.isHost = false;
      document.getElementById('btn-start-online').disabled = true; // host starts
      this._setupNetHandlers();
    };

    document.getElementById('btn-start-online').onclick = () => {
      this.audio.sfx('click');
      this.startOnlineMatch();
    };

    document.getElementById('btn-save-turn').onclick = () => {
      this.audio.sfx('click');
      const apiKey = document.getElementById('turn-api-key').value.trim();
      if (!apiKey) {
        this._setConnStatus('Enter an API key to override', 'error');
        return;
      }
      MultiplayerManager.saveTurnCreds(apiKey);
      this._setConnStatus('Override key saved. Connect again to use it.', 'connected');
    };

    // Load saved override key (if any) into UI
    const savedKey = MultiplayerManager.loadTurnCreds();
    if (savedKey) document.getElementById('turn-api-key').value = savedKey;
  }

  _setConnStatus(msg, kind='info') {
    const el = document.getElementById('conn-status');
    el.textContent = msg;
    el.className = 'connection-status' + (kind === 'connected' ? ' connected' : kind === 'error' ? ' error' : '');
  }

  // ======== LOCAL MATCH ========
  startLocalMatch() {
    this.mpMode = false;
    this.teamSize = parseInt(document.getElementById('team-size').value);
    this.playerTeam = document.getElementById('player-team').value;
    this.scoreLimit = parseInt(document.getElementById('score-limit').value);
    this.botDifficulty = document.getElementById('bot-difficulty').value;

    this.audio.preloadFanfares();

    this.world.setupMatch(this.teamSize, this.playerTeam, this.customization.profile, this.botDifficulty);

    // Set up AI controllers
    this.aiControllers.clear();
    this.world.players.forEach(p => {
      if (p.isBot) this.aiControllers.set(p.id, new AIController(this.botDifficulty));
    });

    this.matchTime = 0;
    this.countdown = 3;
    this.scoreDelay = 0;
    this.state = 'playing';
    this.ui.show('game');
    this.ui.updateScore(0, 0);
    this.audio.sfx('whistle');
    this._snapCameraToPlayer();  // Center camera on player immediately

    if (!this._running) {
      this._running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this._loop(t));
    }
  }

  // ======== ONLINE MATCH ========
  async startOnlineMatch() {
    if (!this.mp.connected) {
      this._setConnStatus('Not connected', 'error');
      return;
    }
    this.teamSize = parseInt(document.getElementById('team-size').value) || 2;
    this.playerTeam = document.getElementById('player-team').value;
    this.scoreLimit = parseInt(document.getElementById('score-limit').value);
    this.botDifficulty = document.getElementById('bot-difficulty').value;

    this.audio.preloadFanfares();

    if (this.mp.isHost) {
      // Host: setup match with local player + remote peers + bots to fill
      this.world.setupMatch(1, this.playerTeam, this.customization.profile, this.botDifficulty);
      // Add remote players (already joined before start)
      this.mpPlayers.forEach((profile, peerId) => {
        const team = this._assignTeam();
        this.world.addRemotePlayer(peerId, team, profile);
      });
      // Fill remaining slots with bots
      const total = this.teamSize * 2;
      const need = Math.max(0, total - this.world.players.length);
      for (let i = 0; i < need; i++) {
        const team = this._assignTeam();
        const profile = this.world._randomBotProfile(team, i);
        const bot = new Player(`bot_fill_${i}`, team, {
          ...profile, isBot: true, inputSource: 'ai',
        });
        bot.x = CONFIG.TEAMS[team].baseX + Utils.rand(-50, 50);
        bot.y = CONFIG.TEAMS[team].baseY + Utils.rand(-50, 50);
        this.world.players.push(bot);
        this.aiControllers.set(bot.id, new AIController(this.botDifficulty));
      }

      this._setupNetHandlers();
      // Tell all clients the match started + send initial state
      this.mp.broadcast({ type: 'match_start', scoreLimit: this.scoreLimit, teamSize: this.teamSize });
    } else {
      // Client: just show game screen, wait for state
      this._setupNetHandlers();
      this.mp.sendToHost({ type: 'ready' });
    }

    // Set up AI controllers for any bots
    this.world.players.forEach(p => {
      if (p.isBot && !this.aiControllers.has(p.id)) {
        this.aiControllers.set(p.id, new AIController(this.botDifficulty));
      }
    });

    this.matchTime = 0;
    this.countdown = 3;
    this.scoreDelay = 0;
    this.state = 'playing';
    this.ui.show('game');
    this.ui.updateScore(0, 0);
    this.audio.sfx('whistle');
    this._snapCameraToPlayer();  // Center camera on player immediately

    if (!this._running) {
      this._running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this._loop(t));
    }
  }

  _assignTeam() {
    // Balance teams: return team with fewer players
    const red = this.world.players.filter(p => p.team === 'red').length;
    const blue = this.world.players.filter(p => p.team === 'blue').length;
    if (red < blue) return 'red';
    if (blue < red) return 'blue';
    return Math.random() < 0.5 ? 'red' : 'blue';
  }

  _setupNetHandlers() {
    this.mp.onStatus = (msg, kind) => this._setConnStatus(msg, kind);
    this.mp.onPlayerJoin = ({ peerId, profile }) => {
      this.mpPlayers.set(peerId, profile);
      const count = this.mpPlayers.size + 1;  // +1 for host
      if (this.mp.isHost) {
        this._setConnStatus(`${count} player${count > 1 ? 's' : ''} in room. Code: ${this.mp.roomCode} — Click Start when ready.`, 'connected');
      } else {
        this._setConnStatus(`Joined room! ${count} player${count > 1 ? 's' : ''} online. Waiting for host to start…`, 'connected');
      }
    };
    this.mp.onPlayerLeave = (peerId) => {
      this.mpPlayers.delete(peerId);
      this.world.removePlayer(peerId);
      const count = this.mpPlayers.size + 1;
      if (this.mp.isHost) {
        this._setConnStatus(`Player left. ${count} player${count > 1 ? 's' : ''} in room. Code: ${this.mp.roomCode}`, 'connected');
      }
    };
    this.mp.onNetMessage = (peerId, msg) => this._handleNetMessage(peerId, msg);
  }

  _handleNetMessage(peerId, msg) {
    if (this.mp.isHost) {
      // Host receives input from clients
      if (msg.type === 'join') {
        this.mpPlayers.set(peerId, msg.profile);
        // Send welcome + current match state if match in progress
        this.mp.broadcast({ type: 'roster', players: this.world.players.map(p => p.serialize()), scores: this.world.scores });
      } else if (msg.type === 'input') {
        const p = this.world.getPlayer(peerId);
        if (p && p.alive) {
          p.applyMove(msg.move, msg.aim, msg.sprint, 1/30, this.world);
          if (msg.throwFlag && p.isCarrier) {
            this._throwFlag(p);
          }
        }
      }
    } else {
      // Client receives state from host
      if (msg.type === 'match_start') {
        this.scoreLimit = msg.scoreLimit;
        this.teamSize = msg.teamSize;
      } else if (msg.type === 'state') {
        this._applyNetState(msg);
      } else if (msg.type === 'score') {
        this._onScore(msg.team, msg.scorer, msg.banner);
      } else if (msg.type === 'tag') {
        this.audio.sfx('tag');
      } else if (msg.type === 'match_over') {
        this.world.matchOver = true;
        this.world.winner = msg.winner;
        this.ui.showGameOver(msg.winner, msg.scores.red, msg.scores.blue);
        this.state = 'gameover';
      } else if (msg.type === 'roster') {
        // Initialize remote players
        msg.players.forEach(s => {
          if (s.id === this.mp.myPeerId) return;
          if (!this.world.getPlayer(s.id)) {
            this.world.addRemotePlayer(s.id, s.team, s);
          }
        });
      }
    }
  }

  _applyNetState(state) {
    state.players.forEach(s => {
      if (s.id === this.mp.myPeerId) {
        // Local player — just reconcile (light touch)
        const p = this.world.getPlayer(s.id);
        if (p) {
          // Trust host for alive/respawn states, keep our own position
          p.alive = s.alive;
          p.respawnTimer = s.respawnTimer;
          p.tagCooldown = s.tagCooldown;
        }
        return;
      }
      let p = this.world.getPlayer(s.id);
      if (!p) {
        p = this.world.addRemotePlayer(s.id, s.team, s);
      }
      p.applyNetState(s);
      p.carriedFlag = s.isCarrier ? this.world.flags[p.team === 'red' ? 'blue' : 'red'] : null;
    });
    this.world.scores = state.scores;
    this.ui.updateScore(state.scores.red, state.scores.blue);
    if (state.flags) {
      for (const team of ['red', 'blue']) {
        const f = this.world.flags[team];
        const fs = state.flags[team];
        if (fs.state === 'base') {
          if (f.state !== 'base') f.returnHome();
        } else if (fs.state === 'carried' && f.state !== 'carried') {
          const carrier = this.world.getPlayer(fs.carrierId);
          if (carrier) {
            carrier.carriedFlag = f;
            f.pickup(carrier);
          }
        } else if (fs.state === 'dropped' && f.state !== 'dropped') {
          f.drop(fs.x, fs.y);
        } else if (fs.state === 'thrown' && f.state !== 'thrown') {
          f.throw(fs.x, fs.y, fs.angle);
        }
      }
    }
  }

  quitToMenu() {
    this.state = 'menu';
    this._running = false;
    this.mp.disconnect();
    this.mpMode = false;
    this.mpPlayers.clear();
    this.aiControllers.clear();
    this.particles.clear();
    this.audio.stopFanfare();
    this.ui.show('menu');
    document.getElementById('btn-start-online').disabled = true;
    this._setConnStatus('Disconnected');
  }

  // ======== MAIN LOOP ========
  _loop(now) {
    if (!this._running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.state === 'playing') {
      this._update(dt);
    }
    this._draw();
    this.input.endFrame();
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    // Pause toggle
    if (this.input.wasPressed('escape')) {
      this.state = 'paused';
      this.ui.showPause(true);
      return;
    }

    // Score delay — freeze gameplay while banner celebration is showing.
    // The restart countdown begins after the banner finishes.
    if (this.scoreDelay > 0) {
      this.scoreDelay -= dt;
      this.particles.update(dt);
      // Still update world (flags, players) minimally so visuals stay fresh,
      // but don't process input or AI movement.
      this.world.update(dt);
      // When delay expires, start the 3-2-1 countdown
      if (this.scoreDelay <= 0) {
        this.scoreDelay = 0;
        this.countdown = 3;
      }
      return;
    }

    // Countdown
    if (this.countdown > 0) {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const curr = Math.ceil(this.countdown);
      if (curr !== prev && curr > 0) this.audio.sfx('countdown');
      if (this.countdown <= 0) {
        this.audio.sfx('go');
        this.ui.showMessage('GO!', 800);
      }
      // Still update particles for visual effect
      this.particles.update(dt);
      return;
    }

    this.matchTime += dt;

    // Local player input
    const local = this.world.getLocalPlayer();
    if (local && local.alive) {
      const move = this.input.moveVector();
      const aim = Utils.angle(local.x, local.y, this.input.mouse.x + this.camera.x, this.input.mouse.y + this.camera.y);
      const sprint = this.input.isDown('shift');
      if (this.countdown <= 0) {
        local.applyMove(move, aim, sprint, dt, this.world);
        // Throw flag
        if ((this.input.wasPressed(' ') || this.input.mouse.clicked) && local.isCarrier) {
          this._throwFlag(local);
        }
        // Pickup enemy flag (auto when overlapping)
        if (this.world.canPickupEnemyFlag(local)) {
          this._pickupFlag(local);
        }
        // Return own flag
        if (this.world.canReturnOwnFlag(local)) {
          this._returnOwnFlag(local);
        }
        // Catch thrown flag
        const thrown = this.world.canCatchThrownFlag(local);
        if (thrown) {
          this._catchFlag(local, thrown);
        }
      }
    }

    // Bot AI
    this.aiControllers.forEach((ai, botId) => {
      const bot = this.world.getPlayer(botId);
      if (!bot || !bot.alive) return;
      const decision = ai.compute(bot, this.world, dt);
      if (this.countdown <= 0) {
        bot.applyMove(decision.move, decision.aim, decision.sprint, dt, this.world);
        if (decision.throwFlag && bot.isCarrier) this._throwFlag(bot);
        if (this.world.canPickupEnemyFlag(bot)) this._pickupFlag(bot);
        if (this.world.canReturnOwnFlag(bot)) this._returnOwnFlag(bot);
        const thrown = this.world.canCatchThrownFlag(bot);
        if (thrown) this._catchFlag(bot, thrown);
      }
    });

    // Tagging checks
    this._checkTags();

    // Score check (host only in MP mode)
    if (!this.mpMode || this.mp.isHost) {
      const scorer = this.world.players.find(p => p.hasScored());
      if (scorer) this._score(scorer);
    }

    // Update world
    this.world.update(dt);
    this.particles.update(dt);

    // Particles: trail for carrier
    if (local && local.isCarrier) {
      this.particles.trail(local.x, local.y, local.teamConfig.glow);
    }

    // Network broadcast (host) or input send (client)
    if (this.mpMode && this.mp.connected) {
      this.netAccumulator += dt;
      if (this.mp.isHost && this.netAccumulator >= 1/CONFIG.NET_TICK_RATE) {
        this.netAccumulator = 0;
        this._broadcastState();
      } else if (!this.mp.isHost && this.netAccumulator >= 1/CONFIG.NET_INPUT_RATE && local) {
        this.netAccumulator = 0;
        this.mp.sendToHost({
          type: 'input',
          move: this.input.moveVector(),
          aim: Utils.angle(local.x, local.y, this.input.mouse.x + this.camera.x, this.input.mouse.y + this.camera.y),
          sprint: this.input.isDown('shift'),
          throwFlag: this.input.wasPressed(' ') || this.input.mouse.clicked,
        });
      }
    }

    // HUD
    this.ui.updateTimer(this.matchTime);

    // Match over?
    if (this.world.matchOver) {
      this.state = 'gameover';
      this.ui.showGameOver(this.world.winner, this.world.scores.red, this.world.scores.blue);
      // Don't play fanfare here — it already played when the final goal was scored.
      this.audio.stopFanfare();
    }
  }

  _checkTags() {
    for (const tagger of this.world.players) {
      if (!tagger.alive || tagger.tagCooldown > 0) continue;
      for (const victim of this.world.players) {
        if (tagger.team === victim.team) continue;
        if (!victim.alive) continue;
        if (this.world.canTag(tagger, victim)) {
          // Tag!
          const tagged = victim.tagged(this.world);
          if (tagged) {
            tagger.tagFlash = 0.4;
            tagger.tagCooldown = CONFIG.PLAYER_TAG_COOLDOWN;
            this.audio.sfx('tag');
            this.particles.burst(victim.x, victim.y, victim.teamConfig.glow, 18);
            this.particles.burst(victim.x, victim.y, '#ffffff', 8);
            this.ui.showMessage(`${tagger.name} tagged ${victim.name}!`, 1500);
            if (this.mpMode && this.mp.isHost) {
              this.mp.broadcast({ type: 'tag', x: victim.x, y: victim.y });
            }
          }
        }
      }
    }
  }

  _pickupFlag(player) {
    const enemyTeam = player.team === 'red' ? 'blue' : 'red';
    const flag = this.world.flags[enemyTeam];
    if (player.pickupFlag(flag)) {
      this.audio.sfx('pickup');
      this.particles.burst(player.x, player.y, flag.teamConfig.glow, 16);
      this.ui.showMessage(`${player.name} stole the flag!`, 1500);
    }
  }

  _throwFlag(player) {
    const flag = player.throwFlag();
    if (flag) {
      this.audio.sfx('throw');
      this.particles.spawn(flag.x, flag.y, 8, { color: flag.teamConfig.glow, speed: 80, life: 0.4, size: 3, glow: true });
    }
  }

  _catchFlag(player, flag) {
    // Use thrower's team to determine pass vs interception.
    // A pass = catcher is on the same team as the thrower.
    // An interception = catcher is on the enemy team of the thrower.
    // If throwerTeam is null (edge case), fall back to flag.team comparison.
    const throwingTeam = flag.throwerTeam || flag.team;
    if (player.team === throwingTeam) {
      // Teammate catches = pass
      if (!player.carriedFlag && player.alive) {
        player.pickupFlag(flag);
        this.audio.sfx('catch');
        this.particles.burst(player.x, player.y, flag.teamConfig.glow, 12);
        this.ui.showMessage(`${player.name} caught the pass!`, 1200);
      }
    } else {
      // Enemy intercepts — flag goes back to its home base
      flag.returnHome();
      this.audio.sfx('catch');
      this.particles.burst(flag.x, flag.y, '#ffd23f', 24);
      this.ui.showMessage(`${player.name} intercepted!`, 1500);
    }
  }

  _returnOwnFlag(player) {
    const flag = this.world.flags[player.team];
    flag.returnHome();
    this.audio.sfx('pickup');
    this.particles.burst(flag.x, flag.y, flag.teamConfig.glow, 14);
    this.ui.showMessage(`${player.name} returned the flag!`, 1500);
  }

  _score(scorer) {
    const team = scorer.team;
    const enemyTeam = team === 'red' ? 'blue' : 'red';
    const flag = this.world.flags[enemyTeam];
    const banner = scorer.banner || this.customization.profile.banner;
    const fanfare = scorer.fanfare || this.customization.profile.fanfare;

    // Return flag to enemy base
    flag.returnHome();
    scorer.carriedFlag = null;
    this.world.scores[team]++;

    this.audio.playFanfare(fanfare);
    const fanfareDuration = this.audio.getFanfareDuration(fanfare);
    this.ui.showBanner(team, banner, fanfareDuration);
    this.particles.confetti(scorer.x, scorer.y, [
      CONFIG.TEAMS[team].color, CONFIG.TEAMS[team].glow, '#ffd23f', '#ffffff'
    ]);

    if (this.mpMode && this.mp.isHost) {
      this.mp.broadcast({ type: 'score', team, scorer: scorer.id, banner });
    }

    this.ui.updateScore(this.world.scores.red, this.world.scores.blue);

    // Reset positions briefly — distribute around base in a circle to avoid overlap
    const perTeam = {};
    this.world.players.forEach(p => {
      perTeam[p.team] = (perTeam[p.team] || 0) + 1;
    });
    const teamIdx = { red: 0, blue: 0 };
    this.world.players.forEach(p => {
      if (p.alive) {
        const i = teamIdx[p.team]++;
        const total = perTeam[p.team];
        const angle = (i / total) * Math.PI * 2 + (p.team === 'red' ? 0 : Math.PI);
        const r = Math.min(CONFIG.BASE_RADIUS * 0.6, 25 + total * 8);
        p.x = p.teamConfig.baseX + Math.cos(angle) * r;
        p.y = p.teamConfig.baseY + Math.sin(angle) * r;
        p.stamina = CONFIG.STAMINA_MAX;
      }
    });

    // Check win
    if (this.world.scores[team] >= this.scoreLimit) {
      this.world.matchOver = true;
      this.world.winner = team;
      if (this.mpMode && this.mp.isHost) {
        this.mp.broadcast({ type: 'match_over', winner: team, scores: this.world.scores });
      }
    } else {
      this.ui.showMessage(`${CONFIG.TEAMS[team].name} SCORES!`, 2000);
      // Freeze gameplay during the banner celebration, then start the
      // restart countdown. scoreDelay is in seconds.
      this.scoreDelay = fanfareDuration + 0.3;
      // Clear the timer-based approach (kept for safety/cleanup)
      clearTimeout(this._scoreDelayTimer);
    }
  }

  _broadcastState() {
    const state = {
      type: 'state',
      players: this.world.players.map(p => p.serialize()),
      scores: this.world.scores,
      flags: {
        red:  this._serializeFlag(this.world.flags.red),
        blue: this._serializeFlag(this.world.flags.blue),
      },
      matchTime: this.matchTime,
    };
    this.mp.broadcast(state);
  }

  _serializeFlag(flag) {
    return {
      state: flag.state,
      x: flag.x, y: flag.y,
      angle: flag.angle,
      carrierId: flag.carrier ? flag.carrier.id : null,
    };
  }

  // ======== CAMERA ========
  _updateCamera() {
    const local = this.world.getLocalPlayer();
    if (!local) return;
    // Target = player centered in viewport
    const targetX = local.x - this.camera.viewW / 2;
    const targetY = local.y - this.camera.viewH / 2;
    // Clamp target to world bounds BEFORE lerping (so we never chase an unreachable target)
    const clampedTargetX = Utils.clamp(targetX, 0, CONFIG.WIDTH - this.camera.viewW);
    const clampedTargetY = Utils.clamp(targetY, 0, CONFIG.HEIGHT - this.camera.viewH);
    // Fast lerp (0.18) for responsiveness
    this.camera.x = Utils.lerp(this.camera.x, clampedTargetX, 0.18);
    this.camera.y = Utils.lerp(this.camera.y, clampedTargetY, 0.18);
  }

  // Snap camera instantly to player (called on match start / respawn)
  _snapCameraToPlayer() {
    const local = this.world.getLocalPlayer();
    if (!local) return;
    const targetX = local.x - this.camera.viewW / 2;
    const targetY = local.y - this.camera.viewH / 2;
    this.camera.x = Utils.clamp(targetX, 0, CONFIG.WIDTH - this.camera.viewW);
    this.camera.y = Utils.clamp(targetY, 0, CONFIG.HEIGHT - this.camera.viewH);
  }

  // ======== DRAW ========
  _draw() {
    const ctx = this.ctx;
    // Clear
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.state === 'menu') return;

    this._updateCamera();

    // Save context and translate by camera offset (world space rendering)
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // Draw world (field, decorations, walls, safe zones, flags, players)
    this.world.draw(ctx, this.camera);

    // Draw particles on top (in world space)
    this.particles.draw(ctx);

    // Draw local player indicators (tag range, aim line) — in world space
    const local = this.world.getLocalPlayer();
    if (local && local.alive && this.state === 'playing') {
      // Tag range indicator
      ctx.strokeStyle = Utils.rgba(local.teamConfig.glow, 0.15);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(local.x, local.y, CONFIG.PLAYER_TAG_RANGE + local.radius, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Aim line when carrying flag
      if (local.isCarrier) {
        const endX = local.x + Math.cos(local.aim) * 250;
        const endY = local.y + Math.sin(local.aim) * 250;
        const grad = ctx.createLinearGradient(local.x, local.y, endX, endY);
        grad.addColorStop(0, Utils.rgba('#ffd23f', 0.8));
        grad.addColorStop(1, Utils.rgba('#ffd23f', 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(local.x, local.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
    // === Back to screen space ===

    // Vignette (darken edges for focus)
    const vGrad = ctx.createRadialGradient(
      this.canvas.width/2, this.canvas.height/2, this.canvas.height * 0.3,
      this.canvas.width/2, this.canvas.height/2, this.canvas.height * 0.75
    );
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Minimap (top-right corner)
    if (this.state === 'playing' || this.state === 'paused') {
      this.world.drawMinimap(ctx, this.canvas.width, this.canvas.height, this.camera);
    }

    // Countdown overlay (screen space)
    if (this.countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 120px Russo One';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 30;
      const n = Math.ceil(this.countdown);
      ctx.fillText(n > 0 ? n.toString() : 'GO!', this.canvas.width/2, this.canvas.height/2);
      ctx.shadowBlur = 0;
    }
  }
}

window.Game = Game;
