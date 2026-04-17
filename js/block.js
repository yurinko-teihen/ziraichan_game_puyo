/**
 * ブロック定義 / Block definitions
 * 落下ペアとブロック状態の管理
 */

// キャラクターIDの一覧をキャッシュ / Cache character ID list
const CHARACTER_KEYS = Object.keys(CONSTANTS.CHARACTERS);

class Block {
  /**
   * @param {number} colorIndex - CONSTANTS.COLORSのインデックス
   * @param {boolean} isSpecial - 基地ガイブロックか
   * @param {boolean} isStone - 石化したブロックか
   */
  constructor(colorIndex, isSpecial = false, isStone = false) {
    this.colorIndex = colorIndex;
    this.isSpecial = isSpecial;
    this.isStone = isStone;
    this.isClearing = false;
    this.clearTimer = 0;
    // ミックスデザイン：各ブロックにランダムなキャラクターを割り当て
    this.characterId = CHARACTER_KEYS[Math.floor(Math.random() * CHARACTER_KEYS.length)];
  }

  get color() {
    if (this.isStone) return { name: '石', nameEn: 'stone', hex: '#9e9e9e', dark: '#616161' };
    if (this.isSpecial) return { name: '基地ガイ', nameEn: 'kichigai', hex: '#666666', dark: '#333333' };
    return CONSTANTS.COLORS[this.colorIndex];
  }

  /** 石化する / Petrify */
  petrify() {
    this.isStone = true;
    this.isSpecial = false;
  }

  /** クローン / Clone */
  clone() {
    const b = new Block(this.colorIndex, this.isSpecial, this.isStone);
    b.isClearing = this.isClearing;
    b.clearTimer = this.clearTimer;
    b.characterId = this.characterId;
    return b;
  }
}

/**
 * 落下ペア / Falling Pair
 * 2つのブロックが連結して落ちる（ぷよぷよ風）
 */
class FallingPair {
  /**
   * @param {Block} main - メインブロック（下）
   * @param {Block} sub - サブブロック（上）
   */
  constructor(main, sub) {
    this.main = main;
    this.sub = sub;
    // メインブロックの位置 / Main block position
    this.col = Math.floor(CONSTANTS.COLS / 2) - 1;
    this.row = 0;
    // サブブロックの相対位置 / Sub block relative position
    // rotation: 0=上, 1=右, 2=下, 3=左
    this.rotation = 0;
    // 落下タイマー / Drop timer
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.isLocking = false;
  }

  /** サブブロックの位置を取得 / Get sub block position */
  getSubPosition() {
    const offsets = [
      { dc: 0, dr: -1 }, // 上 / Up
      { dc: 1, dr: 0 },  // 右 / Right
      { dc: 0, dr: 1 },  // 下 / Down
      { dc: -1, dr: 0 }  // 左 / Left
    ];
    const offset = offsets[this.rotation];
    return {
      col: this.col + offset.dc,
      row: this.row + offset.dr
    };
  }

  /** 時計回り回転 / Rotate clockwise */
  rotateCW() {
    this.rotation = (this.rotation + 1) % 4;
  }

  /** 反時計回り回転 / Rotate counter-clockwise */
  rotateCCW() {
    this.rotation = (this.rotation + 3) % 4;
  }

  /** 全ブロック位置を返す / Get all block positions */
  getPositions() {
    const sub = this.getSubPosition();
    return [
      { col: this.col, row: this.row, block: this.main },
      { col: sub.col, row: sub.row, block: this.sub }
    ];
  }
}

/**
 * ネクストピース生成器 / Next piece generator
 */
class PieceGenerator {
  constructor() {
    this.nextQueue = [];
    this._fillQueue();
  }

  _fillQueue() {
    while (this.nextQueue.length < 3) {
      this.nextQueue.push(this._generatePair());
    }
  }

  _generatePair() {
    const colorCount = CONSTANTS.COLORS.length;

    // 基地ガイブロックの出現判定
    const isSpecial1 = Math.random() < CONSTANTS.KICHIGAI_CHANCE;
    const isSpecial2 = Math.random() < CONSTANTS.KICHIGAI_CHANCE;

    const main = new Block(
      Math.floor(Math.random() * colorCount),
      isSpecial1
    );
    const sub = new Block(
      Math.floor(Math.random() * colorCount),
      isSpecial2
    );

    return new FallingPair(main, sub);
  }

  /** 次のペアを取得 / Get next pair */
  getNext() {
    const pair = this.nextQueue.shift();
    this._fillQueue();
    return pair;
  }

  /** プレビュー取得 / Get preview */
  peekNext(count = 2) {
    return this.nextQueue.slice(0, count);
  }
}
