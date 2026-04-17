/**
 * レンダラー / Renderer
 * Canvas描画エンジン - モダンぷよぷよ風UI
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

    // マロブロック画像 / Maro block image
    this.maroBlockImg = null;
    this.maroBlockTinted = {};
    this._loadMaroBlockImage();

    // ボード描画エリア / Board draw area (modernized layout)
    this.boardX = 52;
    this.boardY = 128;
    this.cellSize = CONSTANTS.CELL_SIZE;

    // レイアウト計算 / Layout calculations
    this.boardWidth = CONSTANTS.COLS * this.cellSize;
    this.boardHeight = CONSTANTS.VISIBLE_ROWS * this.cellSize;
    this.panelRightX = this.boardX + this.boardWidth + 16;

    // キャンバスサイズ設定 / Canvas size
    this.canvas.width = 480;
    this.canvas.height = 770;

    this._initBgTexts();
  }

  _initBgTexts() {
    // シャッフルして背景テキストを配列に
    this.bgTexts = [...CONSTANTS.BG_CONVERSATIONS].sort(() => Math.random() - 0.5);
    this.bgTextIndex = 0;
  }

  /**
   * マロブロック画像をロード / Load maro block image
   */
  _loadMaroBlockImage() {
    const img = new Image();
    img.onload = () => {
      this.maroBlockImg = img;
      this._generateTintedImages();
    };
    img.onerror = () => {
      const svgImg = new Image();
      svgImg.onload = () => {
        this.maroBlockImg = svgImg;
        this._generateTintedImages();
      };
      svgImg.onerror = () => {
        console.warn('マロブロック画像のロードに失敗 / Failed to load maro block image');
      };
      svgImg.src = 'assets/img/maro_block.svg';
    };
    img.src = 'assets/img/maro_block.png';
  }

  /**
   * 各色の色付き画像を生成 / Generate tinted images for each color
   */
  _generateTintedImages() {
    if (!this.maroBlockImg) return;

    const size = this.cellSize;

    CONSTANTS.COLORS.forEach((color, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const tCtx = canvas.getContext('2d');

      tCtx.drawImage(this.maroBlockImg, 0, 0, size, size);
      tCtx.globalCompositeOperation = 'multiply';
      tCtx.fillStyle = color.hex;
      tCtx.fillRect(0, 0, size, size);
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(this.maroBlockImg, 0, 0, size, size);

      this.maroBlockTinted[index] = canvas;
    });
  }

  /**
   * SVG画像をロード / Load SVG image
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

  /**
   * 角丸矩形パスユーティリティ / Rounded rectangle path utility
   */
  _roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 画面クリア・モダン背景描画 / Clear screen with modern background */
  clear() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 空のグラデーション / Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#4FC3F7');
    skyGrad.addColorStop(0.4, '#81D4FA');
    skyGrad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 装飾的な雲 / Decorative clouds
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(60, h - 60, 40, 0, Math.PI * 2);
    ctx.arc(100, h - 70, 30, 0, Math.PI * 2);
    ctx.arc(140, h - 55, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w - 80, h - 80, 35, 0, Math.PI * 2);
    ctx.arc(w - 45, h - 70, 25, 0, Math.PI * 2);
    ctx.fill();

    // メインコンテナ / Main container (white card with shadow)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    this._roundRect(ctx, 8, 5, w - 16, h - 10, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill();
    ctx.restore();

    // コンテナの微妙なボーダー / Subtle container border
    this._roundRect(ctx, 8, 5, w - 16, h - 10, 18);
    ctx.strokeStyle = 'rgba(21,101,192,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * ステータスバー描画 / Draw stats bar (top)
   */
  drawStatsBar(maxCombo, totalCleared) {
    const ctx = this.ctx;
    const barX = 18;
    const barY = 14;
    const barW = this.canvas.width - 36;
    const barH = 28;

    // 背景パネル / Background panel
    this._roundRect(ctx, barX, barY, barW, barH, 7);
    ctx.fillStyle = '#E3F2FD';
    ctx.fill();
    ctx.strokeStyle = 'rgba(21,101,192,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const cy = barY + barH / 2;

    // Stats text
    ctx.fillStyle = '#37474F';
    ctx.font = 'bold 11px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('最大コンボ:', barX + 10, cy);
    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(String(maxCombo || 0), barX + 85, cy);

    ctx.fillStyle = '#37474F';
    ctx.font = 'bold 11px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillText('消した数:', barX + 115, cy);
    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(String(totalCleared || 0), barX + 178, cy);

    // MENU ボタン風ラベル / MENU button-style label
    const menuBtnW = 48;
    const menuBtnH = 20;
    const menuBtnX = barX + barW - menuBtnW - 6;
    const menuBtnY = cy - menuBtnH / 2;
    this._roundRect(ctx, menuBtnX, menuBtnY, menuBtnW, menuBtnH, 5);
    ctx.fillStyle = '#1565C0';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MENU', menuBtnX + menuBtnW / 2, cy);
  }

  /**
   * スコアパネル描画 / Draw score panel (below stats bar)
   */
  drawScorePanel(score) {
    const ctx = this.ctx;
    const panelX = 18;
    const panelY = 48;
    const panelW = this.canvas.width - 36;
    const panelH = 70;

    // ダークネイビー背景 / Dark navy background
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, '#0D1B3E');
    grad.addColorStop(1, '#162544');
    ctx.fillStyle = grad;
    ctx.fill();

    // 微妙なハイライトボーダー / Subtle highlight border
    ctx.strokeStyle = 'rgba(100,181,246,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner glow line at top
    const glowGrad = ctx.createLinearGradient(panelX + 20, panelY, panelX + panelW - 20, panelY);
    glowGrad.addColorStop(0, 'rgba(100,181,246,0)');
    glowGrad.addColorStop(0.5, 'rgba(100,181,246,0.4)');
    glowGrad.addColorStop(1, 'rgba(100,181,246,0)');
    ctx.strokeStyle = glowGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + 1);
    ctx.lineTo(panelX + panelW - 20, panelY + 1);
    ctx.stroke();

    // "スコア" ラベル / "Score" label
    ctx.fillStyle = '#64B5F6';
    ctx.font = 'bold 13px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('スコア', panelX + panelW / 2, panelY + 8);

    // スコア数値 / Score number (zero-padded, with commas)
    const scoreStr = String(Math.max(0, score)).padStart(9, '0');
    const formatted = scoreStr.replace(/(\d)(?=(\d{3})+$)/g, '$1,');

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Courier New", "Lucida Console", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Subtle text shadow for depth
    ctx.save();
    ctx.shadowColor = 'rgba(100,181,246,0.3)';
    ctx.shadowBlur = 8;
    ctx.fillText(formatted, panelX + panelW / 2, panelY + 30);
    ctx.restore();
  }

  /**
   * ボードフレーム描画 / Draw board frame (thick modern border)
   */
  drawBoardFrame() {
    const ctx = this.ctx;
    const pad = 5;
    const frameX = this.boardX - pad;
    const frameY = this.boardY - pad;
    const frameW = this.boardWidth + pad * 2;
    const frameH = this.boardHeight + pad * 2;

    // 外側のグロー / Outer glow
    ctx.save();
    ctx.shadowColor = 'rgba(21,101,192,0.35)';
    ctx.shadowBlur = 15;

    // 太い青フレーム / Thick blue frame with gradient
    this._roundRect(ctx, frameX, frameY, frameW, frameH, 6);
    const frameGrad = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
    frameGrad.addColorStop(0, '#1976D2');
    frameGrad.addColorStop(0.15, '#2196F3');
    frameGrad.addColorStop(0.5, '#1E88E5');
    frameGrad.addColorStop(0.85, '#1976D2');
    frameGrad.addColorStop(1, '#0D47A1');
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();

    // 内側のハイライト線 / Inner highlight line
    this._roundRect(ctx, frameX + 3, frameY + 3, frameW - 6, frameH - 6, 3);
    ctx.strokeStyle = 'rgba(144,202,249,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * レベルバッジ描画 / Draw level badge (left of board)
   */
  drawLevelBadge(level) {
    const ctx = this.ctx;
    const cx = 27;
    const cy = this.boardY + 30;
    const badgeW = 38;
    const badgeH = 52;

    // バッジ背景 / Badge background
    ctx.save();
    ctx.shadowColor = 'rgba(21,101,192,0.3)';
    ctx.shadowBlur = 6;
    this._roundRect(ctx, cx - badgeW / 2, cy - 8, badgeW, badgeH, 10);
    const grad = ctx.createLinearGradient(cx, cy - 8, cx, cy + badgeH - 8);
    grad.addColorStop(0, '#1976D2');
    grad.addColorStop(1, '#0D47A1');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // ハイライトボーダー / Highlight border
    this._roundRect(ctx, cx - badgeW / 2, cy - 8, badgeW, badgeH, 10);
    ctx.strokeStyle = 'rgba(144,202,249,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "Lv." ラベル / "Lv." label
    ctx.fillStyle = '#90CAF9';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Lv.', cx, cy + 6);

    // レベル番号 / Level number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillText(String(level), cx, cy + 27);
  }

  /**
   * 背景テキスト描画 / Draw background text
   * ※チャット背景は変更しない / Chat background unchanged per requirements
   */
  drawBackground(dt) {
    const ctx = this.ctx;
    ctx.save();

    // 暗い背景 / Dark background (unchanged)
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(
      this.boardX,
      this.boardY,
      this.boardWidth,
      this.boardHeight
    );

    // スクロールするテキスト / Scrolling text (unchanged)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '12px "MS Gothic", monospace';
    ctx.textAlign = 'left';

    const lineHeight = 20;
    const visibleHeight = this.boardHeight;

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
   * グリッド線描画 / Draw grid lines (modernized - subtle lines only)
   */
  drawGrid() {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let col = 1; col < CONSTANTS.COLS; col++) {
      const x = this.boardX + col * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.boardY);
      ctx.lineTo(x, this.boardY + this.boardHeight);
      ctx.stroke();
    }

    for (let row = 1; row < CONSTANTS.VISIBLE_ROWS; row++) {
      const y = this.boardY + row * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.boardX, y);
      ctx.lineTo(this.boardX + this.boardWidth, y);
      ctx.stroke();
    }

    // デンジャーゾーンマーカー / Danger zone marker (× at top center)
    ctx.fillStyle = 'rgba(255, 82, 82, 0.5)';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const dangerCol = Math.floor(CONSTANTS.COLS / 2);
    ctx.fillText('×', this.boardX + dangerCol * this.cellSize + this.cellSize / 2, this.boardY + this.cellSize / 2);

    ctx.restore();
  }

  /**
   * ブロック1つ描画 / Draw single block (UNCHANGED)
   */
  drawBlock(col, row, block, alpha = 1) {
    const visibleRow = row - 1;
    if (visibleRow < 0) return;

    const ctx = this.ctx;
    const x = this.boardX + col * this.cellSize;
    const y = this.boardY + visibleRow * this.cellSize;
    const size = this.cellSize;
    const padding = 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (block.isClearing) {
      const progress = block.clearTimer;
      ctx.globalAlpha = alpha * (1 - progress);
      const scale = 1 + progress * 0.3;
      ctx.translate(x + size / 2, y + size / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + size / 2), -(y + size / 2));
    }

    const color = block.color;

    if (block.isStone) {
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = '#616161';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
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
      ctx.fillStyle = '#666';
      ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + padding, y + padding, size - padding * 2, size - padding * 2);
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', x + size / 2, y + size / 2);
    } else {
      const tintedImg = this.maroBlockTinted[block.colorIndex];
      if (tintedImg) {
        const drawSize = size * 1.2;
        const drawOffset = (size - drawSize) / 2;
        ctx.drawImage(tintedImg, 0, 0, tintedImg.width, tintedImg.height,
          x + drawOffset, y + drawOffset, drawSize, drawSize);
      } else {
        const grad = ctx.createLinearGradient(x, y, x, y + size);
        grad.addColorStop(0, color.hex);
        grad.addColorStop(1, color.dark);
        ctx.fillStyle = grad;

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

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + padding + 4, y + padding + 2, size / 2 - 8, 6);

        this._drawCharacterFace(ctx, x + padding, y + padding, size - padding * 2, color, block.characterId);

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * キャラクター顔を描画 / Draw character face on block (UNCHANGED)
   */
  _drawCharacterFace(ctx, x, y, size, color, charId = 'maro') {
    const cx = x + size / 2;
    const cy = y + size / 2 + 4;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';

    switch (charId) {
      case 'maro':
        ctx.fillRect(cx - 10, cy - 8, 7, 3);
        ctx.fillRect(cx + 3, cy - 8, 7, 3);
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 2, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 4, 0, Math.PI);
        ctx.stroke();
        break;

      case 'amanatsu':
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 2, 3, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 6, cy - 2, 3, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,100,100,0.3)';
        ctx.beginPath();
        ctx.arc(cx - 12, cy + 2, 4, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 5, 0, Math.PI);
        ctx.fill();
        break;

      case 'king':
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
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 5);
        ctx.lineTo(cx, cy + 8);
        ctx.lineTo(cx + 5, cy + 5);
        ctx.stroke();
        break;

      case 'shigeru':
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 2, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 8, cy + 2, 16, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.strokeRect(cx - 8, cy + 2, 16, 6);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 4 + i * 4, cy + 2);
          ctx.lineTo(cx - 4 + i * 4, cy + 8);
          ctx.stroke();
        }
        break;

      case 'chin':
        ctx.fillRect(cx - 9, cy - 3, 7, 2);
        ctx.fillRect(cx + 2, cy - 3, 7, 2);
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 4, 0, Math.PI);
        ctx.stroke();
        break;
    }
  }

  /**
   * ボード全体描画 / Draw entire board (UNCHANGED)
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
   * 落下ペア描画 / Draw falling pair (UNCHANGED)
   */
  drawFallingPair(pair) {
    if (!pair) return;
    const positions = pair.getPositions();
    for (const pos of positions) {
      this.drawBlock(pos.col, pos.row, pos.block);
    }
    this._drawGhostPair(pair);
  }

  /**
   * ゴーストピース描画 / Draw ghost piece (UNCHANGED)
   */
  _drawGhostPair(pair) {
    // Simplified ghost - placeholder
  }

  /**
   * ネクスト表示 / Draw next pieces (modernized panel)
   */
  drawNext(nextPairs) {
    const ctx = this.ctx;
    const x = this.panelRightX;
    let y = this.boardY;

    // パネル背景 / Panel background
    const panelW = this.canvas.width - 18 - x;
    const panelH = 200;

    ctx.save();
    ctx.shadowColor = 'rgba(21,101,192,0.15)';
    ctx.shadowBlur = 8;
    this._roundRect(ctx, x - 4, y - 24, panelW + 8, panelH, 10);
    ctx.fillStyle = 'rgba(227,242,253,0.85)';
    ctx.fill();
    ctx.restore();

    this._roundRect(ctx, x - 4, y - 24, panelW + 8, panelH, 10);
    ctx.strokeStyle = 'rgba(21,101,192,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // "NEXT" ラベル / "NEXT" label
    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 12px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT', x + panelW / 2, y - 10);

    for (let i = 0; i < nextPairs.length && i < 2; i++) {
      const pair = nextPairs[i];
      const scale = i === 0 ? 0.8 : 0.6;
      const blockSize = this.cellSize * scale;

      const bx = x + (panelW - blockSize) / 2 - 4;

      // サブブロック（上）
      this._drawMiniBlock(ctx, bx, y + 8, blockSize, pair.sub);
      // メインブロック（下）
      this._drawMiniBlock(ctx, bx, y + 8 + blockSize, blockSize, pair.main);

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
      const tintedImg = this.maroBlockTinted[block.colorIndex];
      if (tintedImg) {
        const drawSize = size * 1.2;
        const drawOffset = (size - drawSize) / 2;
        ctx.drawImage(tintedImg, 0, 0, tintedImg.width, tintedImg.height,
          x + drawOffset, y + drawOffset, drawSize, drawSize);
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
    }

    ctx.restore();
  }

  /**
   * コンボオーバーレイ描画 / Draw combo overlay on board
   */
  drawComboOverlay(combo, scoreLoss) {
    if (combo <= 0) return;

    const ctx = this.ctx;
    const boardCenterX = this.boardX + this.boardWidth / 2;

    // コンボテキスト（グロー付き） / Combo text with glow
    ctx.save();
    ctx.shadowColor = 'rgba(255,82,82,0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(combo + ' COMBO!', boardCenterX, this.boardY - 10);
    ctx.restore();

    // スコア減少表示 / Score loss display
    ctx.fillStyle = '#FF8A80';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('-' + scoreLoss.toLocaleString() + 'pts', boardCenterX, this.boardY - 28);
  }

  /**
   * 充填率メーター描画 / Draw fill rate meter (modernized)
   */
  drawFillMeter(fillRatio) {
    const ctx = this.ctx;
    const x = 15;
    const y = this.boardY + 100;
    const width = 14;
    const height = this.boardHeight - 120;

    // ラベル / Label
    ctx.fillStyle = '#546E7A';
    ctx.font = 'bold 9px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FILL', 0, -2);
    ctx.restore();

    // 枠 / Frame
    this._roundRect(ctx, x, y, width, height, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(21,101,192,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // メーター / Meter fill
    const fillHeight = height * fillRatio;
    if (fillHeight > 1) {
      ctx.save();
      this._roundRect(ctx, x + 1, y + 1, width - 2, height - 2, 3);
      ctx.clip();

      const grad = ctx.createLinearGradient(x, y + height - fillHeight, x, y + height);
      grad.addColorStop(0, '#4CAF50');
      grad.addColorStop(0.7, '#FFEB3B');
      grad.addColorStop(1, '#F44336');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + height - fillHeight, width - 2, fillHeight);
      ctx.restore();
    }
  }

  /**
   * 操作ヒント描画 / Draw controls hint (bottom)
   */
  drawControlsHint() {
    const ctx = this.ctx;
    const y = this.boardY + this.boardHeight + 16;
    const centerX = this.boardX + this.boardWidth / 2;

    ctx.fillStyle = '#78909C';
    ctx.font = '10px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
      ctx.fillText('右フリック: 右移動　　画面右側をタッチ: 右回転', centerX, y);
      ctx.fillText('左フリック: 左移動　　画面左側をタッチ: 左回転', centerX, y + 14);
      ctx.fillText('下フリック: 高速移動', centerX, y + 28);
    } else {
      ctx.fillText('← → : 移動　↑ : 回転　↓ : 高速落下', centerX, y);
      ctx.fillText('Space : ハードドロップ　P/ESC : ポーズ', centerX, y + 14);
    }
  }

  /**
   * パーティクル追加 / Add particles (UNCHANGED)
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
   * パーティクル更新・描画 / Update and draw particles (UNCHANGED)
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
   * 画面シェイク / Screen shake (UNCHANGED)
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
   * フラッシュエフェクト / Flash effect (UNCHANGED)
   */
  drawFlash() {
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = 'rgba(255,255,255,' + this.flashAlpha + ')';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.flashAlpha *= 0.9;
      if (this.flashAlpha < 0.01) this.flashAlpha = 0;
    }
  }

  /**
   * タイトル画面描画 / Draw title screen (modernized)
   */
  drawTitleScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // タイトルテキスト / Title text
    ctx.save();
    ctx.shadowColor = 'rgba(21,101,192,0.4)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#D32F2F';
    ctx.font = 'bold 34px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('地雷ちゃんパズル', w / 2, h * 0.22);
    ctx.restore();

    ctx.fillStyle = '#F57F17';
    ctx.font = 'bold 20px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('〜底辺ぷよぷよ〜', w / 2, h * 0.30);

    // 装飾ライン / Decorative line
    const lineY = h * 0.34;
    const lineGrad = ctx.createLinearGradient(w * 0.2, lineY, w * 0.8, lineY);
    lineGrad.addColorStop(0, 'rgba(21,101,192,0)');
    lineGrad.addColorStop(0.5, 'rgba(21,101,192,0.4)');
    lineGrad.addColorStop(1, 'rgba(21,101,192,0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, lineY);
    ctx.lineTo(w * 0.8, lineY);
    ctx.stroke();

    // スタートボタン / Start button (modernized)
    const btnW = 220;
    const btnH = 56;
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.45 - btnH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(211,47,47,0.4)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    this._roundRect(ctx, btnX, btnY, btnW, btnH, 14);
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#EF5350');
    btnGrad.addColorStop(1, '#C62828');
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.restore();

    // Button highlight
    this._roundRect(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner highlight line
    ctx.beginPath();
    ctx.moveTo(btnX + 20, btnY + 2);
    ctx.lineTo(btnX + btnW - 20, btnY + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶  START', w / 2, btnY + btnH / 2);

    // ルール説明パネル / Rules panel
    const rulesY = h * 0.56;
    const rulesH = 100;
    this._roundRect(ctx, 30, rulesY, w - 60, rulesH, 10);
    ctx.fillStyle = 'rgba(227,242,253,0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(21,101,192,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 13px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 遊び方', w / 2, rulesY + 18);

    ctx.fillStyle = '#37474F';
    ctx.font = '11px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillText('同じ色のブロックが隣り合うと消えてスコアが減る！', w / 2, rulesY + 40);
    ctx.fillText('色を合わせないように積んで画面を埋めよう！', w / 2, rulesY + 56);
    ctx.fillText('底辺たちの発言をブロックで隠すのが真の目的！', w / 2, rulesY + 72);
    ctx.fillText('💡 ルールは自分で見つけるのが楽しい！', w / 2, rulesY + 88);

    // 操作説明 / Controls
    ctx.fillStyle = '#78909C';
    ctx.font = '11px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = 'center';

    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
      ctx.fillText('STARTをタップしてゲーム開始！', w / 2, h * 0.85);
      ctx.fillText('スワイプで移動、タップで回転', w / 2, h * 0.89);
    } else {
      ctx.fillText('← → : 移動　↑ : 回転　↓ : 高速落下　Space : ハードドロップ', w / 2, h * 0.85);
      ctx.fillText('STARTをクリック or Enterキーでゲーム開始', w / 2, h * 0.89);
    }
  }

  /**
   * ゲームオーバー画面 / Game over screen (modernized)
   */
  drawGameOverScreen(score) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // オーバーレイ / Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, w, h);

    // 中央パネル / Center panel
    const panelW = 320;
    const panelH = 280;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2 - 20;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fillStyle = 'rgba(20,20,40,0.95)';
    ctx.fill();
    ctx.restore();

    this._roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.strokeStyle = 'rgba(255,82,82,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // タイトル / Title
    ctx.save();
    ctx.shadowColor = 'rgba(255,82,82,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', w / 2, panelY + 45);
    ctx.restore();

    // 装飾ライン / Decorative line
    ctx.strokeStyle = 'rgba(255,82,82,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 30, panelY + 70);
    ctx.lineTo(panelX + panelW - 30, panelY + 70);
    ctx.stroke();

    // スコアラベル / Score label
    ctx.fillStyle = '#90CAF9';
    ctx.font = 'bold 14px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.fillText('最終スコア / Final Score', w / 2, panelY + 100);

    // スコア / Score
    ctx.save();
    ctx.shadowColor = 'rgba(79,195,247,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#4FC3F7';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText(score.toLocaleString() + ' pts', w / 2, panelY + 135);
    ctx.restore();

    // ヒント / Hints
    ctx.fillStyle = '#FFD54F';
    ctx.font = '12px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillText('ヒント：同じ色を消すとスコアが減るよ…', w / 2, panelY + 175);
    ctx.fillText('本当の勝利は…画面を埋め尽くすこと！？', w / 2, panelY + 195);

    // リトライ / Retry
    ctx.fillStyle = '#B0BEC5';
    ctx.font = '14px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.fillText('Enter / タップでタイトルに戻る', w / 2, panelY + 240);
  }

  /**
   * 勝利画面 / Win screen (modernized)
   */
  drawWinScreen(score) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // オーバーレイ / Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    // 中央パネル / Center panel
    const panelW = 320;
    const panelH = 300;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2 - 20;

    ctx.save();
    ctx.shadowColor = 'rgba(255,215,64,0.3)';
    ctx.shadowBlur = 24;
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fillStyle = 'rgba(20,20,40,0.95)';
    ctx.fill();
    ctx.restore();

    this._roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.strokeStyle = 'rgba(255,215,64,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // タイトル / Title
    ctx.save();
    ctx.shadowColor = 'rgba(255,215,64,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 30px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 勝利！ 🎉', w / 2, panelY + 40);
    ctx.restore();

    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 16px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('画面を埋め尽くした！', w / 2, panelY + 75);

    // 装飾ライン
    ctx.strokeStyle = 'rgba(255,215,64,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 30, panelY + 95);
    ctx.lineTo(panelX + panelW - 30, panelY + 95);
    ctx.stroke();

    // スコアラベル
    ctx.fillStyle = '#90CAF9';
    ctx.font = 'bold 14px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.fillText('残りスコア / Remaining Score', w / 2, panelY + 120);

    // スコア
    ctx.save();
    ctx.shadowColor = 'rgba(79,195,247,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#4FC3F7';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText(score.toLocaleString() + ' pts', w / 2, panelY + 155);
    ctx.restore();

    // メッセージ
    ctx.fillStyle = '#FF8A80';
    ctx.font = '12px "Segoe UI", "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillText('※ルールは「色を合わせない」ことだったのだ！', w / 2, panelY + 200);
    ctx.fillText('底辺の発言をブロックで隠すのが真の目的！', w / 2, panelY + 218);

    // リトライ
    ctx.fillStyle = '#B0BEC5';
    ctx.font = '14px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.fillText('Enter / タップでタイトルに戻る', w / 2, panelY + 265);
  }

  /**
   * ポーズ画面 / Pause screen (modernized)
   */
  drawPauseScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);

    // 中央パネル / Center panel
    const panelW = 200;
    const panelH = 100;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 15;
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.fillStyle = 'rgba(20,20,40,0.92)';
    ctx.fill();
    ctx.restore();

    this._roundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.strokeStyle = 'rgba(144,202,249,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSE', w / 2, panelY + 38);

    ctx.fillStyle = '#90CAF9';
    ctx.font = '13px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.fillText('P / ESCで再開', w / 2, panelY + 70);
  }

}
