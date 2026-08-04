# Capture the Flag — 2D Arena

A high-quality 2D recreation of Gimkit-style Capture the Flag. Built with vanilla HTML5 Canvas + JavaScript — no build step, no framework. Deployable to GitHub Pages as-is.

## Features

- **Two-team CTF** — Red (left) vs Blue (right), each with their own base and safe zone.
- **Halfway line** — Players on the opponent's side are vulnerable to being tagged.
- **Safe zones** — A circular zone around each base. Your own safe zone makes you immune to tags; enemies are still taggable inside it (so defenders can protect their flag).
- **Tagging & respawn** — Tagged players respawn at their base after a 3-second delay.
- **Slower flag carrier** — Holding the enemy flag reduces your speed; pass it to a teammate to move faster.
- **Aim & throw the flag** — Aim with the mouse, click (or press Space) to throw. Teammates catch it as a pass; enemies intercept it (their flag returns to base).
- **Auto flag return** — If the enemy touches their own dropped/thrown flag, it snaps back to their base.
- **Scoring fanfare & banner** — When a team scores, their fanfare plays and their customized banner displays for everyone.
- **Customization tab** — Edit your character's color, shape, size, hat, name, speed/health tradeoff, plus your team fanfare (9 included tracks) and victory banner (color, pattern, text).
- **AI bots** — Three difficulty levels (Easy / Medium / Hard) with attack/defend/support behaviors, flag-passing, and interception.
- **Online multiplayer** — Peer-to-peer via WebRTC (PeerJS for signaling + Metered TURN for NAT traversal). Host creates a room, others join with the room code.
- **Particle effects** — Tag bursts, flag trails, scoring confetti.
- **Pre-match countdown** — 3-2-1-GO whistle start.

## Controls

| Action | Keys |
|--------|------|
| Move | `W` `A` `S` `D` or arrow keys |
| Aim | Mouse |
| Throw flag | Left click or `Space` |
| Sprint | `Shift` (drains stamina, disabled while carrying) |
| Pause / Menu | `Esc` |

## How to Play Locally

The game runs entirely in the browser. To test before deploying:

```bash
# From the project root (where index.html lives)
python3 -m http.server 8080
# Then open http://localhost:8080
```

You can also use any static file server (`npx serve`, VS Code Live Server, etc.). Opening `index.html` directly via `file://` won't work because the browser blocks audio autoplay and module loading without a server.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Copy all files in this folder to the repo root (commit the `assets/fanfares/` directory — those MP3s are required).
3. Push to `main` (or `master`).
4. In GitHub: **Settings → Pages → Source: GitHub Actions**.
5. The included workflow (`.github/workflows/deploy.yml`) will automatically build & deploy on every push.
6. Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

> **Repository structure note:** If your repo root isn't the game root, edit `path: .` in `.github/workflows/deploy.yml` to point at the subfolder (e.g. `path: ./ctf-game`).

## Online Multiplayer Setup (Metered TURN)

The game uses [PeerJS](https://peerjs.com) for WebRTC signaling (free public PeerJS cloud by default) and a [Metered](https://www.metered.ca/) TURN server for NAT traversal across firewalls.

### ✅ Pre-configured — no setup required

The Metered API key is hardcoded in `js/config.js`. On every connection, the game fetches fresh dynamic TURN credentials from:

```
https://chezzy.metered.live/api/v1/turn/credentials?apiKey=6e25060164ad49aa8e565944fc453654e8bf
```

This endpoint returns a fresh `iceServers` array that gets plugged directly into `RTCPeerConnection` (and into PeerJS's `config.iceServers`). Credentials rotate automatically, so players never need to enter anything.

### To play online

1. One player clicks **Host Game** — they get a Room Code (their PeerJS ID).
2. Other players paste the Room Code into the **Room Code** field and click **Join Game**.
3. Host clicks **Start Online Match**.

The host runs the authoritative game simulation; clients send input and receive state at 20 Hz. The host's local profile, fanfare, and banner are used for everyone when the host scores; clients' banners are broadcast on their own scores.

### Optional: Use your own Metered account

If you want to swap in your own Metered app (e.g., to use a different plan's quota):

1. Sign up at [metered.ca](https://dashboard.metered.ca/signup).
2. In the dashboard, find your **API Key** under App Settings.
3. In the game's **Online** tab, paste your API key into the override field and click **Save Override**. The override persists in `localStorage` and takes precedence over the hardcoded key.

### Self-hosting PeerJS signaling (optional, for production)

The public PeerJS cloud is fine for small games. For higher reliability, self-host:

```bash
docker run -p 9000:9000 -d peerjs/peerjs-server
```

Then edit `js/config.js`:

```js
PEERJS: {
  host: 'your-server.com',
  port: 9000,
  path: '/myapp',
  secure: false,  // true if behind HTTPS
}
```

## Customization

Open the **Customize** tab on the main menu:

- **Character**: color (12 swatches), body shape (circle/square/triangle/diamond), size, speed bonus (higher = faster but lower effective health), hat (none/cap/crown/horns/halo), name.
- **Fanfare**: pick from 9 included tracks. Click an item to preview.
- **Banner**: color, pattern (stripes/stars/chevron/solid/flames), text.

Settings save automatically to `localStorage` and persist across sessions.

## Fanfares

The 9 included fanfares (in `assets/fanfares/`):

| File | Source |
|------|--------|
| 8bit.mp3 | Echo Fanfare — 8bit |
| charge.mp3 | Echo Fanfare — Charge |
| crossed_wires.mp3 | Echo Fanfare — Crossed Wires |
| flamenco.mp3 | Echo Fanfare — Flamenco |
| knockout.mp3 | Echo Fanfare — Knockout (ft. Matt Pettineo Guitar) |
| phantom.mp3 | Echo Fanfare — The Phantom |
| swing.mp3 | Echo Fanfare — Swing |
| teatime.mp3 | Echo Fanfare — Teatime |
| tuff.mp3 | Tuff |

## File Structure

```
ctf-game/
├── index.html              # Main page
├── css/
│   └── style.css           # All styling
├── js/
│   ├── config.js           # Game constants, TURN config
│   ├── utils.js            # Math/helpers
│   ├── audio.js            # AudioManager (fanfares + SFX)
│   ├── input.js            # Keyboard + mouse input
│   ├── particles.js        # Particle effects
│   ├── flag.js             # Flag entity
│   ├── player.js           # Player entity
│   ├── ai.js               # Bot AI controller
│   ├── world.js            # Game world (field, bases, safe zones)
│   ├── customize.js        # Customization UI + banner rendering
│   ├── multiplayer.js      # PeerJS + Metered TURN integration
│   ├── ui.js               # Screen manager
│   ├── game.js             # Main game engine & state machine
│   └── main.js             # Entry point
├── assets/
│   └── fanfares/           # 9 MP3 fanfares
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages auto-deploy
└── README.md
```

## Browser Support

- Chrome / Edge / Firefox / Safari (latest 2 versions)
- WebGL not required — pure Canvas 2D
- WebRTC required for online play (all modern browsers)

## Tech Notes

- **No build step.** Plain ES5-ish JS loaded via `<script>` tags. Works on any static host.
- **Authoritative host model.** In online mode, the host simulates physics & game logic, broadcasts state at 20 Hz. Clients send input at 30 Hz. This keeps everyone in sync without complex prediction/rollback.
- **TURN fallback.** If the Metered REST credential fetch fails (e.g., CORS), the code falls back to static-auth TURN URLs. Either works depending on your Metered app config.

## License

Game code: MIT (do whatever you want).
Fanfare audio: belongs to their respective original creators — provided here for personal use only.
