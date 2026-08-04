/* ============================================================
   customize.js — Player customization (character, fanfare, banner)
   ============================================================ */

class Customization {
  constructor(audio) {
    this.audio = audio;
    this.profile = this._load() || this._default();
  }

  _default() {
    return {
      color: '#ff3b5c',
      shape: 'circle',
      hat: 'none',
      name: 'Player',
      fanfare: 'charge',
      banner: {
        color: '#ffd23f',
        accent: '#ff3b5c',
        pattern: 'stripes',
        text: 'VICTORY',
        textColor: '#ffffff',
        font: 'russo',
      },
    };
  }

  _load() {
    try {
      const s = localStorage.getItem('ctf_profile');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  save() {
    try { localStorage.setItem('ctf_profile', JSON.stringify(this.profile)); } catch (e) {}
  }

  // Render the customization UI into the customize tab
  render(container) {
    // Color swatches
    const colorContainer = document.getElementById('char-colors');
    colorContainer.innerHTML = '';
    CONFIG.CHAR_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (c === this.profile.color ? ' active' : '');
      sw.style.background = c;
      sw.onclick = () => {
        this.profile.color = c;
        colorContainer.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        this.save();
        this._renderPreview();
      };
      colorContainer.appendChild(sw);
    });

    // Shape buttons
    document.querySelectorAll('.shape-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === this.profile.shape);
      btn.onclick = () => {
        this.profile.shape = btn.dataset.shape;
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.save();
        this._renderPreview();
      };
    });

    // Hat
    const hatSel = document.getElementById('char-hat');
    hatSel.value = this.profile.hat;
    hatSel.onchange = () => {
      this.profile.hat = hatSel.value;
      this.save();
      this._renderPreview();
    };

    // Name
    const nameInput = document.getElementById('char-name');
    nameInput.value = this.profile.name;
    nameInput.oninput = () => {
      this.profile.name = nameInput.value.slice(0, 12);
      this.save();
      this._renderPreview();
    };

