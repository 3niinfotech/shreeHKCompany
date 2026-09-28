/**
 * Web Audio API Audio Synthesizer for Barcode Scanning & ERP Actions.
 * Works without any external media files, zero network latency, 100% offline-ready.
 */
import useUIStore from "../store/Ui.Store";

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play an ascending pleasant chime on successful barcode scan / action.
 */
export function playScanSuccessSound() {
  try {
    const isSoundOn = useUIStore.getState().soundEnabled ?? true;
    if (!isSoundOn) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn("Audio chime error:", e?.message);
  }
}

/**
 * Play a warning alert (e.g. stone is on Hold or Memo).
 */
export function playWarningSound() {
  try {
    const isSoundOn = useUIStore.getState().soundEnabled ?? true;
    if (!isSoundOn) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(440, now + 0.09); // A4

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  } catch (e) {
    console.warn("Audio warning error:", e?.message);
  }
}

/**
 * Play an error buzz (e.g. SKU not found or invalid format).
 */
export function playErrorSound() {
  try {
    const isSoundOn = useUIStore.getState().soundEnabled ?? true;
    if (!isSoundOn) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.setValueAtTime(164.81, now + 0.1); // E3

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn("Audio error sound:", e?.message);
  }
}
