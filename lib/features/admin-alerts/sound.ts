export type AdminAlertSound = "message" | "job";

const SOUND_SRC: Record<AdminAlertSound, string> = {
  message: "/sounds/message.mp3",
  job: "/sounds/job.mp3",
};

const MUTE_KEY = "admin-alerts-muted";

let unlocked = false;
let unlockBound = false;
const cache = new Map<AdminAlertSound, HTMLAudioElement>();

function ensureUnlockListeners() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;

  const unlock = async () => {
    try {
      // Prime both clips under the user gesture (Chrome autoplay policy)
      for (const kind of Object.keys(SOUND_SRC) as AdminAlertSound[]) {
        const audio = getAudio(kind);
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }
      unlocked = true;
    } catch {
      unlocked = false;
    }
  };

  window.addEventListener("pointerdown", () => void unlock(), { once: true });
  window.addEventListener("keydown", () => void unlock(), { once: true });
}

function getAudio(kind: AdminAlertSound) {
  let audio = cache.get(kind);
  if (!audio) {
    audio = new Audio(SOUND_SRC[kind]);
    audio.preload = "auto";
    audio.volume = 0.9;
    cache.set(kind, audio);
  }
  return audio;
}

export function isAdminAlertsMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setAdminAlertsMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function playAdminAlertSound(kind: AdminAlertSound) {
  if (typeof window === "undefined") return;
  ensureUnlockListeners();
  if (isAdminAlertsMuted()) return;

  try {
    const audio = getAudio(kind);
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      void p
        .then(() => {
          unlocked = true;
        })
        .catch(() => {
          unlocked = false;
          ensureUnlockListeners();
        });
    }
  } catch {
    // ignore
  }
}

/** Call from UI (bell "Test sound") — counts as user gesture. */
export function playAdminAlertSoundNow(kind: AdminAlertSound = "message") {
  if (typeof window === "undefined") return;
  unlocked = true;
  setAdminAlertsMuted(false);
  playAdminAlertSound(kind);
}

export function primeAdminAlertAudio() {
  ensureUnlockListeners();
}
