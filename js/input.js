/**
 * 入力処理 / Input Handler
 * キーボード＆タッチ入力
 */

class InputHandler {
  constructor() {
    this.keys = {};
    this.keyJustPressed = {};
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchAction = null;
    this.mouseClickPos = null;

    this._bindEvents();
  }

  _bindEvents() {
    // キーボード / Keyboard
    document.addEventListener('keydown', (e) => {
      if (!this.keys[e.key]) {
        this.keyJustPressed[e.key] = true;
      }
      this.keys[e.key] = true;
      // ゲーム中のデフォルト動作を防止
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    // タッチ / Touch
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      }, { passive: false });

      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const dx = touch.clientX - this.touchStartX;
          const dy = touch.clientY - this.touchStartY;
          const threshold = 30;

          if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
            // タップ = 回転
            this.touchAction = 'rotate';
          } else if (Math.abs(dx) > Math.abs(dy)) {
            this.touchAction = dx > 0 ? 'right' : 'left';
          } else {
            this.touchAction = dy > 0 ? 'down' : 'rotate';
          }
        }
      }, { passive: false });

      // マウスクリック（タイトル画面用） / Mouse click (for title screen)
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        this.mouseClickPos = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      });
    }
  }

  /**
   * キーが押されたか（1フレームのみ） / Was key just pressed
   */
  isJustPressed(keyNames) {
    for (const key of keyNames) {
      if (this.keyJustPressed[key]) return true;
    }
    return false;
  }

  /**
   * キーが押されているか / Is key held
   */
  isHeld(keyNames) {
    for (const key of keyNames) {
      if (this.keys[key]) return true;
    }
    return false;
  }

  /**
   * タッチアクション取得 / Get touch action
   */
  getTouchAction() {
    const action = this.touchAction;
    this.touchAction = null;
    return action;
  }

  /**
   * マウスクリック位置取得 / Get mouse click position
   */
  getMouseClick() {
    const pos = this.mouseClickPos;
    this.mouseClickPos = null;
    return pos;
  }

  /**
   * フレーム終了時にリセット / Reset at end of frame
   */
  resetFrame() {
    this.keyJustPressed = {};
  }
}
