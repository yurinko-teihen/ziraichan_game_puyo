/**
 * メインゲームロジック / Main Game Logic
 * ゲームループ、状態管理、ゲームフロー
 */

class Game {
  constructor() {
    this.state = CONSTANTS.STATE.TITLE;
    this.board = new Board();
    this.renderer = null;
    this.input = new InputHandler();
    this.sound = new SoundManager();
    this.pieceGenerator = null;

    // ゲーム状態 / Game state
    this.score = CONSTANTS.INITIAL_SCORE;
    this.level = 1;
    this.linesCleared = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalBlocksCleared = 0;
    this.lastScoreDelta = 0;
    this.isPaused = false;

    // 落下ペア / Current falling pair
    this.currentPair = null;

    // タイマー / Timers
    this.dropTimer = 0;
    this.dropInterval = CONSTANTS.INITIAL_DROP_INTERVAL;
    this.lockTimer = 0;
    this.clearAnimTimer = 0;
    this.chainDelayTimer = 0;

    // アニメーション状態 / Animation state
    this.chainsToProcess = [];
    this.isAnimatingClear = false;
    this.currentComboChains = [];
    this.pendingGravity = false;

    // DAS (Delayed Auto Shift) / 横移動リピート
    this.dasTimer = 0;
    this.dasDirection = 0;
    this.dasDelay = 170;  // Initial delay
    this.dasRepeat = 50;  // Repeat interval
    this.dasActive = false;

    // FPS
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this.fpsTimer = 0;
  }

