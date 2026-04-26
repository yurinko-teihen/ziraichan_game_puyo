/**
 * エントリーポイント / Entry Point
 * ゲーム初期化
 */

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();

  // ゲームインスタンスをグローバルに公開（デバッグ用）
  window._game = game;
});
