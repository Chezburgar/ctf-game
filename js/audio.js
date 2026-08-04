/* ============================================================
   audio.js — Audio manager (fanfares, SFX)
   ============================================================ */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.fanfareCache = new Map();   // id -> HTMLAudioElement
    this.fanfareDurations = new Map(); // id -> duration in seconds
    this.muted = false;
    this.masterVolume = 0.7;
  }

  // Lazy-init AudioContext (must be after user gesture)
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (e) { console.warn('AudioContext unavailable', e); }
  }

  // Preload all fanfares and capture their durations
  preloadFanfares() {
    CONFIG.FANFARES.forEach(f => {
      const audio = new Audio(f.file);
      audio.preload = 'auto';
      audio.volume = this.masterVolume;
      this.fanfareCache.set(f.id, audio);
      // Capture duration once metadata is loaded
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
          this.fanfareDurations.set(f.id, audio.duration);
        }
      });
      // Also try immediately in case already cached
      if (audio.duration && isFinite(audio.duration)) {
        this.fanfareDurations.set(f.id, audio.duration);
      }
    });
  }

  // Get fanfare duration in seconds (defaults to 5 if not yet loaded)
  getFanfareDuration(id) {
    return this.fanfareDurations.get(id) || 5;
  }

  // Play a fanfare by id. Returns a Promise.
  playFanfare(id) {
    if (this.muted) return Promise.resolve();
    const audio = this.fanfareCache.get(id);
    if (!audio) {
      console.warn('Fanfare not found:', id);
      return Promise.resolve();
    }
    audio.currentTime = 0;
    audio.volume = this.masterVolume;
    return audio.play().catch(e => console.warn('Fanfare play blocked:', e));
  }

  stopFanfare() {
    this.fanfareCache.forEach(a => { a.pause(); a.currentTime = 0; });
  }

  // Simple synthesized SFX using WebAudio
  sfx(type) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'tag':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
        break;
      case 'pickup':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now); osc.stop(now + 0.15);
        break;
      case 'throw':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.2);
        break;
      case 'catch':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.linearRampToValueAtTime(990, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.12);
        break;
      case 'whistle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(1600, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.32);
        break;
      case 'click':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now); osc.stop(now + 0.06);
        break;
      case 'countdown':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now); osc.stop(now + 0.2);
        break;
      case 'go':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.42);
        break;
    }
  }

  setMuted(m) { this.muted = m; }
}

window.AudioManager = AudioManager;
