// Synthesized via the Web Audio API instead of shipping audio files — no
// licensing/asset concerns and nothing to fetch.

import { usePreferencesStore } from "./preferences-store";
import type { MessageSoundVariant, RingtoneVariant } from "./preferences-store";

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

const MESSAGE_SOUND_PATTERNS: Record<MessageSoundVariant, (ctx: AudioContext, now: number) => void> = {
  ding: (ctx, now) => {
    beep(ctx, 880, now, 0.12);
    beep(ctx, 1320, now + 0.1, 0.15);
  },
  pop: (ctx, now) => {
    beep(ctx, 600, now, 0.08, 0.2);
    beep(ctx, 1000, now + 0.05, 0.1, 0.2);
  },
  bell: (ctx, now) => {
    beep(ctx, 988, now, 0.3, 0.16);
    beep(ctx, 1480, now + 0.03, 0.35, 0.08);
  },
};

const RINGTONE_PATTERNS: Record<RingtoneVariant, (ctx: AudioContext, now: number) => void> = {
  classic: (ctx, now) => {
    beep(ctx, 622, now, 0.35, 0.18);
    beep(ctx, 622, now + 0.45, 0.35, 0.18);
  },
  chime: (ctx, now) => {
    beep(ctx, 523, now, 0.2, 0.16);
    beep(ctx, 659, now + 0.22, 0.2, 0.16);
    beep(ctx, 784, now + 0.44, 0.3, 0.16);
  },
  pulse: (ctx, now) => {
    beep(ctx, 700, now, 0.15, 0.2);
    beep(ctx, 700, now + 0.18, 0.15, 0.2);
    beep(ctx, 700, now + 0.36, 0.15, 0.2);
  },
};

export function playMessageSound() {
  const { messageSoundEnabled, messageSoundVariant } = usePreferencesStore.getState();
  if (!messageSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  MESSAGE_SOUND_PATTERNS[messageSoundVariant](ctx, ctx.currentTime);
}

export function previewMessageSound(variant: MessageSoundVariant) {
  const ctx = getAudioContext();
  if (!ctx) return;
  MESSAGE_SOUND_PATTERNS[variant](ctx, ctx.currentTime);
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function ringtoneCycle(ctx: AudioContext) {
  const { ringtoneVariant } = usePreferencesStore.getState();
  RINGTONE_PATTERNS[ringtoneVariant](ctx, ctx.currentTime);
}

export function startRingtone() {
  if (ringtoneInterval) return;
  if (!usePreferencesStore.getState().ringtoneEnabled) return;
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

export function previewRingtone(variant: RingtoneVariant) {
  const ctx = getAudioContext();
  if (!ctx) return;
  RINGTONE_PATTERNS[variant](ctx, ctx.currentTime);
}