  /**
   * ゲーム開始 / Start game
   */
  start() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      console.error('Canvas not found!');
      return;
    }

    // 仮レンダラー（タイトル画面用） / Temp renderer for title
    this.renderer = new Renderer(canvas);
    this.lastTime = performance.now();
    this._gameLoop(this.lastTime);
  }

  /**
   * ゲーム開始 / Start game (キャラ選択なし)
   */
  startGame() {
    this.board = new Board();
    this.pieceGenerator = new PieceGenerator();
    this.score = CONSTANTS.INITIAL_SCORE;
    this.level = 1;
    this.linesCleared = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalBlocksCleared = 0;
    this.lastScoreDelta = 0;
    this.dropInterval = CONSTANTS.INITIAL_DROP_INTERVAL;
    this.isPaused = false;
    this.isAnimatingClear = false;
    this.chainsToProcess = [];
    this.pendingGravity = false;

    const canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(canvas);

    this.currentPair = this.pieceGenerator.getNext();
    this.state = CONSTANTS.STATE.PLAYING;
  }

  /**
   * メインゲームループ / Main game loop
   */
  _gameLoop(timestamp) {
    const dt = Math.min(timestamp - this.lastTime, 100); // Cap delta time
    this.lastTime = timestamp;

    // FPS計算 / FPS calculation
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this._update(dt);
    this._draw(dt);

    this.input.resetFrame();
    requestAnimationFrame((ts) => this._gameLoop(ts));
  }

  /**
   * 更新 / Update
   */
  _update(dt) {
    switch (this.state) {
      case CONSTANTS.STATE.TITLE:
        this._updateTitle(dt);
        break;
      case CONSTANTS.STATE.PLAYING:
        if (!this.isPaused) {
          this._updatePlaying(dt);
        }
        this._updatePause();
        break;
      case CONSTANTS.STATE.CHAIN_ANIMATION:
        this._updateChainAnimation(dt);
        break;
      case CONSTANTS.STATE.GAME_OVER:
      case CONSTANTS.STATE.WIN:
        this._updateEndScreen();
        break;
    }
  }

  /**
   * タイトル画面更新 / Update title screen
   */
  _updateTitle(dt) {
    // Enterキーでスタート
    if (this.input.isJustPressed(['Enter'])) {
      this.input.getTouchAction();
      this.startGame();
      return;
    }

    // マウスクリック/タッチタップでスタートボタン判定
    const click = this.input.getMouseClick();
    if (click) {
      const w = this.renderer.canvas.width;
      const h = this.renderer.canvas.height;
      const btnW = this.renderer.titleBtnW;
      const btnH = this.renderer.titleBtnH;
      const btnX = (w - btnW) / 2;
      const btnY = h * this.renderer.titleBtnYRatio - btnH / 2;

      if (click.x >= btnX && click.x <= btnX + btnW &&
          click.y >= btnY && click.y <= btnY + btnH) {
        this.input.getTouchAction();
        this.startGame();
        return;
      }
    }

    // タイトル画面ではタッチアクションを消費して次画面に持ち越さない
    this.input.getTouchAction();
  }

  /**
   * プレイ中更新 / Update playing state
   */
  _updatePlaying(dt) {
    if (!this.currentPair) return;

    // 横移動入力 / Horizontal input
    this._handleHorizontalInput(dt);

    // 回転入力 / Rotation input
    if (this.input.isJustPressed(CONSTANTS.KEYS.ROTATE_CW)) {
      this._tryRotate(true);
    }
    if (this.input.isJustPressed(CONSTANTS.KEYS.ROTATE_CCW)) {
      this._tryRotate(false);
    }

    // タッチ入力 / Touch input
    const touchAction = this.input.getTouchAction();
    if (touchAction) {
      switch (touchAction) {
        case 'left': this._tryMove(-1); break;
        case 'right': this._tryMove(1); break;
        case 'down': this._softDrop(); break;
        case 'rotate': this._tryRotate(true); break;
        case 'hardDrop': this._hardDrop(); return; // return to skip auto-drop logic below
      }
    }

    // ハードドロップ / Hard drop
    if (this.input.isJustPressed(CONSTANTS.KEYS.HARD_DROP)) {
      this._hardDrop();
      return;
    }

    // ソフトドロップ / Soft drop
    const isSoftDrop = this.input.isHeld(CONSTANTS.KEYS.DOWN);
    const currentDropInterval = isSoftDrop ? CONSTANTS.SOFT_DROP_SPEED : this.dropInterval;

    // 自動落下 / Auto drop
    this.dropTimer += dt;
    if (this.dropTimer >= currentDropInterval) {
      this.dropTimer = 0;
      if (!this._tryDrop()) {
        // 着地処理 / Landing
        this._lockCurrentPair();
      }
    }
  }

  /**
   * 横移動処理（DAS対応） / Handle horizontal movement with DAS
   */
  _handleHorizontalInput(dt) {
    const leftPressed = this.input.isJustPressed(CONSTANTS.KEYS.LEFT);
    const rightPressed = this.input.isJustPressed(CONSTANTS.KEYS.RIGHT);
    const leftHeld = this.input.isHeld(CONSTANTS.KEYS.LEFT);
    const rightHeld = this.input.isHeld(CONSTANTS.KEYS.RIGHT);

    if (leftPressed) {
      this._tryMove(-1);
      this.dasDirection = -1;
      this.dasTimer = 0;
      this.dasActive = false;
    } else if (rightPressed) {
      this._tryMove(1);
      this.dasDirection = 1;
      this.dasTimer = 0;
      this.dasActive = false;
    }

    // DAS
    if ((leftHeld && this.dasDirection === -1) || (rightHeld && this.dasDirection === 1)) {
      this.dasTimer += dt;
      const threshold = this.dasActive ? this.dasRepeat : this.dasDelay;
      if (this.dasTimer >= threshold) {
        this._tryMove(this.dasDirection);
        this.dasTimer = 0;
        this.dasActive = true;
      }
    } else if (!leftHeld && !rightHeld) {
      this.dasDirection = 0;
      this.dasTimer = 0;
      this.dasActive = false;
    }
  }

  /**
   * 移動試行 / Try to move
   */
  _tryMove(direction) {
    if (!this.currentPair) return false;
    if (!this.board.checkCollision(this.currentPair, direction, 0)) {
      this.currentPair.col += direction;
      this.sound.playMove();
      return true;
    }
    return false;
  }

  /**
   * 落下試行 / Try to drop
   */
  _tryDrop() {
    if (!this.currentPair) return false;
    if (!this.board.checkCollision(this.currentPair, 0, 1)) {
      this.currentPair.row++;
      return true;
    }
    return false;
  }

  /**
   * 回転試行（壁蹴り対応） / Try to rotate with wall kicks
   */
  _tryRotate(clockwise) {
    if (!this.currentPair) return;

    const oldRotation = this.currentPair.rotation;
    const newRotation = clockwise
      ? (oldRotation + 1) % 4
      : (oldRotation + 3) % 4;

    // 通常回転
    if (!this.board.checkCollision(this.currentPair, 0, 0, newRotation)) {
      this.currentPair.rotation = newRotation;
      this.sound.playRotate();
      return;
    }

    // 壁蹴り / Wall kicks
    const kicks = [
      { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
      { dc: 0, dr: -1 }, { dc: 1, dr: -1 }, { dc: -1, dr: -1 }
    ];

    for (const kick of kicks) {
      if (!this.board.checkCollision(this.currentPair, kick.dc, kick.dr, newRotation)) {
        this.currentPair.col += kick.dc;
        this.currentPair.row += kick.dr;
        this.currentPair.rotation = newRotation;
        this.sound.playRotate();
        return;
      }
    }
  }

  /**
   * ソフトドロップ / Soft drop
   */
  _softDrop() {
    if (this._tryDrop()) {
      this.dropTimer = 0;
    }
  }

  /**
   * ハードドロップ / Hard drop
   */
  _hardDrop() {
    if (!this.currentPair) return;

    let dropped = 0;
    while (!this.board.checkCollision(this.currentPair, 0, 1)) {
      this.currentPair.row++;
      dropped++;
    }

    if (dropped > 0) {
      this.sound.playHardDrop();
      this.renderer.shakeAmount = 5;
    }

    this._lockCurrentPair();
  }

  /**
   * ペアをボードに固定 / Lock current pair onto board
   */
  _lockCurrentPair() {
    if (!this.currentPair) return;

    const placed = this.board.lockPair(this.currentPair);
    this.sound.playLand();
    this.currentPair = null;

    // 基地ガイブロック処理 / Handle special blocks
    const specialResults = this.board.handleSpecialBlocks(placed);
    if (specialResults.petrified.length > 0 || specialResults.sentBlocks.length > 0) {
      this.sound.playSpecial();
      this.renderer.shakeAmount = 10;
      this.renderer.flashAlpha = 0.3;
    }

    // 連鎖チェック開始 / Start chain check
    this.combo = 0;
    this._startChainCheck();
  }

  /**
   * 連鎖チェック開始 / Start chain checking
   */
  _startChainCheck() {
    // 重力適用
    this.board.applyGravity();

    const chains = this.board.findChains();
    if (chains.length > 0) {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      this.chainsToProcess = chains;

      // スコア計算 / Score calculation
      let totalBlocks = 0;
      const uniqueColors = new Set();
      for (const chain of chains) {
        totalBlocks += chain.size;
        uniqueColors.add(chain.colorIndex);
      }

      // 消したブロック数 × 基本点 × コンボ倍率 × 色数ボーナス
      const colorBonus = uniqueColors.size > 1 ? uniqueColors.size : 1;
      const comboBonus = Math.max(1, this.combo * CONSTANTS.COMBO_MULTIPLIER);
      const scoreGain = totalBlocks * CONSTANTS.BASE_SCORE_GAIN * comboBonus * colorBonus;
      this.score += scoreGain;
      this.lastScoreDelta = scoreGain;
      this.totalBlocksCleared += totalBlocks;

      // レベルアップ
      this.linesCleared += totalBlocks;
      const newLevel = Math.floor(this.linesCleared / 30) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.dropInterval = Math.max(
          CONSTANTS.MIN_DROP_INTERVAL,
          CONSTANTS.INITIAL_DROP_INTERVAL - (this.level - 1) * CONSTANTS.SPEED_INCREASE_PER_LEVEL
        );
      }

      // 消去アニメーション開始 / Start clear animation
      for (const chain of chains) {
        for (const pos of chain.blocks) {
          const block = this.board.getCell(pos.col, pos.row);
          if (block) {
            block.isClearing = true;
            block.clearTimer = 0;
            this.renderer.addClearParticles(pos.col, pos.row, CONSTANTS.COLORS[chain.colorIndex]);
          }
        }
      }

      this.sound.playClear(this.combo);
      if (this.combo > 1) {
        this.sound.playCombo(this.combo);
        this.renderer.shakeAmount = this.combo * 3;
      }

      this.isAnimatingClear = true;
      this.clearAnimTimer = 0;
      this.state = CONSTANTS.STATE.CHAIN_ANIMATION;
    } else {
      // 連鎖終了 / Chain ended
      this._afterChainComplete();
    }
  }

  /**
   * 連鎖アニメーション更新 / Update chain animation
   */
  _updateChainAnimation(dt) {
    this.clearAnimTimer += dt;

    // ブロックの消去アニメーション更新
    for (const chain of this.chainsToProcess) {
      for (const pos of chain.blocks) {
        const block = this.board.getCell(pos.col, pos.row);
        if (block && block.isClearing) {
          block.clearTimer = Math.min(1, this.clearAnimTimer / CONSTANTS.CLEAR_ANIMATION_DURATION);
        }
      }
    }

    if (this.clearAnimTimer >= CONSTANTS.CLEAR_ANIMATION_DURATION) {
      // 消去実行
      this.board.clearChains(this.chainsToProcess);
      this.chainsToProcess = [];
      this.isAnimatingClear = false;

      // 次の連鎖チェック（ディレイ付き）
      setTimeout(() => {
        this._startChainCheck();
      }, CONSTANTS.CHAIN_DELAY);
    }
  }

  /**
   * 連鎖完了後の処理 / After chain complete
   */
  _afterChainComplete() {
    this.state = CONSTANTS.STATE.PLAYING;

    // ゲームオーバー判定 / Game over check
    if (this.board.isGameOver()) {
      this.state = CONSTANTS.STATE.GAME_OVER;
      this.sound.playGameOver();
      return;
    }

    // 次のペア / Next pair
    this.currentPair = this.pieceGenerator.getNext();
    this.dropTimer = 0;
    this.combo = 0;
  }

  /**
   * ポーズ処理 / Handle pause
   */
  _updatePause() {
    if (this.input.isJustPressed(CONSTANTS.KEYS.PAUSE)) {
      this.isPaused = !this.isPaused;
    }
  }

  /**
   * 終了画面更新 / Update end screen
   */
  _updateEndScreen() {
    if (this.input.isJustPressed(['Enter'])) {
      this.state = CONSTANTS.STATE.TITLE;
      return;
    }

    // タッチタップ/クリックでもタイトルに戻る
    const click = this.input.getMouseClick();
    const touchAction = this.input.getTouchAction();
    if (click || touchAction) {
      this.state = CONSTANTS.STATE.TITLE;
    }
  }

  /**
   * ゲームボード共通描画 / Common game board drawing
   * @param {number} dt
   * @param {boolean} drawFalling - 落下中のペアを描画するか
   */
  _drawGameBoard(dt, drawFalling) {
    const r = this.renderer;

    // UIパネル（シェイクの影響を受けない） / UI panels (not affected by shake)
    r.drawStatsBar(this.maxCombo, this.totalBlocksCleared);
    r.drawScorePanel(this.score);

    // ボードコンテンツ（シェイク適用） / Board content (with shake)
    r.ctx.save();
    r.applyShake();
    r.drawBackground(dt);
    r.drawGrid();
    r.drawBoard(this.board);
    if (drawFalling && this.currentPair) {
      r.drawFallingPair(this.currentPair);
    }
    r.drawParticles(dt);
    r.drawFlash();
    r.ctx.restore();

    // フレームとサイドパネル（シェイクの影響を受けない） / Frame & side panels
    r.drawBoardFrame();
    r.drawNext(this.pieceGenerator ? this.pieceGenerator.peekNext() : []);
    r.drawLevelBadge(this.level);
    r.drawFillMeter(this.board.getFillRatio());
    r.drawControlsHint();
  }

  /**
   * 描画 / Draw
   */
  _draw(dt) {
    const r = this.renderer;
    r.clear();

    switch (this.state) {
      case CONSTANTS.STATE.TITLE:
        r.drawTitleScreen();
        break;

      case CONSTANTS.STATE.PLAYING:
      case CONSTANTS.STATE.CHAIN_ANIMATION:
        this._drawGameBoard(dt, this.state === CONSTANTS.STATE.PLAYING);
        r.drawComboOverlay(this.combo, this.lastScoreDelta);

        if (this.isPaused) {
          r.drawPauseScreen();
        }
        break;

      case CONSTANTS.STATE.GAME_OVER:
        this._drawGameBoard(dt, false);
        r.drawGameOverScreen(this.score);
        break;

      case CONSTANTS.STATE.WIN:
        this._drawGameBoard(dt, false);
        r.drawWinScreen(this.score);
        break;
    }
  }
}
