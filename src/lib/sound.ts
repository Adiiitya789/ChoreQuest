export type SfxKind =
  | 'swipe'
  | 'combo'
  | 'undo'
  | 'levelUp'
  | 'questDone'
  | 'bossDefeated'
  | 'laser'
  | 'explode'
  | 'impact'
  | 'gameOver';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!audioContext) audioContext = new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  glideTo?: number,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime + start;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, t);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, t + duration);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(t);
  oscillator.stop(t + duration + 0.02);
}

function noise(ctx: AudioContext, start: number, duration: number, volume: number, cutoff: number) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime + start);
}

const SEQUENCES: Record<SfxKind, (ctx: AudioContext) => void> = {
  laser: (ctx) => tone(ctx, 1500, 0, 0.14, 'sawtooth', 0.05, 260),
  explode: (ctx) => {
    noise(ctx, 0.02, 0.45, 0.35, 1400);
    tone(ctx, 140, 0.02, 0.35, 'sine', 0.18, 45);
  },
  impact: (ctx) => {
    noise(ctx, 0, 0.6, 0.45, 600);
    tone(ctx, 180, 0, 0.45, 'square', 0.08, 50);
  },
  gameOver: (ctx) => {
    [523, 415, 330, 262].forEach((freq, i) => tone(ctx, freq, i * 0.16, 0.35, 'triangle', 0.13));
  },
  swipe: (ctx) => tone(ctx, 520, 0, 0.12, 'triangle', 0.15, 880),
  combo: (ctx) => {
    [660, 880, 1100].forEach((freq, i) => tone(ctx, freq, i * 0.07, 0.18, 'square', 0.08));
  },
  undo: (ctx) => tone(ctx, 880, 0, 0.18, 'sine', 0.15, 440),
  levelUp: (ctx) => {
    [523, 659, 784, 1046].forEach((freq, i) => tone(ctx, freq, i * 0.1, 0.35, 'triangle', 0.14));
  },
  questDone: (ctx) => {
    tone(ctx, 784, 0, 0.12, 'sine', 0.14);
    tone(ctx, 1175, 0.08, 0.18, 'sine', 0.12);
  },
  bossDefeated: (ctx) => {
    [392, 523, 659, 784, 659, 784, 1046].forEach((freq, i) =>
      tone(ctx, freq, i * 0.12, 0.3, 'square', 0.09),
    );
  },
};

export function playSfx(kind: SfxKind, enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (ctx) SEQUENCES[kind](ctx);
}
