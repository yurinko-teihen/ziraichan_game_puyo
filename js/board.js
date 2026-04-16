/**
 * ボード管理 / Board Management
 * グリッド状態、衝突判定、連鎖処理
 */

class Board {
  constructor() {
    this.grid = [];
    this.init();
  }

  /** ボード初期化 / Initialize board */
  init() {
    this.grid = [];
    for (let r = 0; r < CONSTANTS.ROWS; r++) {
      this.grid.push(new Array(CONSTANTS.COLS).fill(null));
    }
  }

  /** セル取得 / Get cell */
  getCell(col, row) {
    if (col < 0 || col >= CONSTANTS.COLS || row < 0 || row >= CONSTANTS.ROWS) {
      return undefined; // 範囲外
    }
    return this.grid[row][col];
  }

  /** セル設定 / Set cell */
  setCell(col, row, block) {
    if (col >= 0 && col < CONSTANTS.COLS && row >= 0 && row < CONSTANTS.ROWS) {
      this.grid[row][col] = block;
    }
  }

  /** 空きセルか判定 / Is cell empty */
  isEmpty(col, row) {
    if (col < 0 || col >= CONSTANTS.COLS || row < 0 || row >= CONSTANTS.ROWS) {
      return false;
    }
    return this.grid[row][col] === null;
  }

  /** 範囲内か判定 / Is in bounds */
  isInBounds(col, row) {
    return col >= 0 && col < CONSTANTS.COLS && row >= 0 && row < CONSTANTS.ROWS;
  }

