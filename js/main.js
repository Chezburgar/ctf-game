/* ============================================================
   main.js — Entry point. Wires everything together.
   ============================================================ */

(function() {
  // Wait for DOM
  function start() {
    const game = new Game();
    window.game = game;

    // Render customization on first load
    game.customization.render();

    // Show menu screen
    game.ui.show('menu');

    // Preload fanfares lazily on first user interaction (browser autoplay policy)
    const preloadOnce = () => {
      game.audio.init();
      game.audio.preloadFanfares();
      window.removeEventListener('click', preloadOnce);
      window.removeEventListener('keydown', preloadOnce);
    };
    window.addEventListener('click', preloadOnce);
    window.addEventListener('keydown', preloadOnce);

    // Handle window resize — canvas keeps logical size, CSS scales it
    function resize() {
      const canvas = document.getElementById('game-canvas');
      // CSS already handles scaling via width/height 100% + object-fit: contain
    }
    window.addEventListener('resize', resize);
    resize();

    // Prevent context menu globally on canvas
    document.getElementById('game-canvas').addEventListener('contextmenu', e => e.preventDefault());

    console.log('%cCapture the Flag — 2D Arena', 'color:#ffd23f;font-size:18px;font-weight:bold;');
    console.log('%cReady to play! Visit the Customize tab to personalize your character, fanfare, and banner.', 'color:#3ba9ff;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