    // Fanfare list
    const fanfareList = document.getElementById('fanfare-list');
    fanfareList.innerHTML = '';
    CONFIG.FANFARES.forEach(f => {
      const item = document.createElement('div');
      item.className = 'fanfare-item' + (f.id === this.profile.fanfare ? ' active' : '');
      item.innerHTML = `
        <div class="play-icon">▶</div>
        <div class="fanfare-name">${f.name}</div>
      `;
      item.onclick = () => {
        this.profile.fanfare = f.id;
        fanfareList.querySelectorAll('.fanfare-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.save();
        this.audio.playFanfare(f.id);
      };
      fanfareList.appendChild(item);
    });

    // Fanfare preview button
    document.getElementById('fanfare-preview-btn').onclick = () => {
      this.audio.playFanfare(this.profile.fanfare);
    };

    // Banner colors
    const bannerColors = document.getElementById('banner-colors');
    bannerColors.innerHTML = '';
    CONFIG.BANNER_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (c === this.profile.banner.color ? ' active' : '');
      sw.style.background = c;
      sw.onclick = () => {
        this.profile.banner.color = c;
        bannerColors.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        this.save();
        this._renderBannerPreview();
      };
      bannerColors.appendChild(sw);
    });

    // Banner accent colors
    const accentColors = document.getElementById('banner-accent-colors');
    accentColors.innerHTML = '';
    CONFIG.BANNER_COLORS.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (c === this.profile.banner.accent ? ' active' : '');
      sw.style.background = c;
      sw.onclick = () => {
        this.profile.banner.accent = c;
        accentColors.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        this.save();
        this._renderBannerPreview();
      };
      accentColors.appendChild(sw);
    });

    // Banner text colors
    const textColors = document.getElementById('banner-text-colors');
    textColors.innerHTML = '';
    ['#ffffff', '#000000', '#ffd23f', '#ff3b5c', '#3ba9ff', '#4ade80'].forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch' + (c === this.profile.banner.textColor ? ' active' : '');
      sw.style.background = c;
      sw.onclick = () => {
        this.profile.banner.textColor = c;
        textColors.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        this.save();
        this._renderBannerPreview();
      };
      textColors.appendChild(sw);
    });

    // Banner pattern
    const patSel = document.getElementById('banner-pattern');
    patSel.value = this.profile.banner.pattern;
    patSel.onchange = () => {
      this.profile.banner.pattern = patSel.value;
      this.save();
      this._renderBannerPreview();
    };

    // Banner font
    const fontSel = document.getElementById('banner-font');
    fontSel.value = this.profile.banner.font;
    fontSel.onchange = () => {
      this.profile.banner.font = fontSel.value;
      this.save();
      this._renderBannerPreview();
    };

    // Banner text
    const bannerInput = document.getElementById('banner-text');
    bannerInput.value = this.profile.banner.text;
    bannerInput.oninput = () => {
      this.profile.banner.text = bannerInput.value.slice(0, 14).toUpperCase();
      this.save();
      this._renderBannerPreview();
    };

    this._renderPreview();
    this._renderBannerPreview();
  }

  _renderPreview() {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    const grad = ctx.createRadialGradient(100, 100, 20, 100, 100, 100);
    grad.addColorStop(0, '#1c2540');
    grad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player using same Gimkit-style as Player.draw
    ctx.save();
    ctx.translate(100, 110);
    const r = CONFIG.PLAYER_RADIUS;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.75, r * 0.85, r * 0.35, 0, 0, Math.PI*2);
    ctx.fill();
    // Body with glow
    ctx.shadowColor = this.profile.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.profile.color;
    const shape = this.profile.shape;
    if (shape === 'square') {
      // Rounded square
      const rr = r * 0.25;
      ctx.beginPath();
      ctx.moveTo(-r*0.85+rr, -r*0.85);
      ctx.lineTo(r*0.85-rr, -r*0.85);
      ctx.quadraticCurveTo(r*0.85, -r*0.85, r*0.85, -r*0.85+rr);
      ctx.lineTo(r*0.85, r*0.85-rr);
      ctx.quadraticCurveTo(r*0.85, r*0.85, r*0.85-rr, r*0.85);
      ctx.lineTo(-r*0.85+rr, r*0.85);
      ctx.quadraticCurveTo(-r*0.85, r*0.85, -r*0.85, r*0.85-rr);
      ctx.lineTo(-r*0.85, -r*0.85+rr);
      ctx.quadraticCurveTo(-r*0.85, -r*0.85, -r*0.85+rr, -r*0.85);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r*0.95, r*0.75); ctx.lineTo(-r*0.95, r*0.75); ctx.closePath();
      ctx.fill();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, r, r*0.95, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    // Team-color outline (use own color darkened)
    ctx.strokeStyle = Utils.darken(this.profile.color, 40);
    ctx.lineWidth = 3;
    if (shape === 'square') {
      ctx.beginPath();
      ctx.ellipse(0, 0, r*0.85, r*0.8, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (shape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r*0.95, r*0.75); ctx.lineTo(-r*0.95, r*0.75); ctx.closePath();
      ctx.stroke();
    } else if (shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, r, r*0.95, 0, 0, Math.PI*2); ctx.stroke();
    }
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-r*0.3, -r*0.35, r*0.3, r*0.2, 0, 0, Math.PI*2);
    ctx.fill();
    // Eyes (Gimkit style — big and expressive)
    const eo = r * 0.32, ey = -r * 0.15, eyeR = r * 0.28;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eo, ey, eyeR, 0, Math.PI*2);
    ctx.arc(eo, ey, eyeR, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-eo, ey, eyeR, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eo, ey, eyeR, 0, Math.PI*2);
    ctx.stroke();
    // Pupils
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-eo, ey, eyeR*0.55, 0, Math.PI*2);
    ctx.arc(eo, ey, eyeR*0.55, 0, Math.PI*2);
    ctx.fill();
    // Pupil shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eo - eyeR*0.15, ey - eyeR*0.15, eyeR*0.18, 0, Math.PI*2);
    ctx.arc(eo - eyeR*0.15, ey - eyeR*0.15, eyeR*0.18, 0, Math.PI*2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, r*0.2, r*0.18, 0.3, Math.PI - 0.3);
    ctx.stroke();
    // Cheeks
    ctx.fillStyle = 'rgba(255,107,133,0.3)';
    ctx.beginPath();
    ctx.arc(-r*0.45, r*0.15, r*0.12, 0, Math.PI*2);
    ctx.arc(r*0.45, r*0.15, r*0.12, 0, Math.PI*2);
    ctx.fill();
    // Hat
    this._drawHatPreview(ctx, r);
    ctx.restore();
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Rubik';
    ctx.textAlign = 'center';
    ctx.fillText(this.profile.name || 'Player', 100, 185);
  }

  _drawHatPreview(ctx, r) {
    const hat = this.profile.hat;
    if (hat === 'cap') {
      ctx.fillStyle = Utils.darken(this.profile.color, 40);
      ctx.beginPath();
      ctx.arc(0, -r * 0.6, r * 0.7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-r * 0.7, -r * 0.65, r * 1.4, 4);
    } else if (hat === 'crown') {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.5);
      ctx.lineTo(-r * 0.7, -r * 1.1);
      ctx.lineTo(-r * 0.35, -r * 0.7);
      ctx.lineTo(0, -r * 1.2);
      ctx.lineTo(r * 0.35, -r * 0.7);
      ctx.lineTo(r * 0.7, -r * 1.1);
      ctx.lineTo(r * 0.7, -r * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (hat === 'horns') {
      ctx.fillStyle = '#8b0000';
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.7);
      ctx.lineTo(-r * 1.0, -r * 1.3);
      ctx.lineTo(-r * 0.4, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.7);
      ctx.lineTo(r * 1.0, -r * 1.3);
      ctx.lineTo(r * 0.4, -r * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (hat === 'halo') {
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -r * 1.1, r * 0.7, 0, Math.PI*2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  _renderBannerPreview() {
    const canvas = document.getElementById('banner-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawBanner(ctx, canvas.width, canvas.height, this.profile.banner);
  }
}

// Draw a banner onto a canvas context (used for preview & in-game overlay)
function drawBanner(ctx, w, h, banner) {
  const color = banner.color || '#ffd23f';
  const accent = banner.accent || '#ff3b5c';
  const pattern = banner.pattern || 'stripes';
  const text = banner.text || 'VICTORY';
  const textColor = banner.textColor || '#ffffff';
  const font = banner.font || 'russo';

  // Background
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, w, h);

  // Pattern
  switch (pattern) {
    case 'stripes':
      for (let y = 0; y < h; y += 24) {
        ctx.fillStyle = Utils.rgba(color, 0.85);
        ctx.fillRect(0, y, w, 12);
      }
      // Accent stripe
      ctx.fillStyle = Utils.rgba(accent, 0.9);
      ctx.fillRect(0, h/2 - 3, w, 6);
      break;

    case 'stars': {
      ctx.fillStyle = Utils.rgba(color, 0.3);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (let i = 0; i < 24; i++) {
        const x = (i * 37) % w;
        const y = (i * 53) % h;
        drawStar(ctx, x, y, 5, 7, 3);
      }
      ctx.fillStyle = accent;
      drawStar(ctx, w/2, h/2, 5, 12, 5);
      break;
    }

    case 'chevron': {
      ctx.fillStyle = Utils.rgba(color, 0.3);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (let i = 0; i < 4; i++) {
        const yOff = i * 30;
        ctx.beginPath();
        ctx.moveTo(0, yOff + 30);
        ctx.lineTo(w/2, yOff);
        ctx.lineTo(w, yOff + 30);
        ctx.lineTo(w * 0.75, yOff + 30);
        ctx.lineTo(w/2, yOff + 12);
        ctx.lineTo(w * 0.25, yOff + 30);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'solid':
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      // Border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, w-6, h-6);
      break;

    case 'flames': {
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(0.5, '#ff9d3b');
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = Utils.rgba('#ffd23f', 0.6);
      for (let x = 0; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.4);
        ctx.lineTo(x + 6, h * 0.2 + Math.sin(x) * 8);
        ctx.lineTo(x + 12, h * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'checker': {
      const sq = 20;
      for (let y = 0; y < h; y += sq) {
        for (let x = 0; x < w; x += sq) {
          ctx.fillStyle = ((Math.floor(x/sq) + Math.floor(y/sq)) % 2 === 0) ? color : accent;
          ctx.fillRect(x, y, sq, sq);
        }
      }
      break;
    }

    case 'diamonds': {
      ctx.fillStyle = Utils.rgba(color, 0.2);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      const dw = 25, dh = 18;
      for (let y = -dh; y < h + dh; y += dh * 2) {
        for (let x = -dw; x < w + dw; x += dw * 2) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + dw, y + dh);
          ctx.lineTo(x, y + dh * 2);
          ctx.lineTo(x - dw, y + dh);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Accent diamonds
      ctx.fillStyle = accent;
      for (let y = -dh + dh; y < h + dh; y += dh * 2) {
        for (let x = -dw + dw; x < w + dw; x += dw * 2) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + dw * 0.7, y + dh * 0.7);
          ctx.lineTo(x, y + dh * 1.4);
          ctx.lineTo(x - dw * 0.7, y + dh * 0.7);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }

    case 'waves': {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, accent);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = Utils.rgba('#ffffff', 0.3);
      ctx.lineWidth = 3;
      for (let yOff = 0; yOff < h; yOff += 25) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 5) {
          const y = yOff + Math.sin(x * 0.05 + yOff * 0.1) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'burst': {
      ctx.fillStyle = Utils.rgba(accent, 0.3);
      ctx.fillRect(0, 0, w, h);
      const cx = w/2, cy = h/2;
      ctx.fillStyle = color;
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(Math.max(w, h), -2);
        ctx.lineTo(Math.max(w, h), 2);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // Center circle
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'circuit': {
      ctx.fillStyle = Utils.rgba(color, 0.15);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      // Circuit traces
      const traces = [
        [[0, 20], [60, 20], [60, 50], [120, 50]],
        [[w, 40], [w-80, 40], [w-80, 70], [w-140, 70]],
        [[0, h-30], [80, h-30], [80, h-60], [160, h-60]],
        [[w, h-20], [w-100, h-20], [w-100, h-50]],
        [[w/2, 0], [w/2, 30], [w/2+40, 30]],
      ];
      for (const trace of traces) {
        ctx.beginPath();
        ctx.moveTo(trace[0][0], trace[0][1]);
        for (let i = 1; i < trace.length; i++) {
          ctx.lineTo(trace[i][0], trace[i][1]);
        }
        ctx.stroke();
        // Nodes at endpoints
        ctx.fillStyle = accent;
        for (const pt of trace) {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }

  // Border frame
  ctx.strokeStyle = Utils.rgba('#000000', 0.4);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w-4, h-4);

  // Text
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = textColor;
  let fontStr;
  switch (font) {
    case 'rubik':
      fontStr = `bold ${Math.floor(h * 0.38)}px Rubik, sans-serif`;
      break;
    case 'mono':
      fontStr = `bold ${Math.floor(h * 0.36)}px monospace`;
      break;
    case 'russo':
    default:
      fontStr = `bold ${Math.floor(h * 0.4)}px Russo One, sans-serif`;
      break;
  }
  ctx.font = fontStr;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w/2, h/2);
  ctx.restore();
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR;
    let y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

window.Customization = Customization;
window.drawBanner = drawBanner;
