/**
 * レンダラー / Renderer
 * Canvas描画エンジン
 */

class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.svgCache = {};
    this.bgTextY = 0;
    this.bgTextIndex = 0;
    this.bgTexts = [];
    this.particles = [];
    this.shakeAmount = 0;
    this.flashAlpha = 0;

    // ボード描画エリア / Board draw area
    this.boardX = 30;
    this.boardY = 60;
    this.cellSize = CONSTANTS.CELL_SIZE;

    // キャンバスサイズ設定 / Canvas size
    this.canvas.width = this.boardX * 2 + CONSTANTS.COLS * this.cellSize + 160;
    this.canvas.height = this.boardY + CONSTANTS.VISIBLE_ROWS * this.cellSize + 40;

    this._initBgTexts();
  }

  _initBgTexts() {
    // シャッフルして背景テキストを配列に
    this.bgTexts = [...CONSTANTS.BG_CONVERSATIONS].sort(() => Math.random() - 0.5);
    this.bgTextIndex = 0;
  }

  /**
   * SVG画像をロード / Load SVG image
   * @param {string} src
   * @returns {Promise<HTMLImageElement>}
   */
  async loadSVG(src) {
    if (this.svgCache[src]) return this.svgCache[src];
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.svgCache[src] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /** 画面クリア / Clear screen */
  clear() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 背景テキスト描画 / Draw background text
   * @param {number} dt - デルタタイム
   */
  drawBackground(dt) {
    const ctx = this.ctx;
    ctx.save();

    // 暗い背景 / Dark background
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(
      this.boardX,
      this.boardY,
      CONSTANTS.COLS * this.cellSize,
      CONSTANTS.VISIBLE_ROWS * this.cellSize
    );

    // スクロールするテキスト / Scrolling text
    ctx.fillStyle = 'rgba(255, 255, 100, 0.15)';
    ctx.font = '12px "MS Gothic", monospace';
    ctx.textAlign = 'left';

    const lineHeight = 20;
    const visibleHeight = CONSTANTS.VISIBLE_ROWS * this.cellSize;

    // 複数行表示
    const startIdx = Math.floor(this.bgTextY / lineHeight) % this.bgTexts.length;
    for (let i = 0; i < Math.ceil(visibleHeight / lineHeight) + 1; i++) {
      const textIdx = (startIdx + i) % this.bgTexts.length;
      const y = this.boardY + (i * lineHeight) - (this.bgTextY % lineHeight);
      if (y > this.boardY - lineHeight && y < this.boardY + visibleHeight + lineHeight) {
        ctx.fillText(
          this.bgTexts[textIdx],
          this.boardX + 4,
          y + lineHeight
        );
      }
    }

    this.bgTextY += CONSTANTS.BG_TEXT_SPEED;
    if (this.bgTextY > this.bgTexts.length * lineHeight) {
      this.bgTextY = 0;
    }

    ctx.restore();
  }

  /**
   * グリッド線描画 / Draw grid lines
   */
  drawGrid() {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let col = 0; col <= CONSTANTS.COLS; col++) {
      const x = this.boardX + col * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.boardY);
      ctx.lineTo(x, this.boardY + CONSTANTS.VISIBLE_ROWS * this.cellSize);
      ctx.stroke();
    }

    for (let row = 0; row <= CONSTANTS.VISIBLE_ROWS; row++) {
      const y = this.boardY + row * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.boardX, y);
      ctx.lineTo(this.boardX + CONSTANTS.COLS * this.cellSize, y);
      ctx.stroke();
    }

    // ボード外枠 / Board border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.boardX,
      this.boardY,
      CONSTANTS.COLS * this.cellSize,
      CONSTANTS.VISIBLE_ROWS * this.cellSize
    );

    ctx.restore();
  }

  /**
   * ブロック1つ描画 / Draw single block
   * @param {number} col
   * @param {number} row - ボード上の行（0は隠し行）
   * @param {Block} block
   * @param {number} [alpha=1]
   */
  drawBlock(col, row, block, alpha = 1) {
    const visibleRow = row - 1; // Hidden row offset
    if (visibleRow < 0) return; // Don't draw hidden row

    const ctx = this.ctx;
    const x = this.boardX + col * this.cellSize;
    const y = this.boardY + visibleRow * this.cellSize;
    const size = this.cellSize;
    const padding = 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (block.isClearing) {
      // 消去アニメーション / Clear animation
      const progress = block.clearTimer;
      ctx.globalAlpha = alpha * (1 - progress);
      const scale = 1 + progress * 0.3;
      ctx.translate(x + size / 2, y + size / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + size / 2), -(y + size / 2));
    }

    const color = block.color;

    if (block.isStone) {
      // 石ブロック / Stone block
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = '#616161';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      // 石の模様
      ctx.strokeStyle = '#757575';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + padding);
      ctx.lineTo(x + 12, y + size - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size - 12, y + padding);
      ctx.lineTo(x + size - 8, y + size - padding);
      ctx.stroke();
    } else if (block.isSpecial) {
      // 基地ガイブロック / Kichigai block
      ctx.fillStyle = '#666';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      // ⚠マーク
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', x + size / 2, y + size / 2);
    } else {
      // 通常ブロック / Normal block
      // グラデーション / Gradient
      const grad = ctx.createLinearGradient(x, y, x, y + size);
      grad.addColorStop(0, color.hex);
      grad.addColorStop(1, color.dark);
      ctx.fillStyle = grad;

      // 角丸四角 / Rounded rect
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(x + padding + r, y + padding);
      ctx.lineTo(x + size - padding - r, y + padding);
      ctx.quadraticCurveTo(x + size - padding, y + padding, x + size - padding, y + padding + r);
      ctx.lineTo(x + size - padding, y + size - padding - r);
      ctx.quadraticCurveTo(x + size - padding, y + size - padding, x + size - padding - r, y + size - padding);
      ctx.lineTo(x + padding + r, y + size - padding);
      ctx.quadraticCurveTo(x + padding, y + size - padding, x + padding, y + size - padding - r);
      ctx.lineTo(x + padding, y + padding + r);
      ctx.quadraticCurveTo(x + padding, y + padding, x + padding + r, y + padding);
      ctx.closePath();
      ctx.fill();

      // ハイライト / Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x + padding + 4, y + padding + 2, size / 2 - 8, 6);

      // キャラクターの簡易顔（ミックス：ブロックごとに異なるキャラ）/ Mixed character face per block
      this._drawCharacterFace(ctx, x + padding, y + padding, size - padding * 2, color, block.characterId);

      // 枠線 / Border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * キャラクター顔を描画 / Draw character face on block
   * @param {string} [charId] - ブロックごとのキャラクターID
   */
  _drawCharacterFace(ctx, x, y, size, color, charId = 'maro') {
    const cx = x + size / 2;
    const cy = y + size / 2 + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';

    switch (charId) {
      case 'maro':
        // 麻呂の眉と目
        ctx.fillRect(cx - 10, cy - 8, 7, 3);
        ctx.fillRect(cx + 3, cy - 8, 7, 3);
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 2, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // 口
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 4, 0, Math.PI);
        ctx.stroke();
        break;

      case 'amanatsu':
        // にっこり目
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 2, 3, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 6, cy - 2, 3, Math.PI, 0);
        ctx.stroke();
        // ほっぺ
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.beginPath();
        ctx.arc(cx - 12, cy + 2, 4, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        // 口
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 5, 0, Math.PI);
        ctx.fill();
        break;

      case 'king':
        // 怒り目
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 6);
        ctx.lineTo(cx - 3, cy - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy - 6);
        ctx.lineTo(cx + 3, cy - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 1, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        // 口（への字）
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 5);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.stroke();
        break;

      case 'shigeru':
        // 普通の目
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        // 入れ歯の口
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 8, cy + 2, 16, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(cx - 8, cy + 2, 16, 6);
        // 歯の線
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 4 + i * 4, cy + 2);
          ctx.lineTo(cx - 4 + i * 4, cy + 8);
          ctx.stroke();
        }
        break;

      case 'chin':
        // ジト目
        ctx.fillRect(cx - 9, cy - 3, 7, 2);
        ctx.fillRect(cx + 2, cy - 3, 7, 2);
        // 口
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 4, 0, Math.PI);
        ctx.stroke();
        break;
    }
  }

  /**
   * ボード全体描画 / Draw entire board
   * @param {Board} board
   */
  drawBoard(board) {
    for (let row = 1; row < CONSTANTS.ROWS; row++) {
      for (let col = 0; col < CONSTANTS.COLS; col++) {
        const block = board.grid[row][col];
        if (block) {
          this.drawBlock(col, row, block);
        }
      }
    }
  }

  /**
   * 落下ペア描画 / Draw falling pair
   * @param {FallingPair} pair
   */
  drawFallingPair(pair) {
    if (!pair) return;
    const positions = pair.getPositions();
    for (const pos of positions) {
      this.drawBlock(pos.col, pos.row, pos.block);
    }

    // ゴーストピース / Ghost piece
    this._drawGhostPair(pair);
  }

  /**
   * ゴーストピース描画 / Draw ghost piece
   */
  _drawGhostPair(pair) {
    // Find lowest position
    let ghostRow = pair.row;
    const tempPair = {
      col: pair.col,
      row: pair.row,
      rotation: pair.rotation,
      main: pair.main,
      sub: pair.sub,
      getPositions: pair.getPositions.bind(pair),
      getSubPosition: pair.getSubPosition.bind(pair)
    };

    // This is a simplified ghost - just show where it would land
    // Not critical for gameplay
  }

  /**
   * ネクスト表示 / Draw next pieces
   * @param {Array<FallingPair>} nextPairs
   */
  drawNext(nextPairs) {
    const ctx = this.ctx;
    const x = this.boardX + CONSTANTS.COLS * this.cellSize + 20;
    let y = this.boardY;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NEXT', x, y - 5);

    for (let i = 0; i < nextPairs.length && i < 2; i++) {
      const pair = nextPairs[i];
      const scale = i === 0 ? 0.8 : 0.6;
      const blockSize = this.cellSize * scale;

      // サブブロック（上）
      this._drawMiniBlock(ctx, x + 10, y + 5, blockSize, pair.sub);
      // メインブロック（下）
      this._drawMiniBlock(ctx, x + 10, y + 5 + blockSize, blockSize, pair.main);

      y += blockSize * 2 + 20;
    }
  }

  _drawMiniBlock(ctx, x, y, size, block) {
    const color = block.color;
    const padding = 1;

    ctx.save();

    if (block.isSpecial) {
      ctx.fillStyle = '#666';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.fillStyle = '#ff0';
      ctx.font = `${size * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', x + size / 2, y + size / 2);
    } else {
      const grad = ctx.createLinearGradient(x, y, x, y + size);
      grad.addColorStop(0, color.hex);
      grad.addColorStop(1, color.dark);
      ctx.fillStyle = grad;
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
    }

    ctx.restore();
  }

  /**
   * スコア表示 / Draw score
   * @param {number} score
   * @param {number} combo
   * @param {number} level
   * @param {number} scoreLoss - 実際のスコア減少量
   */
  drawScore(score, combo, level, scoreLoss = 0) {
    const ctx = this.ctx;
    const x = this.boardX + CONSTANTS.COLS * this.cellSize + 20;
    const y = this.boardY + 220;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';

    ctx.fillText('SCORE', x, y);
    ctx.fillStyle = score > CONSTANTS.INITIAL_SCORE * 0.5 ? '#4fc3f7' : '#ff5252';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(score.toLocaleString(), x, y + 22);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('LEVEL', x, y + 55);
    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(level), x, y + 75);

    if (combo > 0) {
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      const boardCenterX = this.boardX + CONSTANTS.COLS * this.cellSize / 2;
      ctx.fillText(`${combo} COMBO!`, boardCenterX, this.boardY - 10);

      ctx.fillStyle = '#ff8a80';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`-${scoreLoss.toLocaleString()}pts`, boardCenterX, this.boardY - 25);
    }
  }

  /**
   * 充填率メーター描画 / Draw fill rate meter
   * @param {number} fillRatio
   */
  drawFillMeter(fillRatio) {
    const ctx = this.ctx;
    const x = this.boardX - 25;
    const y = this.boardY;
    const width = 15;
    const height = CONSTANTS.VISIBLE_ROWS * this.cellSize;

    // 枠 / Frame
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // メーター / Meter
    const fillHeight = height * fillRatio;
    const grad = ctx.createLinearGradient(x, y + height - fillHeight, x, y + height);
    grad.addColorStop(0, '#4caf50');
    grad.addColorStop(0.7, '#ffeb3b');
    grad.addColorStop(1, '#f44336');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + height - fillHeight, width - 2, fillHeight);

    // ラベル / Label
    ctx.fillStyle = '#aaa';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FILL', 0, -1);
    ctx.restore();
  }

  /**
   * パーティクル追加 / Add particles
   */
  addClearParticles(col, row, color) {
    const visibleRow = row - 1;
    const x = this.boardX + col * this.cellSize + this.cellSize / 2;
    const y = this.boardY + visibleRow * this.cellSize + this.cellSize / 2;

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 1,
        color: color.hex,
        size: 3 + Math.random() * 4
      });
    }
  }

  /**
   * パーティクル更新・描画 / Update and draw particles
   */
  drawParticles(dt) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.02;
      p.size *= 0.98;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 画面シェイク / Screen shake
   */
  applyShake() {
    if (this.shakeAmount > 0) {
      const dx = (Math.random() - 0.5) * this.shakeAmount;
      const dy = (Math.random() - 0.5) * this.shakeAmount;
      this.ctx.translate(dx, dy);
      this.shakeAmount *= 0.9;
      if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    }
  }

  /**
   * フラッシュエフェクト / Flash effect
   */
  drawFlash() {
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.flashAlpha *= 0.9;
      if (this.flashAlpha < 0.01) this.flashAlpha = 0;
    }
  }

  /**
   * タイトル画面描画 / Draw title screen
   */
  drawTitleScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, w, h);

    // タイトル / Title
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地雷ちゃんパズル', w / 2, h * 0.25);

    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('〜底辺ぷよぷよ〜', w / 2, h * 0.33);

    // スタートボタン / Start button
    const btnW = 200;
    const btnH = 60;
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.5 - btnH / 2;

    ctx.fillStyle = 'rgba(255,68,68,0.8)';
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    // 角丸ボタン / Rounded button
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(btnX + r, btnY);
    ctx.lineTo(btnX + btnW - r, btnY);
    ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + r);
    ctx.lineTo(btnX + btnW, btnY + btnH - r);
    ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH);
    ctx.lineTo(btnX + r, btnY + btnH);
    ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - r);
    ctx.lineTo(btnX, btnY + r);
    ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('START', w / 2, btnY + btnH / 2 + 10);

    // 操作説明 / Controls (PC & モバイル対応)
    ctx.fillStyle = '#888';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';

    // モバイル判定 / Detect mobile
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
      ctx.fillText('STARTをタップしてゲーム開始！', w / 2, h * 0.85);
      ctx.fillText('画面下のボタンで操作できるよ', w / 2, h * 0.9);
    } else {
      ctx.fillText('← → : 移動　↑ : 回転　↓ : 高速落下　Space : ハードドロップ', w / 2, h * 0.85);
      ctx.fillText('STARTをクリック or Enterキーでゲーム開始', w / 2, h * 0.9);
    }
  }

  /**
   * ゲームオーバー画面 / Game over screen
   * @param {number} score
   */
  drawGameOverScreen(score) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', w / 2, h * 0.35);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('最終スコア / Final Score', w / 2, h * 0.45);

    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(score.toLocaleString() + ' pts', w / 2, h * 0.53);

    ctx.fillStyle = '#ffeb3b';
    ctx.font = '14px sans-serif';
    ctx.fillText('ヒント：同じ色を消すとスコアが減るよ…', w / 2, h * 0.63);
    ctx.fillText('本当の勝利は…画面を埋め尽くすこと！？', w / 2, h * 0.68);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px sans-serif';
    ctx.fillText('Enterキー / タップでタイトルに戻る', w / 2, h * 0.8);
  }

  /**
   * 勝利画面 / Win screen
   * @param {number} score
   */
  drawWinScreen(score) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffeb3b';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 勝利！ 🎉', w / 2, h * 0.3);

    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('画面を埋め尽くした！', w / 2, h * 0.4);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('残りスコア / Remaining Score', w / 2, h * 0.5);

    ctx.fillStyle = '#4fc3f7';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(score.toLocaleString() + ' pts', w / 2, h * 0.58);

    ctx.fillStyle = '#ff8a80';
    ctx.font = '14px sans-serif';
    ctx.fillText('※ルールは「色を合わせない」ことだったのだ！', w / 2, h * 0.68);
    ctx.fillText('底辺の発言をブロックで隠すのが真の目的！', w / 2, h * 0.73);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px sans-serif';
    ctx.fillText('Enterキー / タップでタイトルに戻る', w / 2, h * 0.85);
  }

  /**
   * ポーズ画面 / Pause screen
   */
  drawPauseScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSE', w / 2, h / 2);

    ctx.font = '14px sans-serif';
    ctx.fillText('Pキー or ESCで再開', w / 2, h / 2 + 30);
  }

}
