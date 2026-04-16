/**
 * エントリーポイント / Entry Point
 * ゲーム初期化
 */

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  // サウンドトグルボタン / Sound toggle button
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      game.sound.toggle();
      soundBtn.textContent = game.sound.enabled ? '🔊 Sound ON' : '🔇 Sound OFF';
    });
  }

  // モバイルボタン / Mobile buttons
  const simulateKey = (key, type) => {
    document.dispatchEvent(new KeyboardEvent(type, { key }));
  };

  const bindMobileButton = (id, key) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    let interval = null;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      simulateKey(key, 'keydown');
      // ホールドで連続入力
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowDown') {
        interval = setInterval(() => simulateKey(key, 'keydown'), 100);
      }
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      simulateKey(key, 'keyup');
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }, { passive: false });

    // マウスフォールバック
    btn.addEventListener('mousedown', () => simulateKey(key, 'keydown'));
    btn.addEventListener('mouseup', () => {
      simulateKey(key, 'keyup');
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    });
  };

  bindMobileButton('btnLeft', 'ArrowLeft');
  bindMobileButton('btnRight', 'ArrowRight');
  bindMobileButton('btnDown', 'ArrowDown');
  bindMobileButton('btnRotate', 'ArrowUp');
  bindMobileButton('btnDrop', ' ');

  // ゲームインスタンスをグローバルに公開（デバッグ用）
  window._game = game;
});
