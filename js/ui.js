/* ============================================================
   ui.js — UI screen management
   ============================================================ */

class UIManager {
  constructor() {
    this.screens = {
      menu: document.getElementById('screen-menu'),
      game: document.getElementById('screen-game'),
      gameover: document.getElementById('screen-gameover'),
    };
  }

  show(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[name].classList.add('active');
  }

  initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const target = document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`);
        if (target) target.classList.add('active');
        if (window.gameAudio) window.gameAudio.sfx('click');
      };
    });
  }

  // Show a banner overlay on the game screen.
  // durationSec = how long to show the banner (matches fanfare duration)
  showBanner(team, banner, durationSec = 5) {
    const overlay = document.getElementById('banner-overlay');
    overlay.innerHTML = '';
    overlay.classList.remove('show', 'hidden');

    const content = document.createElement('div');
    content.className = 'banner-content';

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 260;
    canvas.style.cssText = 'border-radius: 12px; box-shadow: 0 0 60px rgba(255,210,63,0.4);';
    drawBanner(canvas.getContext('2d'), canvas.width, canvas.height, banner);
    content.appendChild(canvas);

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-family: 'Russo One', sans-serif;
      font-size: 36px;
      letter-spacing: 8px;
      color: ${team === 'red' ? '#ff6b85' : '#6bc4ff'};
      text-shadow: 0 0 25px currentColor, 0 4px 8px rgba(0,0,0,0.5);
      margin-top: 12px;
    `;
    subtitle.textContent = `${CONFIG.TEAMS[team].name} SCORES!`;
    content.appendChild(subtitle);

    overlay.appendChild(content);

    // Set custom animation duration via CSS variable
    const totalMs = Math.max(2000, durationSec * 1000);
    overlay.style.setProperty('--banner-duration', `${totalMs}ms`);

    // Force reflow then add show class
    void overlay.offsetWidth;
    overlay.classList.add('show');

    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 500);
    }, totalMs);
  }

  // HUD message
  showMessage(text, durationMs=2000) {
    const el = document.getElementById('hud-message');
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._msgTimer);
    this._msgTimer = setTimeout(() => { el.style.opacity = '0'; el.textContent = ''; }, durationMs);
  }

  updateScore(red, blue) {
    document.getElementById('score-red').textContent = red;
    document.getElementById('score-blue').textContent = blue;
  }

  updateTimer(seconds) {
    document.getElementById('hud-timer').textContent = Utils.formatTime(seconds);
  }

  showPause(show) {
    const el = document.getElementById('pause-overlay');
    el.classList.toggle('hidden', !show);
  }

  showGameOver(winner, redScore, blueScore) {
    this.show('gameover');
    const title = document.getElementById('gameover-title');
    title.textContent = `${CONFIG.TEAMS[winner].name} WINS`;
    title.className = winner;
    document.getElementById('final-red').textContent = redScore;
    document.getElementById('final-blue').textContent = blueScore;
  }
}

window.UIManager = UIManager;
