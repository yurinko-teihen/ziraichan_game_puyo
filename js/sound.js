/**
 * サウンドマネージャー / Sound Manager
 * Web Audio APIを使用したサウンドエフェクト
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
  }

  _getContext() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        this.enabled = false;
      }
    }
    return this.ctx;
  }

  _playTone(frequency, duration, type = 'square', volumeOverride = null) {
    if (!this.enabled) return;
    const ctx = this._getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volumeOverride || this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /** ブロック移動音 / Block move sound */
  playMove() {
    this._playTone(200, 0.05, 'square', 0.1);
  }

  /** ブロック回転音 / Block rotate sound */
  playRotate() {
    this._playTone(400, 0.08, 'sine', 0.15);
  }

  /** ブロック着地音 / Block land sound */
  playLand() {
    this._playTone(150, 0.15, 'triangle', 0.2);
  }

  /** ブロック消去音 / Block clear sound */
  playClear(combo = 1) {
    const baseFreq = 300 + combo * 100;
    this._playTone(baseFreq, 0.2, 'sine', 0.25);
    setTimeout(() => {
      this._playTone(baseFreq * 1.25, 0.15, 'sine', 0.2);
    }, 80);
  }

  /** コンボ音 / Combo sound */
  playCombo(comboCount) {
    const freq = 400 + comboCount * 150;
    this._playTone(freq, 0.3, 'sawtooth', 0.2);
  }

  /** 基地ガイブロック音 / Kichigai block sound */
  playSpecial() {
    this._playTone(100, 0.5, 'sawtooth', 0.3);
    setTimeout(() => this._playTone(80, 0.3, 'square', 0.2), 200);
  }

  /** ゲームオーバー音 / Game over sound */
  playGameOver() {
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.25), i * 200);
    });
  }

  /** 勝利音 / Win sound */
  playWin() {
    const notes = [300, 400, 500, 600, 800];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.25), i * 150);
    });
  }

  /** ハードドロップ音 / Hard drop sound */
  playHardDrop() {
    this._playTone(100, 0.2, 'square', 0.25);
  }

  /** トグル / Toggle sound */
  toggle() {
    this.enabled = !this.enabled;
  }
}
