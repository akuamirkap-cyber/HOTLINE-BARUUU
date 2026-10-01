let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let musicTimer: number | null = null;
let musicOn = true;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function initAudio() {
  ensure();
}

function noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'lowpass', delay = 0) {
  const c = ensure();
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number, delay = 0, dest?: AudioNode) {
  const c = ensure();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(dest || master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  shot(kind: string) {
    // crack (transient) + body + sub thump + tail
    if (kind === 'shotgun') {
      noise(0.05, 8000, 0.5, 1.0, 'highpass');
      noise(0.6, 1800, 0.6, 1.0);
      tone(110, 0.35, 1.0, 'sine', 28);
      tone(60, 0.5, 0.7, 'triangle', 25);
      noise(0.9, 500, 0.5, 0.35, 'lowpass', 0.05);
      tone(2600, 0.05, 0.12, 'square', 1800, 0.25); // pump click
      tone(1900, 0.05, 0.12, 'square', 1300, 0.36);
    } else if (kind === 'sniper') {
      noise(0.06, 9000, 0.5, 1.0, 'highpass');
      noise(0.5, 2200, 0.7, 1.0);
      tone(80, 0.5, 1.0, 'sine', 24);
      tone(45, 0.7, 0.8, 'triangle', 20);
      noise(1.4, 400, 0.5, 0.4, 'lowpass', 0.06);
      tone(1400, 0.04, 0.1, 'square', 900, 0.45); // bolt
      tone(1000, 0.05, 0.1, 'square', 700, 0.6);
    } else if (kind === 'uzi') {
      noise(0.03, 7000, 0.5, 0.6, 'highpass');
      noise(0.1, 3000, 0.8, 0.6);
      tone(180, 0.07, 0.6, 'square', 55);
    } else if (kind === 'rifle') {
      noise(0.04, 7500, 0.5, 0.8, 'highpass');
      noise(0.22, 2600, 0.8, 0.8);
      tone(130, 0.14, 0.8, 'sawtooth', 38);
      noise(0.4, 600, 0.5, 0.2, 'lowpass', 0.03);
    } else {
      noise(0.04, 7000, 0.5, 0.9, 'highpass');
      noise(0.25, 2400, 0.8, 0.9);
      tone(160, 0.16, 0.9, 'sine', 40);
      noise(0.5, 500, 0.5, 0.25, 'lowpass', 0.04);
    }
  },
  swing(heavy = false) {
    noise(heavy ? 0.25 : 0.12, heavy ? 900 : 1400, 2, heavy ? 0.5 : 0.3, 'bandpass');
    if (heavy) tone(220, 0.2, 0.1, 'sine', 90);
  },
  headshot() {
    tone(2400, 0.25, 0.25, 'square', 1800);
    tone(3600, 0.18, 0.12, 'sine', 3000, 0.03);
    tone(70, 0.3, 0.8, 'sine', 30);
  },
  hurt() {
    tone(160, 0.3, 0.7, 'sawtooth', 50);
    noise(0.2, 1200, 1, 0.6);
  },
  hostage() {
    tone(420, 0.12, 0.22, 'sine', 180);
    noise(0.1, 900, 1.2, 0.25, 'bandpass');
  },
  punch(step = 0) {
    const p = 1 + step * 0.15;
    tone(120 * p, 0.13, 0.9, 'sine', 40);
    noise(0.06, 1400 * p, 1, 0.7);
    noise(0.02, 6000, 0.5, 0.4, 'highpass');
  },
  kick() {
    tone(90, 0.28, 1.0, 'sine', 30);
    tone(55, 0.35, 0.7, 'triangle', 25);
    noise(0.12, 1000, 1, 0.9);
    noise(0.04, 7000, 0.5, 0.5, 'highpass');
  },
  slice() {
    noise(0.18, 5000, 3, 0.7, 'bandpass');
    tone(3200, 0.5, 0.12, 'sine', 2600);
    tone(4700, 0.35, 0.06, 'sine', 4100, 0.02);
    tone(140, 0.12, 0.5, 'sine', 50, 0.03);
  },
  slowIn() {
    tone(500, 0.5, 0.25, 'sawtooth', 70);
    noise(0.5, 900, 1, 0.3, 'lowpass');
    setMusicDuck(true);
  },
  slowOut() {
    tone(80, 0.35, 0.22, 'sawtooth', 420);
    setMusicDuck(false);
  },
  dash() {
    tone(92, 0.11, 0.24, 'sine', 42);
    noise(0.1, 650, 1.5, 0.18, 'bandpass');
  },
  hit() {
    tone(80, 0.18, 0.9, 'triangle', 30);
    noise(0.1, 1500, 1, 0.6);
  },
  shatter() {
    noise(0.5, 5000, 0.5, 0.5, 'highpass');
    for (let i = 0; i < 6; i++) tone(1800 + Math.random() * 3000, 0.15 + Math.random() * 0.2, 0.08, 'sine', undefined, Math.random() * 0.12);
    tone(70, 0.3, 0.7, 'sine', 30);
  },
  glass() {
    noise(0.4, 6000, 0.5, 0.45, 'highpass');
    for (let i = 0; i < 8; i++) tone(2500 + Math.random() * 4000, 0.2, 0.06, 'sine', undefined, Math.random() * 0.2);
  },
  door() {
    tone(70, 0.15, 0.6, 'square', 40);
    noise(0.1, 600, 1, 0.4);
  },
  pickup() {
    tone(900, 0.05, 0.25, 'square');
    tone(1400, 0.06, 0.2, 'square', undefined, 0.04);
  },
  empty() {
    tone(2200, 0.03, 0.2, 'square');
  },
  throwW() {
    noise(0.2, 800, 3, 0.3, 'bandpass');
  },
  death() {
    tone(200, 1.2, 0.6, 'sawtooth', 30);
    noise(0.8, 3000, 0.5, 0.5, 'highpass');
  },
  boom() {
    tone(45, 0.9, 1.0, 'sine', 18);
    tone(90, 0.6, 0.8, 'triangle', 25);
    noise(0.9, 1200, 0.4, 0.9, 'lowpass');
    noise(0.4, 4000, 0.5, 0.5, 'highpass');
  },
  clear() {
    [0, 0.12, 0.24].forEach((d, i) => tone([440, 554, 659][i], 0.5, 0.25, 'triangle', undefined, d));
  },
  voice(word: 'SUPER' | 'HOT') {
    // robotic pseudo-voice
    const base = word === 'SUPER' ? 140 : 110;
    tone(base, 0.28, 0.35, 'sawtooth', base * 0.8);
    tone(base * 2, 0.28, 0.12, 'square', base * 1.6);
    noise(0.08, 4000, 1, 0.2, 'highpass');
    if (word === 'SUPER') {
      tone(base * 1.2, 0.25, 0.3, 'sawtooth', base, 0.26);
    }
  },
};

// ---------- Music: dark pulsing synth loop ----------
const BPM = 112;
const bassNotes = [41.2, 41.2, 49, 41.2, 36.7, 36.7, 43.65, 38.9];
const arp = [329.6, 392, 493.9, 392, 293.7, 349.2, 440, 349.2];
let step = 0;
let nextTime = 0;

function scheduleMusic() {
  if (!ctx || !musicGain) return;
  const stepDur = 60 / BPM / 4;
  while (nextTime < ctx.currentTime + 0.2) {
    const bar = Math.floor(step / 16) % bassNotes.length;
    const s = step % 16;
    const t = nextTime;
    // kick
    if (s % 4 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g);
      g.connect(musicGain);
      o.start(t);
      o.stop(t + 0.3);
    }
    // bass on offbeats
    if (s % 2 === 1) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(600, t);
      f.frequency.exponentialRampToValueAtTime(120, t + stepDur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.2);
      o.frequency.value = bassNotes[bar] * 2;
      o.connect(f);
      f.connect(g);
      g.connect(musicGain);
      o.start(t);
      o.stop(t + stepDur * 1.3);
    }
    // hat
    if (s % 4 === 2) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(f);
      f.connect(g);
      g.connect(musicGain);
      src.start(t);
      src.stop(t + 0.06);
    }
    // arp
    if (s % 2 === 0) {
      const o = ctx.createOscillator();
      o.type = 'square';
      const g = ctx.createGain();
      const n = arp[(step / 2 + bar) % arp.length | 0] * (bar % 2 ? 0.75 : 1);
      o.frequency.value = n;
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.8);
      o.connect(g);
      g.connect(musicGain);
      o.start(t);
      o.stop(t + stepDur * 2);
    }
    nextTime += stepDur;
    step++;
  }
}

export function startMusic() {
  const c = ensure();
  if (musicTimer !== null) return;
  nextTime = c.currentTime + 0.1;
  musicTimer = window.setInterval(scheduleMusic, 50);
  if (musicGain) musicGain.gain.value = musicOn ? 0.22 : 0;
}

export function toggleMusic() {
  musicOn = !musicOn;
  if (musicGain) musicGain.gain.value = musicOn ? 0.22 : 0;
  return musicOn;
}

export function setMusicDuck(d: boolean) {
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(musicOn ? (d ? 0.06 : 0.22) : 0, ctx.currentTime, 0.2);
}
