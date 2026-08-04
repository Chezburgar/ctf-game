/* ============================================================
   multiplayer.js — WebRTC multiplayer via PeerJS + Metered TURN
   ============================================================ */

class MultiplayerManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();   // peerId -> DataConnection
    this.isHost = false;
    this.roomCode = null;
    this.myPeerId = null;
    this.hostPeerId = null;
    this.connected = false;
    this.onError = null;
    this.onStatus = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onNetMessage = null;
  }

  setStatus(msg, kind='info') {
    if (this.onStatus) this.onStatus(msg, kind);
  }

  // Build ICE servers config — fetches dynamic TURN credentials from Metered REST API.
  // Endpoint: https://chezzy.metered.live/api/v1/turn/credentials?apiKey=...
  // Returns an iceServers array directly usable in RTCPeerConnection / PeerJS config.
  async buildIceServers() {
    const base = [{ urls: 'stun:stun.l.google.com:19302' }];
    const apiKey = CONFIG.METERED.apiKey;
    if (!apiKey) {
      console.warn('No Metered API key set — falling back to STUN-only (online may fail across firewalls).');
      return base;
    }
    const url = `https://chezzy.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const iceServers = await res.json();
        // Metered returns either an array directly or { iceServers: [...] }
        const list = Array.isArray(iceServers) ? iceServers : iceServers.iceServers;
        if (Array.isArray(list) && list.length > 0) {
          console.log(`[TURN] Got ${list.length} ICE servers from Metered`);
          return list;
        }
      } else {
        this.setStatus(`Metered auth failed (${res.status})`, 'error');
      }
    } catch (e) {
      console.warn('Metered fetch failed, falling back to STUN-only', e);
    }
    return base;
  }

  // Generate a short, easy-to-type room code.
  // Uses unambiguous characters only (no O/0/1/I/l to avoid confusion).
  // 6 characters from a 29-char alphabet = ~20 billion codes — collision
  // risk is negligible, and if one happens PeerJS errors and we retry.
  static generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async hostGame(playerProfile) {
    this.isHost = true;
    this.setStatus('Creating room…');
    const iceServers = await this.buildIceServers();
    const peerConfig = { config: { iceServers } };
    if (CONFIG.PEERJS.host) {
      peerConfig.host = CONFIG.PEERJS.host;
      peerConfig.port = CONFIG.PEERJS.port;
      peerConfig.path = CONFIG.PEERJS.path;
      peerConfig.secure = CONFIG.PEERJS.secure;
    }
    // Use a short custom room code as the PeerJS peer ID
    this.roomCode = MultiplayerManager.generateRoomCode();
    this.peer = new Peer(this.roomCode, peerConfig);

    // Connection timeout — if PeerJS doesn't connect in 12s, show error
    clearTimeout(this._connectTimeout);
    this._connectTimeout = setTimeout(() => {
      if (!this.connected) {
        this.setStatus('Connection timeout. Check your network and try again.', 'error');
      }
    }, 12000);

    this.peer.on('open', (id) => {
      clearTimeout(this._connectTimeout);
      this.myPeerId = id;
      this.connected = true;
      this.setStatus(`Room created! Share code: ${id}`, 'connected');
      if (this.onPlayerJoin) this.onPlayerJoin({ id, isHost: true, profile: playerProfile });
    });
    this.peer.on('connection', (conn) => this._setupConnection(conn));
    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      clearTimeout(this._connectTimeout);
      // If the ID is already taken (collision), retry with a new code
      if (err.type === 'unavailable-id') {
        this.setStatus('Room code taken, generating new one…');
        this.peer.destroy();
        setTimeout(() => this.hostGame(playerProfile), 500);
        return;
      }
      // Network errors — show user-friendly message
      if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.setStatus('Cannot reach matchmaking server. Check your internet connection.', 'error');
      } else if (err.type === 'browser-incompatible') {
        this.setStatus('Browser not supported for online play.', 'error');
      } else {
        this.setStatus(`Error: ${err.type || err.message}`, 'error');
      }
      if (this.onError) this.onError(err);
    });
  }

  async joinGame(roomCode, playerProfile) {
    this.isHost = false;
    // Normalize the room code: uppercase + strip spaces/dashes
    this.hostPeerId = roomCode.trim().toUpperCase().replace(/[\s-]/g, '');
    this.setStatus('Connecting to host…');
    const iceServers = await this.buildIceServers();
    const peerConfig = { config: { iceServers } };
    if (CONFIG.PEERJS.host) {
      peerConfig.host = CONFIG.PEERJS.host;
      peerConfig.port = CONFIG.PEERJS.port;
      peerConfig.path = CONFIG.PEERJS.path;
      peerConfig.secure = CONFIG.PEERJS.secure;
    }
    this.peer = new Peer(peerConfig);

    // Connection timeout
    clearTimeout(this._connectTimeout);
    this._connectTimeout = setTimeout(() => {
      if (!this.connected) {
        this.setStatus('Connection timeout. Check the room code and try again.', 'error');
      }
    }, 12000);

    this.peer.on('open', (id) => {
      clearTimeout(this._connectTimeout);
      this.myPeerId = id;
      this.setStatus('Joining room…');
      const conn = this.peer.connect(this.hostPeerId, { reliable: false, serialization: 'json' });
      this._setupConnection(conn);
      conn.on('open', () => {
        this.connected = true;
        this.setStatus(`Connected to room ${this.hostPeerId}`, 'connected');
        this._send(conn, { type: 'join', profile: playerProfile, peerId: id });
      });
      // If the connection to host fails (e.g. wrong code / host offline)
      conn.on('error', (err) => {
        console.error('Conn error:', err);
        if (err.type === 'peer-unavailable') {
          this.setStatus(`Room "${this.hostPeerId}" not found. Check the code.`, 'error');
        }
      });
    });
    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      clearTimeout(this._connectTimeout);
      if (err.type === 'peer-unavailable') {
        this.setStatus(`Room "${this.hostPeerId}" not found. Check the code.`, 'error');
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.setStatus('Cannot reach matchmaking server. Check your internet.', 'error');
      } else {
        this.setStatus(`Error: ${err.type || err.message}`, 'error');
      }
      if (this.onError) this.onError(err);
    });
  }

  _setupConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.setStatus(`Peer connected: ${conn.peer.substring(0,8)}`, 'connected');
    });
    conn.on('data', (data) => {
      if (this.onNetMessage) this.onNetMessage(conn.peer, data);
    });
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
      this.setStatus(`Peer left: ${conn.peer.substring(0,8)}`);
    });
    conn.on('error', (err) => {
      console.warn('Conn error:', err);
      this.connections.delete(conn.peer);
    });
  }

  _send(conn, msg) {
    if (conn.open) {
      try { conn.send(msg); } catch (e) { console.warn('send fail', e); }
    }
  }

  broadcast(msg) {
    this.connections.forEach(conn => this._send(conn, msg));
  }

  sendToHost(msg) {
    if (!this.isHost && this.hostPeerId) {
      const conn = this.connections.get(this.hostPeerId);
      if (conn) this._send(conn, msg);
    }
  }

  disconnect() {
    clearTimeout(this._connectTimeout);
    this.connections.forEach(c => c.close());
    this.connections.clear();
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.connected = false;
    this.isHost = false;
    this.roomCode = null;
    this.hostPeerId = null;
  }

  // Save Metered credentials to localStorage (override the hardcoded key).
  // Optional — the hardcoded key in config.js works for everyone by default.
  static saveTurnCreds(apiKey) {
    if (apiKey) CONFIG.METERED.apiKey = apiKey;
    try { localStorage.setItem('ctf_metered_key', apiKey); } catch (e) {}
  }

  static loadTurnCreds() {
    try {
      const s = localStorage.getItem('ctf_metered_key');
      return s || '';
    } catch (e) { return ''; }
  }
}

window.MultiplayerManager = MultiplayerManager;
