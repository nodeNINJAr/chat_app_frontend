// Synthesized via the Web Audio API instead of shipping audio files — no
// licensing/asset concerns and nothing to fetch.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function beep(ctx: AudioContext, freq: number, startTime: number, duration: number, peakGain = 0.15) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playMessageSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  beep(ctx, 880, now, 0.12);
  beep(ctx, 1320, now + 0.1, 0.15);
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function ringtoneCycle(ctx: AudioContext) {
  const now = ctx.currentTime;
  beep(ctx, 622, now, 0.35, 0.18);
  beep(ctx, 622, now + 0.45, 0.35, 0.18);
}

export function startRingtone() {
  if (ringtoneInterval) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  ringtoneCycle(ctx);
  ringtoneInterval = setInterval(() => {
    const liveCtx = getAudioContext();
    if (liveCtx) ringtoneCycle(liveCtx);
  }, 1800);
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}
