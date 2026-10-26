"use client";

// One shared AudioContext per tab. Browsers start it "suspended" until a user
// gesture, so screens left running unattended (the pickup display) call
// `unlockAudio` from a tap once, and every later chime plays without one.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext = new AudioContextClass();
  return sharedContext;
}

export function isAudioUnlocked(): boolean {
  try {
    return getAudioContext()?.state === "running";
  } catch {
    return false;
  }
}

// For useSyncExternalStore: re-render when the context starts or stops.
export function subscribeToAudioState(callback: () => void) {
  try {
    const ctx = getAudioContext();
    ctx?.addEventListener("statechange", callback);
    return () => ctx?.removeEventListener("statechange", callback);
  } catch {
    return () => {};
  }
}

export async function unlockAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    if (ctx.state !== "running") await ctx.resume();
    return ctx.state === "running";
  } catch {
    return false;
  }
}

// Plays `frequencies` one after another, `gap` seconds apart.
export function playChime(
  frequencies: number[],
  { gap = 0.15, volume = 0.3, length = 0.35 } = {}
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state !== "running") void ctx.resume();
    const now = ctx.currentTime;

    frequencies.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * gap;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + length + 0.05);
    });
  } catch {
    // Sound is a nice-to-have — never let it break the screen.
  }
}

// Short two-note alert for staff screens.
export const STAFF_ALERT = [880, 1320];
// Airport-style "ding-dong-ding" for the customer pickup display.
export const PICKUP_ALERT = [1046.5, 784, 1318.5];
