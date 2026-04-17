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

  // ゲームインスタンスをグローバルに公開（デバッグ用）
  window._game = game;
});
