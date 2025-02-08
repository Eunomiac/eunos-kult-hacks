// #region === SOUND FUNCTIONS AND VALUES ===

export const name = "EunosSounds";

/**
 * Map of sound names to their HTMLAudioElement instances
 */
export const Sounds: Partial<Record<string, HTMLAudioElement>> = {
  "slow-hit": new Audio("modules/eunos-kult-hacks/assets/sounds/alert-hit.ogg"),
  "subsonic-stinger": new Audio("modules/eunos-kult-hacks/assets/sounds/subsonic-stinger.ogg")
};

/**
 * Set of sound names that have been loaded
 */
const loadedSounds: Set<string> = new Set<string>();

/**
 * Initialize the sound system by preloading all sounds
 */
export function PreInitialize() {
  // Preload all sounds
  return Promise.all(
    Object.keys(Sounds)
      .map(preload)
  );
}

/**
 * Preload a specific sound by key
 */
export function preload(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = Sounds[key];
    if (!audio) {
      console.error(`Sound ${key} not found`);
      reject(new Error(`Sound ${key} not found`));
      return;
    }
    audio.preload = "auto";
    audio.oncanplaythrough = () => {
      loadedSounds.add(key);
      resolve();
    };
    audio.onerror = () => { reject(new Error(`Failed to load sound ${key}`)); };
    audio.load();
  });
}

/**
 * Play a sound globally
 */
export function play(key: string, options: { volume?: number; loop?: boolean } = {}): void {
  if (!loadedSounds.has(key)) {
    console.warn(`Sound ${key} is not preloaded. It may play with a delay.`);
  }
  const audio = Sounds[key];
  if (!audio) {
    console.error(`Sound ${key} not found`);
    return;
  }
  audio.volume = options.volume ?? 1;
  audio.loop = options.loop ?? false;

  // Play globally using Foundry's AudioHelper
  void getAudioHelper().play(audio.src, {
    volume: audio.volume,
    loop: audio.loop
  });
}

/**
 * Unload a specific sound by key
 */
export function unload(key: string): void {
  const audio = Sounds[key];
  if (!audio) {
    console.error(`Sound ${key} not found`);
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.src = "";
  loadedSounds.delete(key);
}

/**
 * Unload all sounds
 */
export function unloadAll() {
  return Promise.all(
    Object.keys(Sounds)
      .map(unload)
  );
}
// #endregion
