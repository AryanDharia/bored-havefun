import { sounds } from '../../lib/audio';

class MoonshotAudioEngine {
  private ctx: AudioContext | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustGain: GainNode | null = null;
  private isThrustPlaying = false;

  private initCtx(): AudioContext | null {
    if (!sounds.isEnabled()) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setThrust(active: boolean) {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) {
      this.stopThrust();
      return;
    }

    if (active && !this.isThrustPlaying) {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Low rumble triangle with modulation
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(65, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.07, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        this.thrustOsc = osc;
        this.thrustGain = gain;
        this.isThrustPlaying = true;
      } catch {
        this.isThrustPlaying = false;
      }
    } else if (!active && this.isThrustPlaying) {
      this.stopThrust();
    }
  }

  private stopThrust() {
    if (this.thrustGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.thrustGain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        if (this.thrustOsc) {
          this.thrustOsc.stop(now + 0.05);
        }
      } catch {}
    }
    this.thrustOsc = null;
    this.thrustGain = null;
    this.isThrustPlaying = false;
  }

  playShoot() {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Classic Flash arcade laser pitch drop
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  playGear(deployed: boolean) {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      // Mechanical clank
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(deployed ? 280 : 360, now);
      osc.frequency.setValueAtTime(deployed ? 420 : 220, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  playHit() {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.06);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  playExplode() {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      // Deep explosion with noise burst feel
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playLandingSuccess() {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      // Ascending 3-tone chime (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {}
  }

  playCrash() {
    this.stopThrust();
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      // Heavy crunchy dual-tone explosion
      const freqs = [180, 115, 65];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.38);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
      });
    } catch {}
  }

  playRefuelTick() {
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.03);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  playLevelClear() {
    this.stopThrust();
    const ctx = this.initCtx();
    if (!ctx || !sounds.isEnabled()) return;
    try {
      const now = ctx.currentTime;
      // Triumphant arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {}
  }
}

export const moonshotAudio = new MoonshotAudioEngine();
