/**
 * ゲーム定数・設定 / Game Constants & Configuration
 * 地雷ちゃんパズルゲーム
 */

const CONSTANTS = {
  // ボード設定 / Board settings
  COLS: 6,
  ROWS: 13,          // 12 visible + 1 hidden top row
  VISIBLE_ROWS: 12,
  CELL_SIZE: 48,

  // 初期スコア（加算式スコアの開始値） / Initial score for gain-based scoring
  INITIAL_SCORE: 0,

  // スコア加算 / Score gain
  BASE_SCORE_GAIN: 100,
  COMBO_BONUS_MULTIPLIER: 1,

  // ゲーム速度 / Game speed (ms)
  INITIAL_DROP_INTERVAL: 800,
  MIN_DROP_INTERVAL: 100,
  SPEED_INCREASE_PER_LEVEL: 50,
  SOFT_DROP_SPEED: 50,
  LOCK_DELAY: 500,

  // 連鎖最小数 / Minimum blocks for chain (Puyo style)
  MIN_CHAIN_SIZE: 4,

  // 特殊ブロック出現率 / Special block spawn rate
  KICHIGAI_CHANCE: 0.0, // Disabled for standard puyo-like gameplay

  // アニメーション / Animation
  CLEAR_ANIMATION_DURATION: 500,
  CHAIN_DELAY: 300,

  // 背景テキスト / Background text
  BG_TEXT_SPEED: 0.5,
  BG_TEXT_INTERVAL: 3000,

  // 勝利条件：ボード充填率 / Win condition: board fill ratio
  WIN_FILL_RATIO: 0.85,

  // キャラクター定義 / Character definitions
  CHARACTERS: {
    maro: {
      name: '麻呂',
      nameEn: 'Maro',
      svg: 'assets/svg/maro.svg',
      img: 'assets/img/maro_block.png',
      blockType: '地雷',
      description: '麻呂マイン'
    },
    amanatsu: {
      name: 'あまなつ',
      nameEn: 'Amanatsu',
      svg: 'assets/svg/amanatsu.svg',
      blockType: 'みかん',
      description: 'みかんブロック'
    },
    king: {
      name: '王',
      nameEn: 'King',
      svg: 'assets/svg/king.svg',
      blockType: '将棋',
      description: '反日将棋ブロック'
    },
    shigeru: {
      name: 'しげる',
      nameEn: 'Shigeru',
      svg: 'assets/svg/shigeru.svg',
      blockType: '入れ歯',
      description: '入れ歯ブロック'
    },
    chin: {
      name: 'チン',
      nameEn: 'Chin',
      svg: 'assets/svg/chin.svg',
      blockType: 'キノコ',
      description: 'キノコブロック'
    }
  },

  // ブロック色定義 / Block color definitions
  COLORS: [
    { name: '赤', nameEn: 'red', hex: '#ff4444', dark: '#cc0000' },
    { name: '青', nameEn: 'blue', hex: '#4488ff', dark: '#0044cc' },
    { name: '緑', nameEn: 'green', hex: '#44cc44', dark: '#008800' },
    { name: '黄', nameEn: 'yellow', hex: '#ffdd44', dark: '#ccaa00' },
    { name: 'オレンジ', nameEn: 'orange', hex: '#ff8844', dark: '#cc5500' },
    { name: '紫', nameEn: 'purple', hex: '#aa44ff', dark: '#7700cc' }
  ],

  // UI色 / UI colors
  SCORE_DELTA_POSITIVE_COLOR: '#81C784',
  SCORE_DELTA_NEGATIVE_COLOR: '#FF8A80',

  // 4方向 / 4 directions (orthogonal only)
  DIRECTIONS: [
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: 0, dy: 1 }
  ],

  // 背景会話テキスト / Background conversation texts
  BG_CONVERSATIONS: [
    // 麻呂の発言
    '麻呂「金は天下の回りもの…麻呂の周りだけ回ってこぬのじゃ」',
    '麻呂「今月の家賃がまだ…おじゃる」',
    '麻呂「カップ麺こそ至高の食事でおじゃる」',
    '麻呂「働いたら負けでおじゃるな…」',
    // あまなつの発言
    'あまなつ「みかん食べたいな～でもお金ない～」',
    'あまなつ「今日もバイト落ちた…」',
    'あまなつ「家賃3ヶ月滞納してるけどまぁいっか」',
    'あまなつ「夢は…みかん農園のオーナー！（無理）」',
    // 王の発言
    '王「俺が王だ！（自称）」',
    '王「将棋で人生逆転するぞ」',
    '王「銀行？行ったことないな（口座がない）」',
    '王「反日ってか反社会だろ俺は」',
    // しげるの発言
    'しげる「入れ歯なくした…3個目」',
    'しげる「年金まだか？」',
    'しげる「若い頃はワシもモテたんじゃ（嘘）」',
    'しげる「カレーに入れ歯入ってた件」',
    // チンの発言
    'チン「キノコは正義」',
    'チン「今日も元気にキノコ！」',
    'チン「お前もキノコにしてやろうか」',
    'チン「借金？キノコで返す（意味不明）」',
    // 現金輸送車・銀行系
    '《現金輸送車が走っている…》',
    '《銀行のATMが故障中…》',
    '《速報：また底辺が何かやらかした》',
    '《警備員「あの集団から目を離すな」》',
    '《防犯カメラ映像を確認中…》',
  ],

  // ゲーム状態 / Game states
  STATE: {
    TITLE: 'title',
    PLAYING: 'playing',
    CHAIN_ANIMATION: 'chain_animation',
    GAME_OVER: 'game_over',
    WIN: 'win'
  },

  // キー設定 / Key bindings
  KEYS: {
    LEFT: ['ArrowLeft', 'a', 'A'],
    RIGHT: ['ArrowRight', 'd', 'D'],
    DOWN: ['ArrowDown', 's', 'S'],
    ROTATE_CW: ['ArrowUp', 'w', 'W'],
    ROTATE_CCW: ['z', 'Z'],
    HARD_DROP: [' '],
    PAUSE: ['p', 'P', 'Escape']
  }
};

// Freeze to prevent modification
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.STATE);
Object.freeze(CONSTANTS.KEYS);