  /**
   * 落下ペアの衝突判定 / Check collision for falling pair
   * @param {FallingPair} pair
   * @param {number} dc - 列オフセット
   * @param {number} dr - 行オフセット
   * @param {number} [newRotation] - 新しい回転
   * @returns {boolean} 衝突するか
   */
  checkCollision(pair, dc = 0, dr = 0, newRotation = null) {
    const oldRotation = pair.rotation;
    if (newRotation !== null) {
      pair.rotation = newRotation;
    }

    const positions = pair.getPositions();
    pair.rotation = oldRotation;

    for (const pos of positions) {
      const newCol = pos.col + dc;
      const newRow = pos.row + dr;
      if (!this.isInBounds(newCol, newRow) || this.grid[newRow][newCol] !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * ペアを固定 / Lock pair onto board
   * @param {FallingPair} pair
   * @returns {Array} 配置されたブロック位置
   */
  lockPair(pair) {
    const positions = pair.getPositions();
    const placed = [];

    for (const pos of positions) {
      if (this.isInBounds(pos.col, pos.row)) {
        this.setCell(pos.col, pos.row, pos.block);
        placed.push({ col: pos.col, row: pos.row, block: pos.block });
      }
    }

    return placed;
  }

  /**
   * 重力適用 / Apply gravity
   * @returns {boolean} ブロックが移動したか
   */
  applyGravity() {
    let moved = false;
    for (let col = 0; col < CONSTANTS.COLS; col++) {
      for (let row = CONSTANTS.ROWS - 2; row >= 0; row--) {
        if (this.grid[row][col] !== null && this.grid[row + 1][col] === null) {
          // 下に空きがあれば落とす
          let targetRow = row + 1;
          while (targetRow + 1 < CONSTANTS.ROWS && this.grid[targetRow + 1][col] === null) {
            targetRow++;
          }
          this.grid[targetRow][col] = this.grid[row][col];
          this.grid[row][col] = null;
          moved = true;
        }
      }
    }
    return moved;
  }

  /**
   * 連鎖チェック（8方向） / Check chains (8-directional)
   * 同色の隣接ブロック群を検出
   * @returns {Array<Array>} 消去するグループのリスト
   */
  findChains() {
    const visited = Array.from({ length: CONSTANTS.ROWS }, () =>
      new Array(CONSTANTS.COLS).fill(false)
    );
    const chains = [];

    for (let row = 1; row < CONSTANTS.ROWS; row++) { // row 0 is hidden
      for (let col = 0; col < CONSTANTS.COLS; col++) {
        const block = this.grid[row][col];
        if (!block || block.isStone || block.isSpecial || visited[row][col]) continue;

        // BFS for connected same-color blocks
        const group = [];
        const queue = [{ col, row }];
        visited[row][col] = true;

        while (queue.length > 0) {
          const current = queue.shift();
          group.push(current);

          for (const dir of CONSTANTS.DIRECTIONS) {
            const nc = current.col + dir.dx;
            const nr = current.row + dir.dy;

            if (!this.isInBounds(nc, nr) || visited[nr][nc]) continue;
            const neighbor = this.grid[nr][nc];
            if (!neighbor || neighbor.isStone || neighbor.isSpecial) continue;
            if (neighbor.colorIndex === block.colorIndex) {
              visited[nr][nc] = true;
              queue.push({ col: nc, row: nr });
            }
          }
        }

        if (group.length >= CONSTANTS.MIN_CHAIN_SIZE) {
          chains.push({
            blocks: group,
            colorIndex: block.colorIndex,
            size: group.length
          });
        }
      }
    }

    return chains;
  }

  /**
   * ブロック消去 / Clear blocks
   * @param {Array} chains - findChains()の結果
   * @returns {number} 消去されたブロック数
   */
  clearChains(chains) {
    let cleared = 0;
    for (const chain of chains) {
      for (const pos of chain.blocks) {
        this.grid[pos.row][pos.col] = null;
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * 基地ガイブロック処理 / Handle Kichigai blocks
   * @param {Array} placedPositions - 配置されたブロック
   * @returns {Object} 処理結果
   */
  handleSpecialBlocks(placedPositions) {
    const results = {
      petrified: [],
      sentBlocks: []
    };

    for (const pos of placedPositions) {
      const block = this.grid[pos.row][pos.col];
      if (!block || !block.isSpecial) continue;

      // ランダムで石化 or ブロック送り
      if (Math.random() < 0.5) {
        // 周囲のブロックを石化
        for (const dir of CONSTANTS.DIRECTIONS) {
          const nc = pos.col + dir.dx;
          const nr = pos.row + dir.dy;
          const neighbor = this.getCell(nc, nr);
          if (neighbor && !neighbor.isStone && !neighbor.isSpecial) {
            neighbor.petrify();
            results.petrified.push({ col: nc, row: nr });
          }
        }
        // 自分自身も石化
        block.petrify();
        results.petrified.push(pos);
      } else {
        // ランダム3列にブロックを送る（将来の対戦用）
        const cols = [];
        while (cols.length < 3) {
          const c = Math.floor(Math.random() * CONSTANTS.COLS);
          if (!cols.includes(c)) cols.push(c);
        }
        results.sentBlocks = cols;
        // 自分のフィールドにゴミブロック追加
        for (const c of cols) {
          for (let r = CONSTANTS.ROWS - 1; r >= 1; r--) {
            if (this.grid[r][c] === null) {
              const garbageColor = Math.floor(Math.random() * CONSTANTS.COLORS.length);
              this.grid[r][c] = new Block(garbageColor);
              break;
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * ボード充填率を計算 / Calculate board fill ratio
   * @returns {number} 0.0 ~ 1.0
   */
  getFillRatio() {
    let filled = 0;
    let total = 0;
    for (let row = 1; row < CONSTANTS.ROWS; row++) { // Skip hidden row
      for (let col = 0; col < CONSTANTS.COLS; col++) {
        total++;
        if (this.grid[row][col] !== null) filled++;
      }
    }
    return filled / total;
  }

  /**
   * ゲームオーバー判定 / Check game over
   * 隠し行にブロックがあればゲームオーバー
   * @returns {boolean}
   */
  isGameOver() {
    for (let col = 0; col < CONSTANTS.COLS; col++) {
      if (this.grid[0][col] !== null) return true;
    }
    // Also check if spawn area (row 0-1, col 2-3) is blocked
    const spawnCol = Math.floor(CONSTANTS.COLS / 2) - 1;
    if (this.grid[0][spawnCol] !== null || this.grid[0][spawnCol + 1] !== null) return true;
    return false;
  }

  /**
   * 勝利判定 / Check win condition
   * 充填率がしきい値を超えたら勝利
   * @returns {boolean}
   */
  isWin() {
    return this.getFillRatio() >= CONSTANTS.WIN_FILL_RATIO;
  }
}
