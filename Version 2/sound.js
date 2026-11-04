// ============================================================================
// RETRO WEB AUDIO SYNTHESIZER (VERSION 2 - WITH POWER-UP SFX)
// ============================================================================

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, gainVal = 0.12, delay = 0, slideTo = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playClick() {
    this.playTone(520, "triangle", 0.05, 0.08);
  }

  playRoundStart() {
    this.playTone(440, "square", 0.08, 0.08, 0);
    this.playTone(660, "square", 0.14, 0.1, 0.09);
  }

  playPowerupSpawn() {
    this.playTone(587.33, "sine", 0.07, 0.05, 0, 880);
  }

  playPowerupPickup(targetType) {
    if (targetType === "others") {
      // Aggressive green attack arpeggio
      this.playTone(330, "sawtooth", 0.07, 0.09, 0);
      this.playTone(440, "sawtooth", 0.07, 0.09, 0.06);
      this.playTone(659.25, "sawtooth", 0.14, 0.1, 0.12);
    } else {
      // Shimmering red self-powerup chime
      this.playTone(523.25, "triangle", 0.08, 0.1, 0, 783.99);
      this.playTone(783.99, "triangle", 0.14, 0.11, 0.07, 1046.5);
    }
  }

  playCrash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    this.playTone(150, "sawtooth", 0.22, 0.16, 0, 38);

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 600;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playRoundEnd() {
    this.playTone(392, "triangle", 0.11, 0.1, 0);
    this.playTone(523.25, "triangle", 0.18, 0.12, 0.1);
  }

  playMatchWin() {
    const notes = [
      { f: 523.25, d: 0.12, t: 0.0 },
      { f: 659.25, d: 0.12, t: 0.13 },
      { f: 783.99, d: 0.12, t: 0.26 },
      { f: 1046.5, d: 0.35, t: 0.39 },
    ];
    notes.forEach((n) => this.playTone(n.f, "square", n.d, 0.12, n.t));
  }
}

window.soundFX = new SoundManager();
