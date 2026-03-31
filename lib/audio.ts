let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.15,
  delay = 0
): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + delay);
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration + 0.05);
}

export const sounds = {
  keyClick() {
    beep(440, 0.03, "square", 0.05);
  },
  validGuess() {
    beep(880, 0.06, "square", 0.12);
  },
  greenGuess() {
    beep(523, 0.08, "square", 0.14);
    beep(659, 0.08, "square", 0.14, 0.09);
    beep(784, 0.12, "square", 0.14, 0.18);
  },
  orangeGuess() {
    beep(440, 0.06, "square", 0.12);
    beep(550, 0.08, "square", 0.12, 0.07);
  },
  greyGuess() {
    beep(330, 0.1, "square", 0.1);
  },
  invalidGuess() {
    beep(150, 0.08, "square", 0.15);
    beep(130, 0.12, "square", 0.15, 0.09);
  },
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => beep(freq, 0.15, "square", 0.18, i * 0.12));
  },
  lose() {
    const notes = [300, 250, 200, 150];
    notes.forEach((freq, i) => beep(freq, 0.15, "square", 0.15, i * 0.1));
  },
  hint() {
    beep(660, 0.05, "square", 0.1);
    beep(880, 0.08, "square", 0.1, 0.06);
  },
  menuNav() {
    beep(550, 0.04, "square", 0.08);
  },
};

let _enabled = true;

export function setSoundEnabled(val: boolean) {
  _enabled = val;
}

// Wrap all sounds to respect the enabled flag
const proxy = new Proxy(sounds, {
  get(target, prop: keyof typeof sounds) {
    return (...args: Parameters<(typeof sounds)[typeof prop]>) => {
      if (_enabled) (target[prop] as (...a: typeof args) => void)(...args);
    };
  },
});

export default proxy;
