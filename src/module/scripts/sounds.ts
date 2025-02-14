// #region === SOUND FUNCTIONS AND VALUES ===

export const name = "EunosSounds";

/**
 * Map of sound names to their HTMLAudioElement instances
 */
export const Sounds: Partial<Record<string, HTMLAudioElement>> = {
  "alert-hit-wound-1": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-1.ogg"),
  "alert-hit-wound-2": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-wound-2.ogg"),
  "alert-hit-stability": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-stability.ogg"),
  "alert-hit-shatterIllusion": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-shatterIllusion.ogg"),
  "alert-hit-01": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-01.ogg"),
  "alert-hit-03": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-03.ogg"),
  "alert-hit-04": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-04.ogg"),
  "alert-hit-05": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-05.ogg"),
  "alert-hit-07": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-07.ogg"),
  "alert-hit-08": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-08.ogg"),
  "alert-hit-09": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-09.ogg"),
  "alert-hit-10": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-10.ogg"),
  "alert-hit-11": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-11.ogg"),
  "alert-hit-13": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-13.ogg"),
  "alert-hit-14": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-14.ogg"),
  "alert-hit-15": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-15.ogg"),
  "alert-hit-16": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-16.ogg"),
  "alert-hit-17": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-17.ogg"),
  "alert-hit-18": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-18.ogg"),
  "alert-hit-20": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-20.ogg"),
  "alert-hit-21": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-21.ogg"),
  "alert-hit-23": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-23.ogg"),
  "alert-hit-25": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-25.ogg"),
  "alert-hit-26": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-26.ogg"),
  "alert-hit-27": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-27.ogg"),
  "alert-hit-29": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-29.ogg"),
  "alert-hit-30": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-30.ogg"),
  "alert-hit-31": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-31.ogg"),
  "alert-hit-32": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-32.ogg"),
  "alert-hit-35": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-35.ogg"),
  "alert-hit-36": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-36.ogg"),
  "alert-hit-37": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-37.ogg"),
  "alert-hit-38": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-38.ogg"),
  "alert-hit-40": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-40.ogg"),
  "alert-hit-41": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-41.ogg"),
  "alert-hit-43": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-43.ogg"),
  "alert-hit-46": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-46.ogg"),
  "alert-hit-47": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-47.ogg"),
  "alert-hit-48": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-48.ogg"),
  "alert-hit-50": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit-50.ogg"),
  "slow-hit": new Audio("modules/eunos-kult-hacks/assets/sounds/alerts/alert-hit.ogg"),
  "subsonic-stinger": new Audio("modules/eunos-kult-hacks/assets/sounds/subsonic-stinger.ogg")
};

export const SoundDelays: Record<keyof typeof Sounds, {delay: number, displayDuration: number}> = {
  "alert-hit-wound-1": {delay: 0.75, displayDuration: 5},
  "alert-hit-wound-2": {delay: 0.75, displayDuration: 5},
  "alert-hit-stability": {delay: -1.5, displayDuration: 6.5},
  "alert-hit-shatterIllusion": {delay: -1.75, displayDuration: 7},
  "alert-hit-01": {delay: 0.75, displayDuration: 5},
  "alert-hit-03": {delay: 0.75, displayDuration: 7},
  "alert-hit-04": {delay: 0.25, displayDuration: 5},
  "alert-hit-05": {delay: 0.75, displayDuration: 5},
  "alert-hit-07": {delay: 0, displayDuration: 5},
  "alert-hit-08": {delay: 0, displayDuration: 5},
  "alert-hit-09": {delay: 0, displayDuration: 5},
  "alert-hit-10": {delay: 0, displayDuration: 5},
  "alert-hit-11": {delay: 0, displayDuration: 5},
  "alert-hit-13": {delay: 0.5, displayDuration: 5}, // Creepy child laugh
  "alert-hit-14": {delay: 0.5, displayDuration: 7.5}, // Eerie nature sounds
  "alert-hit-15": {delay: 0, displayDuration: 9}, // Great jump scare
  "alert-hit-16": {delay: 0.5, displayDuration: 5}, // Cool quick effect
  "alert-hit-17": {delay: 0, displayDuration: 6}, // High-pitched tone
  "alert-hit-18": {delay: 0, displayDuration: 5}, // Great piano slam
  "alert-hit-20": {delay: 0, displayDuration: 5}, // Short strings
  "alert-hit-21": {delay: 0, displayDuration: 5}, // Strings & Breathing
  "alert-hit-23": {delay: -0.5, displayDuration: 7},
  "alert-hit-25": {delay: -0.75, displayDuration: 5}, // Cool techy sound
  "alert-hit-26": {delay: -1.75, displayDuration: 7}, // Skittering insect sound
  "alert-hit-27": {delay: -1.8, displayDuration: 5}, // Skittering lead-in
  "alert-hit-29": {delay: 0.25, displayDuration: 5}, // Lead in slam
  "alert-hit-30": {delay: 1, displayDuration: 10}, // Long and ominous
  "alert-hit-31": {delay: 0.5, displayDuration: 5}, // Subtle heartbeat
  "alert-hit-32": {delay: 0.75, displayDuration: 5}, // Quick slam
  "alert-hit-35": {delay: -1.5, displayDuration: 5},
  "alert-hit-36": {delay: 0.25, displayDuration: 5}, // Breaking glass
  "alert-hit-37": {delay: -1.8, displayDuration: 5},
  "alert-hit-38": {delay: -1, displayDuration: 5}, // quick mechanical sound
  "alert-hit-40": {delay: 0, displayDuration: 7}, // Sovereign-like tone
  "alert-hit-41": {delay: -0.5, displayDuration: 5}, // Cool lead in
  "alert-hit-43": {delay: -1.6, displayDuration: 5},
  "alert-hit-46": {delay: 1, displayDuration: 5}, // throbbing drum beat
  "alert-hit-47": {delay: 0.5, displayDuration: 5}, // shorter drum beat
  "alert-hit-48": {delay: -1.5, displayDuration: 6.5}, // great stability heartbeat
  "alert-hit-50": {delay: -1.5, displayDuration: 5}, // sharp pitchy lead-in
  "slow-hit": {delay: 0.75, displayDuration: 5},
  "subsonic-stinger": {delay: 0.75, displayDuration: 5}
}

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
