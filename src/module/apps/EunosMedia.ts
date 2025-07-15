import { EunosMediaCategories, EunosMediaTypes, MediaLoadStatus, UserTargetRef } from "../scripts/enums";
import { Sounds, PRE_SESSION, SESSION, type EunosMediaData } from "../scripts/constants";
import { isEmpty, objDeepFlatten, roundNum } from "../scripts/utilities";
import EunosSockets from "./EunosSockets";
import { EunosVolumeDialog } from "./EunosVolumeDialog";
// #region === SOUND FUNCTIONS AND VALUES ===

// #region === TYPES === ~
type MediaMetadata<T extends EunosMediaTypes|"generic" = "generic"> =
    T extends EunosMediaTypes.audio ? { duration: number }
    : T extends EunosMediaTypes.video ? { duration: number; hasAudio: boolean }
    : { duration: number, hasAudio?: boolean};
type MediaElement = HTMLAudioElement | HTMLVideoElement;

// #endregion

export default class EunosMedia<T extends EunosMediaTypes = EunosMediaTypes> {
  // #region === STATIC PROPERTIES === ~
  /**
   * Set of all video instances
   */
  static Videos: Map<string, EunosMedia<EunosMediaTypes.video>> = new Map<string, EunosMedia<EunosMediaTypes.video>>();
  /**
   * Set of all sound instances
   */
  static Sounds: Map<string, EunosMedia<EunosMediaTypes.audio>> = new Map<string, EunosMedia<EunosMediaTypes.audio>>();
  /**
   * Set of video instances that have been loaded
   */
  static LoadedVideos: Map<string, EunosMedia<EunosMediaTypes.video>> = new Map<string, EunosMedia<EunosMediaTypes.video>>();
  /**
   * Set of sound instances that have been loaded
   */
  static LoadedSounds: Map<string, EunosMedia<EunosMediaTypes.audio>> = new Map<string, EunosMedia<EunosMediaTypes.audio>>();
  /**
   * Array of audio file extensions
   */
  static AudioExtensions: string[] = ["mp3", "wav", "ogg", "m4a", "flac"];
  /**
   * Array of video file extensions
   */
  static VideoExtensions: string[] = ["mp4", "webm"];
  // #endregion STATIC PROPERTIES

  static GetMedia(mediaName: string): Maybe<EunosMedia<EunosMediaTypes.audio | EunosMediaTypes.video>> {
    if (EunosMedia.Sounds.has(mediaName)) {
      return EunosMedia.Sounds.get(mediaName)!;
    } else if (EunosMedia.Videos.has(mediaName)) {
      return EunosMedia.Videos.get(mediaName)!;
    } else {
      return undefined;
    }
  }

  static GetMediaByCategory(category: EunosMediaCategories): EunosMedia<EunosMediaTypes.audio | EunosMediaTypes.video>[] {
    return Array.from(EunosMedia.Sounds.values()).filter((media) => media.category === category);
  }

  static GetPlayingSounds(): EunosMedia<EunosMediaTypes.audio>[] {
    return Array.from(EunosMedia.Sounds.values()).filter((media) => media.playing);
  }

  static async SyncPlayingSounds(isNotKilling = false): Promise<void> {
    const soundData = await EunosSockets.getInstance().call<Record<string, number>>("requestSoundSync", UserTargetRef.gm, undefined, true);
    const currentSounds = EunosMedia.GetPlayingSounds();

    for (const sound of currentSounds) {
      if (sound.name in soundData) {
        const volume = soundData[sound.name]!;
        void sound.play({volume});
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete soundData[sound.name];
      } else if (!isNotKilling) {
        void sound.kill();
      }
    }

    for (const [soundName, volume] of Object.entries(soundData)) {
      const sound = EunosMedia.GetMedia(soundName);
      void sound?.play({volume});
    }
  }

  static async SetSoundscape(soundData: Record<string, number | null>, fadeDuration?: number) {
    const currentSounds = EunosMedia.GetPlayingSounds();

    // Calculate appropriate fade duration if not provided
    const calculateFadeDuration = async (media: EunosMedia<EunosMediaTypes.audio | EunosMediaTypes.video>): Promise<number> => {
      if (fadeDuration !== undefined) {
        return fadeDuration;
      }
      try {
        const duration = await media.getDuration();
        // Use minimum of 2 seconds or 20% of duration for short sounds
        return Math.max(2, Math.min(duration * 0.2, 2));
      } catch {
        return 2; // Default fallback
      }
    };

    await Promise.all([
      Promise.all(
        currentSounds
          .filter((sound) => !soundData[sound.name])
          .map(async (sound) => {
            const killFadeDuration = await calculateFadeDuration(sound);
            return sound.kill(killFadeDuration);
          })
      ),
      Promise.all(
        (Object.entries(soundData) as Array<[string, number]>)
          .map(async ([soundName, _volume]) => {
            const sound = EunosMedia.GetMedia(soundName);
            if (!sound) return;
            const playFadeDuration = await calculateFadeDuration(sound);
            // Only play the sound, don't change its fundamental volume
            // SetSoundscape should control playback, not modify the media's base volume
            return sound.play({fadeInDuration: playFadeDuration});
          })
      )
    ]);
  }

  // #region === INITIALIZATION === ~
  /**
   * Initialize the sound system by preloading all sounds
   */
  static async PostInitialize() {
    // Preload all sounds
    await Promise.all(
      objDeepFlatten(Sounds, {isKeepingLastObject: true}).map(([soundName, soundData]) => {
        const sound = new EunosMedia(soundName);
        if (sound.alwaysPreload) {
          return sound.preload();
        }
        return Promise.resolve();
      })
    );

    // Synchronize playing sounds with the GM
    // void EunosMedia.SyncPlayingSounds(true);
  }
  // #endregion INITIALIZATION

  static ShowVolumeControl(): void {
    if (!getUser().isGM) return;

    const dialog = new EunosVolumeDialog();
    dialog.render(true);
  }

  /**
   * Debug method to print a table of all media volumes for troubleshooting
   */
  static DebugVolumes(): void {
    const allMedia = [
      ...Array.from(EunosMedia.Sounds.values()),
      ...Array.from(EunosMedia.Videos.values())
    ];

    if (allMedia.length === 0) {
      console.log("No media objects registered");
      return;
    }

    const tableData = allMedia.map(media => {
      const undampenedVolume = media.#volume;
      const dampenedVolume = undampenedVolume * media.dampeningFactor;
      const actualElementVolume = media.#element?.volume ?? "No Element";
      const calculatedVolume = media.volume; // Uses getter

      return {
        "Media Name": media.name,
        "Default Volume": media.defaultVolume,
        "Current (#volume)": undampenedVolume,
        "Dampening Factor": media.dampeningFactor,
        "Dampened (calculated)": dampenedVolume,
        "Is Dampened": media.isDampened,
        "Volume Getter": calculatedVolume,
        "Actual Element Volume": actualElementVolume,
        "Playing": media.playing,
        "Loaded": media.loaded
      };
    });

    console.table(tableData);

    // Also log playing sounds separately for easier reading
    const playingSounds = allMedia.filter(media => media.playing);
    if (playingSounds.length > 0) {
      console.log("\n=== PLAYING SOUNDS ONLY ===");
      const playingData = playingSounds.map(media => ({
        "Name": media.name,
        "Default": media.defaultVolume,
        "Current": media.#volume,
        "Is Dampened": media.isDampened,
        "Calculated": media.volume,
        "Element": media.#element?.volume ?? "No Element"
      }));
      console.table(playingData);
    }
  }

  /**
   * Static method to play media by name. This is the only method that should be used to play media.
   */
  static Play(mediaName: string, options?: {
    volume?: number;
    loop?: boolean;
    sync?: boolean;
    fadeInDuration?: number;
    ease?: string
  }): Promise<void> {
    const media = EunosMedia.GetMedia(mediaName);
    if (!media) {
      kLog.error(`Media "${mediaName}" not found`);
      return Promise.resolve();
    }
    return media.play(options);
  }

  /**
   * Static method to kill media by name. This is the only method that should be used to stop/kill media.
   */
  static Kill(mediaName: string, fadeDuration?: number): Promise<void> {
    const media = EunosMedia.GetMedia(mediaName);
    if (!media) {
      kLog.log(`Media "${mediaName}" not found for killing`);
      return Promise.resolve();
    }
    return media.kill(fadeDuration);
  }

  #type: T;
  #element: Maybe<T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement>;
  #category: EunosMediaCategories = EunosMediaCategories.Video;
  path: string;
  name: string;
  delay: number;
  parentSelector: string;
  loop: boolean;
  mute: boolean;
  sync: boolean;
  #volume: number;
  #fadeEase = "none";
  originalVolume: number;
  readonly defaultVolume: number; // Immutable fallback volume, never changes
  isDampened: boolean;
  dampeningFactor: number;
  autoplay: boolean;
  displayDuration?: number;
  alwaysPreload: boolean;
  #metadataPreloadPromise?: Promise<MediaMetadata<T>>;
  #metadata?: MediaMetadata<T>;
  #canPlayPreloadPromise?: Promise<T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement>;
  reportPreloadStatus: boolean;
  #interactionHandlersSet = false;
  #fadeInDuration: Maybe<number>;

  get canPlayPromise(): Promise<T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement> {
    if (this.#canPlayPreloadPromise) {
      return this.#canPlayPreloadPromise;
    }
    if (this.type === EunosMediaTypes.audio) {
      this.#canPlayPreloadPromise = this.preloadAudio().then(() => this.element) as Promise<T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement>;
    } else {
      this.#canPlayPreloadPromise = this.preloadVideo().then(() => this.element) as Promise<T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement>;
    }
    return this.#canPlayPreloadPromise;
  }

  get preloadValue(): "auto" | "metadata" {
    if (this.alwaysPreload) {
      return "auto";
    } else {
      return "metadata";
    }
  }
/**
 * export enum MediaLoadStatus {
  NotConnected = "NotConnected",
  NotStarted = "NotStarted",
  Loading = "Loading",
  Ready = "Ready",
  LoadPending = "LoadPending",
  PreloadNotRequested = "PreloadNotRequested",
}
 */
  get preloadStatus(): MediaLoadStatus {
    if (!this.#element) {
      return MediaLoadStatus.NotStarted;
    }
    if (this.preloadValue !== "auto") {
      return MediaLoadStatus.PreloadNotRequested;
    }
    if (this.element.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      return MediaLoadStatus.Loading;
    }
    if (this.element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      return MediaLoadStatus.Ready;
    }
    return MediaLoadStatus.LoadPending;
  }

  get type(): T {
    if (!this.#type) {
      if (this.path) {
        this.#type = this.getTypeFromPath();
      } else if (this.#element) {
        this.#type = this.#element instanceof HTMLAudioElement
          ? EunosMediaTypes.audio as T
          : EunosMediaTypes.video as T;
      }
    }
    if (!this.#type) {
      throw new Error(`No type or paths provided for media ${this.name}`);
    }
    return this.#type;
  }

  get element(): T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement {
    if (!this.#element) {
      if (this.path) {
        this.#element = this.getElementFromPath(this.path);
      } else {
        throw new Error(`No path provided for media ${this.name}`);
      }
    }
    if (!this.#element) {
      throw new Error(`No element could be found for EunosMedia instance ${this.name}`);
    }
    return this.#element;
  }

  get volume(): number {
    if (this.isDampened) {
      return this.#volume * this.dampeningFactor;
    }
    return this.#volume;
  }

  set volume(volume: number) {
    // Volume corruption protection at the setter level
    if (volume <= SESSION.MIN_AUDIO_VOLUME && volume <= this.defaultVolume) {
      kLog.error(
        `Volume corruption blocked for media "${this.name}": ` +
        `attempted to set volume to ${volume} which is suspiciously low and at/below default (${this.defaultVolume}). ` +
        "Using default volume instead.",
        this
      );
      this.#volume = this.defaultVolume;
    } else {
      this.#volume = volume;
    }
    // Don't directly manipulate element volume - let GSAP handle all volume changes
    // The element volume will be set correctly by play() method and GSAP animations
  }

  /**
   * Immediately set the element volume without animation. Use sparingly - prefer play() method.
   * This is for cases like real-time volume controls where immediate feedback is needed.
   */
  setVolumeImmediate(volume: number): void {
    // Volume corruption protection at the immediate setter level
    if (volume <= SESSION.MIN_AUDIO_VOLUME && volume <= this.defaultVolume) {
      kLog.error(
        `Volume corruption blocked for media "${this.name}": ` +
        `attempted to set immediate volume to ${volume} which is suspiciously low and at/below default (${this.defaultVolume}). ` +
        "Using default volume instead.",
        this
      );
      this.#volume = this.defaultVolume;
    } else {
      this.#volume = volume;
    }

    if (this.#element) {
      // Calculate actual element volume dynamically based on dampening state
      const elementVolume = this.isDampened ? this.#volume * this.dampeningFactor : this.#volume;
      this.#element.volume = elementVolume;
    }
  }

  get category(): EunosMediaCategories {
    if (!this.#category) {
      if (this.path) {
        this.#category = this.getCategoryFromPath();
      } else {
        throw new Error(`No path provided for media ${this.name}`);
      }
    }
    return this.#category;
  }

  get loadedMap(): Map<string, EunosMedia<T>> {
    if (this.type === EunosMediaTypes.audio) {
      return EunosMedia.LoadedSounds as Map<string, EunosMedia<T>>;
    } else {
      return EunosMedia.LoadedVideos as Map<string, EunosMedia<T>>;
    }
  }

  get registryMap(): Map<string, EunosMedia<T>> {
    if (this.type === EunosMediaTypes.audio) {
      return EunosMedia.Sounds as Map<string, EunosMedia<T>>;
    } else {
      return EunosMedia.Videos as Map<string, EunosMedia<T>>;
    }
  }

  private async getMetadata(): Promise<MediaMetadata<T>> {
    if (this.#metadata) {
      return this.#metadata;
    }
    if (this.element.readyState < HTMLMediaElement.HAVE_METADATA) {
      return this.#metadataPreloadPromise ??= new Promise((resolve, reject) => {
        const element = this.element;

        // Set up metadata loaded handler
        element.addEventListener("loadedmetadata", () => {
          if (this.type === EunosMediaTypes.audio) {
            this.#metadata = {
              duration: element.duration
            } as MediaMetadata<T>;
            resolve(this.#metadata);
          } else if (this.type === EunosMediaTypes.video) {
            const videoElement = element as HTMLVideoElement & {
              audioTracks?: {length: number}[];
              mozHasAudio?: boolean;
              webkitAudioDecodedByteCount?: boolean;
            };
            this.#metadata = {
              duration: videoElement.duration,
              hasAudio: Boolean(videoElement.audioTracks?.length) ||
                Boolean(videoElement.mozHasAudio) ||
                Boolean(videoElement.webkitAudioDecodedByteCount)
            } as MediaMetadata<T>;
            resolve(this.#metadata);
          }
        });

        // Set up error handler
        element.addEventListener("error", () => {
          reject(new Error(`Failed to load metadata for ${this.type} element`));
        });

        // Ensure preload is set to at least "metadata"
        if (element.preload === "none") {
          element.preload = "metadata";
        }
      });
    }

    // If metadata is already loaded, return it directly
    if (this.type === EunosMediaTypes.audio) {
      const element = this.element as HTMLAudioElement;
      this.#metadata = {
        duration: element.duration
      } as MediaMetadata<T>;
      return this.#metadata;
    } else if (this.type === EunosMediaTypes.video) {
      const element = this.element as HTMLVideoElement & {
        audioTracks?: {length: number}[];
        mozHasAudio?: boolean;
        webkitAudioDecodedByteCount?: boolean;
      };
      this.#metadata = {
        duration: element.duration,
        hasAudio: Boolean(element.audioTracks?.length) ||
          Boolean(element.mozHasAudio) ||
          Boolean(element.webkitAudioDecodedByteCount)
      } as MediaMetadata<T>;
      return this.#metadata;
    }

    throw new Error(`Unsupported media type: ${this.type}`);
  }

  #duration: Maybe<number>;
  public async getDuration(): Promise<number> {
    if (this.#duration) {
      return this.#duration;
    }
    const metadata = await this.getMetadata();
    this.#duration = metadata.duration;
    return this.#duration;
  }
  get duration(): number {
    if (this.#duration) {
      return this.#duration;
    } else {
      throw new Error(`Duration not loaded for media ${this.name}`);
    }
  }

  public get fadeInDuration(): number {
    if (this.#fadeInDuration) {
      return this.#fadeInDuration;
    } else {
      return 0;
    }
  }

  public set fadeInDuration(value: number) {
    this.#fadeInDuration = value;
  }

  public get fadeEase(): string {
    return this.#fadeEase;
  }

  public set fadeEase(value: string) {
    this.#fadeEase = value;
  }

  public get currentTime(): number {
    return this.element.currentTime ?? 0;
  }

  public set currentTime(time: number) {
    this.element.currentTime = time;
  }

  async getSettingsData(): Promise<EunosMediaData> {
    return {
      path: this.path,
      alwaysPreload: this.alwaysPreload,
      delay: this.delay,
      fadeInDuration: this.fadeInDuration,
      displayDuration: this.displayDuration,
      duration: await this.getDuration(),
      parentSelector: this.parentSelector,
      loop: this.loop,
      mute: this.mute,
      sync: this.sync,
      volume: this.volume,
      autoplay: this.autoplay,
      reportPreloadStatus: this.reportPreloadStatus
    };
  }
  get loaded(): boolean {
    if (this.type === EunosMediaTypes.audio) {
      if (EunosMedia.LoadedSounds.has(this.name)) {
        return true;
      }
      if (this.element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        EunosMedia.LoadedSounds.set(this.name, this as EunosMedia<EunosMediaTypes.audio>);
        return true;
      }
      EunosMedia.LoadedSounds.delete(this.name);
      return false;
    } else {
      if (EunosMedia.LoadedVideos.has(this.name)) {
        return true;
      }
      if (this.element.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        EunosMedia.LoadedVideos.set(this.name, this as EunosMedia<EunosMediaTypes.video>);
        return true;
      }
      EunosMedia.LoadedVideos.delete(this.name);
      return false;
    }
  }
  get playing(): boolean {
    // A media element is playing if it's not paused, not ended, not muted, and is ready to play
    return !this.element.paused &&
           !this.element.ended &&
           this.element.volume > 0 &&
           this.element.readyState > 2; // HAVE_CURRENT_DATA or higher
  }

  private getTypeFromPath(path?: string): T {
    this.path = path ?? this.path;
    if (!this.path) {
      throw new Error(`No path provided for media ${this.name}`);
    }
    if (EunosMedia.AudioExtensions.includes(this.path.split(".").pop() ?? "")) {
      return EunosMediaTypes.audio as T;
    } else if (
      EunosMedia.VideoExtensions.includes(this.path.split(".").pop() ?? "")
    ) {
      return EunosMediaTypes.video as T;
    } else {
      throw new Error(`Unsupported media type: ${this.path}`);
    }
  }

  private getElementFromPath(path?: string): T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement {
    this.path = path ?? this.path;
    if (!this.path) {
      throw new Error(`No path provided for media ${this.name}`);
    }
    switch (this.type) {
      case EunosMediaTypes.audio: {
        // First look for existing element in DOM with same src and parentSelector
        const existingElement = document.querySelector(`#${this.name}`);
        if (existingElement) {
          kLog.log(`Found existing audio element ${this.name}, returning it.`, this);
          this.#element = existingElement as T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement;
          return this.#element;
        }
        // kLog.log(`Creating audio element ${this.name}, appending to '${this.parentSelector}'`, this);
        this.#element = document.createElement("audio") as T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement;
        this.#element.id = this.name;
        this.#element.src = this.path;
        this.#element.preload = this.preloadValue;
        this.#element.volume = 0; // Always initialize to silent
        $(this.#element).appendTo(this.parentSelector);
        return this.#element;
      }
      case EunosMediaTypes.video: {
        // First look for existing element in DOM with same src and parentSelector
        const existingElement = document.querySelector(`#${this.name}`);
        if (existingElement) {
          kLog.log(`Found existing video element ${this.name}, returning it.`, this);
          this.#element = existingElement as HTMLVideoElement;
          return this.#element;
        }
        kLog.log(`Creating video element ${this.name}, appending to '${this.parentSelector}'`, this);
        this.#element = document.createElement("video");
        this.#element.id = this.name;
        this.#element.src = this.path;
        this.#element.controls = false;
        this.#element.preload = this.preloadValue;
        this.#element.volume = 0; // Always initialize to silent
        $(this.#element).appendTo(this.parentSelector);
        return this.#element;
      }
      default: {
        throw new Error(`Unsupported media type: ${this.path}`);
      }
    }
  }

  private getCategoryFromPath(path?: string): EunosMediaCategories {
    path ??= this.path;
    if (!path) {
      throw new Error(`No path provided for media ${this.name}`);
    }
    if (this.type === EunosMediaTypes.video) {
      return EunosMediaCategories.Video;
    } else if (path.includes("ambient")) {
      return EunosMediaCategories.Ambient;
    } else if (path.includes("weather")) {
      return EunosMediaCategories.Weather;
    } else if (path.includes("effects")) {
      return EunosMediaCategories.Effects;
    } else if (path.includes("alerts")) {
      return EunosMediaCategories.Alerts;
    } else if (path.includes("music")) {
      return EunosMediaCategories.PreSessionSongs;
    }
    throw new Error(`Unsupported category: ${path}`);
  }

  showInSoundMenu: boolean;

  constructor(mediaName: string, mediaData?: EunosMediaData & {type: T}) {

    mediaData ??= {} as EunosMediaData & {type: T};
    const staticData = (objDeepFlatten(Sounds, {isKeepingLastObject: true})
      .find(([key]) => key === mediaName)?.[1]) ?? {} as EunosMediaData & {type: T};
    const data = {
      ...staticData,
      ...mediaData
    };

    this.name = mediaName;
    this.delay = data.delay ?? 0;
    this.displayDuration = data.displayDuration;
    this.#fadeInDuration = data.fadeInDuration ?? 0;
    this.reportPreloadStatus = data.reportPreloadStatus ?? false;
    this.showInSoundMenu = data.showInSoundMenu ?? true;
    if (data.path) {
      this.path = data.path;
      if (!this.path) {
        throw new Error(`No path provided for media ${mediaName}`);
      }
      this.#type = this.getTypeFromPath();
      this.parentSelector = data.parentSelector ?? (this.type === EunosMediaTypes.audio ? "#MEDIA-CONTAINER-AUDIO" : "#MEDIA-CONTAINER-VIDEO");
      this.#element = this.getElementFromPath();
    } else if (data.element) {
      this.#type =
        (data.element instanceof HTMLAudioElement
          ? EunosMediaTypes.audio
          : EunosMediaTypes.video) as T;
      this.parentSelector = data.parentSelector ?? (this.type === EunosMediaTypes.audio ? "#MEDIA-CONTAINER-AUDIO" : "#MEDIA-CONTAINER-VIDEO");
      this.#element = data.element as T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement;
      this.path = this.#element.src;
    } else {
      throw new Error(`No path or element provided for media ${mediaName}`);
    }
    if ("alwaysPreload" in data) {
      this.alwaysPreload = data.alwaysPreload!;
    } else if (this.type === EunosMediaTypes.audio) {
      this.alwaysPreload = true;
    } else {
      this.alwaysPreload = false;
    }
    if (this.#type === EunosMediaTypes.audio) {
      this.#category = this.getCategoryFromPath();
    }
    this.loop = data.loop ?? false;
    this.mute = data.mute ?? false;
    this.sync = data.sync ?? false;
    this.#volume = data.volume ?? 1;
    this.originalVolume = this.#volume;
    this.defaultVolume = this.#volume; // Store immutable fallback volume
    this.isDampened = false;
    this.dampeningFactor = data.dampeningFactor ?? 0.1;
    this.autoplay = data.autoplay ?? false;
    if (this.type === EunosMediaTypes.video) {
      EunosMedia.Videos.set(this.name, this as EunosMedia<EunosMediaTypes.video>);
    } else if (this.type === EunosMediaTypes.audio) {
      EunosMedia.Sounds.set(this.name, this as EunosMedia<EunosMediaTypes.audio>);
    }
  }

  preload(): Promise<void> {
    if (this.type === EunosMediaTypes.audio) {
      return this.preloadAudio();
    }
    return this.preloadVideo();
  }


  private reportPreloadStatusToGM(): void {
    if (!this.reportPreloadStatus) { return; }

    // Send current preload status to GM
    void EunosSockets.getInstance().call("reportPreloadStatus", "gm", {
      userId: getUser().id ?? "",
      status: this.preloadStatus
    });
  }

  private setupInteractionHandlers(): void {
    if (this.#interactionHandlersSet) return;

    const handleInteraction = (e: Event) => {
      // Ignore clicks on the start video button
      if (e.target instanceof Element &&
          (e.target.classList.contains("start-video") ||
           e.target.closest(".start-video"))) {
        return;
      }

      // Try to preload and report status
      if (this.reportPreloadStatus) {
        this.reportPreloadStatusToGM();
      }
      void this.preload().catch((error: unknown) => {
        kLog.error("Handler failed to preload media:", error);
      });
    };

    PRE_SESSION.INTERACTION_EVENTS.forEach((event) => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    this.#interactionHandlersSet = true;
  }

  private async preloadVideo(): Promise<void> {
    // If already fully loaded, return immediately
    if (this.preloadStatus === MediaLoadStatus.Ready) {
      this.loadedMap.set(this.name, this);
      this.reportPreloadStatusToGM();
      return;
    }

    const video = this.element as HTMLVideoElement;

    try {
      await new Promise<void>((resolve, reject) => {
        // Set up all event listeners
        if (this.reportPreloadStatus) {
          video.addEventListener("loadedmetadata", () => {
            this.reportPreloadStatusToGM();
          });

          video.addEventListener("canplay", () => {
            this.reportPreloadStatusToGM();
            this.loadedMap.set(this.name, this);
          });
        }

        video.addEventListener("canplaythrough", () => {
          this.reportPreloadStatusToGM();
          this.loadedMap.set(this.name, this);
          resolve();
        }, { once: true });

        video.addEventListener("error", () => {
          if (this.reportPreloadStatus) {
            this.reportPreloadStatusToGM();
          }
          reject(new Error(`Failed to preload video: ${video.src}`));
        }, { once: true });

        // Set preload attribute to auto to start loading
        video.preload = "auto";
      });
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        kLog.error("Preload prevented, setting up interaction handlers", error);
        this.setupInteractionHandlers();
        throw error; // Re-throw to maintain error handling flow
      }
      throw error;
    }
  }

  private async preloadAudio(): Promise<void> {
    // If already fully loaded, return immediately
    if (this.preloadStatus === MediaLoadStatus.Ready) {
      this.loadedMap.set(this.name, this);
      return;
    }

    const audio = this.element as HTMLAudioElement;

    // Create a promise that resolves when the audio can play through
    return new Promise((resolve, reject) => {
      // Set up all event listeners
      if (this.reportPreloadStatus) {
        audio.addEventListener("loadedmetadata", () => {
          this.reportPreloadStatusToGM();
        });

        audio.addEventListener("canplay", () => {
          this.reportPreloadStatusToGM();
          this.loadedMap.set(this.name, this);
        });
      }

      audio.addEventListener("canplaythrough", () => {
        this.reportPreloadStatusToGM();
        this.loadedMap.set(this.name, this);
        resolve();
      }, { once: true });

      audio.addEventListener("error", () => {
        this.reportPreloadStatusToGM();
        reject(new Error(`Failed to preload audio: ${audio.src}`));
      }, { once: true });

      // Set preload attribute to auto to start loading
      audio.preload = "auto";
    });
  }

  async unload(): Promise<void> {
    if (!this.#element) {
      this.loadedMap.delete(this.name);
      return;
    }

    // Stop any ongoing playback
    this.#element.pause();
    this.#element.currentTime = 0;

    // Store current source and preload value
    const currentSrc = this.#element.src;

    // Set preload to "none" temporarily while clearing the buffer
    this.#element.preload = "none";
    this.#element.src = "";
    this.#element.load();

    // Wait for the emptied event which fires when the media element has been reset
    await new Promise<void>(resolve => {
      this.#element!.addEventListener("emptied", () => { resolve(); }, { once: true });
    });

    // Restore the source and set preload to "metadata"
    this.#element.src = currentSrc;
    this.#element.preload = this.preloadValue;  // Use getter that returns "metadata" or "auto" based on alwaysPreload

    // Clear metadata and preload promises
    this.#metadata = undefined;
    this.#metadataPreloadPromise = undefined;
    this.#canPlayPreloadPromise = undefined;

    // Remove from loaded map
    this.loadedMap.delete(this.name);
  }

  async reinitialize(): Promise<void> {
    // First unload the current media
    await this.unload();

    // Clear the element reference so it will be recreated
    this.#element = undefined;

    // Clear metadata and preload promises
    this.#metadata = undefined;
    this.#metadataPreloadPromise = undefined;
    this.#canPlayPreloadPromise = undefined;

    // If this media is set to always preload, preload it again
    if (this.alwaysPreload) {
      await this.preload();
    }
  }

  dampenAudio(audioFactor = 0.1): void {
    if (!this.#element) {
      kLog.error("Cannot dampen audio for media that has not been initialized", this);
      return;
    }
    this.isDampened = true;
    this.dampeningFactor = audioFactor;
    // Calculate dampened volume manually to avoid double-dampening from getter
    const dampenedVolume = this.#volume * this.dampeningFactor;
    gsap.to(this.#element, { volume: dampenedVolume, duration: 1, ease: "none" });
  }

  unDampenAudio(): void {
    if (!this.#element) {
      kLog.error("Cannot unDampen audio for media that has not been initialized", this);
      return;
    }
    this.isDampened = false;
    // Use the undampened #volume directly
    gsap.to(this.#element, { volume: this.#volume, duration: 1, ease: "none" });
  }

  async play(options?: {
    volume?: number;
    loop?: boolean;
    sync?: boolean;
    fadeInDuration?: number;
    ease?: string
  }, isSocketCalling = false): Promise<void> {
    if (!this.#element) {
      kLog.error("Cannot play media that has not been initialized", this);
      return;
    }
    const { volume, loop, sync, fadeInDuration, ease } = options ?? {};

    if (volume) {
      this.volume = volume;
    }

    // Volume corruption detection and recovery
    if (this.#volume <= SESSION.MIN_AUDIO_VOLUME && this.#volume <= this.defaultVolume) {
      kLog.error(
        `Volume corruption detected for media "${this.name}": ` +
        `current volume (${this.#volume}) is suspiciously low and at/below default (${this.defaultVolume}). ` +
        "Reverting to default volume.",
        this
      );
      this.#volume = this.defaultVolume;
    }

    this.loop = loop ?? this.loop;
    this.sync = sync ?? this.sync;
    this.fadeEase = ease ?? this.#fadeEase;

    // Calculate appropriate fade duration if not provided
    let actualFadeInDuration = fadeInDuration ?? this.fadeInDuration;
    if (actualFadeInDuration === undefined || actualFadeInDuration === 0) {
      try {
        const duration = await this.getDuration();
        // Use minimum of 2 seconds or 20% of duration for short sounds
        actualFadeInDuration = Math.max(2, Math.min(duration * 0.2, 2));
      } catch {
        actualFadeInDuration = 2; // Default fallback
      }
    }
    this.fadeInDuration = actualFadeInDuration;

    // Calculate target volume dynamically based on dampening state
    const targetVolume = this.isDampened ? this.#volume * this.dampeningFactor : this.#volume;
    const fromVolume = this.fadeInDuration ? 0 : targetVolume;

    if (getUser().isGM && isSocketCalling) {
      const mediaData = await this.getSettingsData();
      void EunosSockets.getInstance().call("playMedia", UserTargetRef.all, {mediaName: this.name, mediaData});
      return;
    }
    if (!this.loaded) {
      if (this.alwaysPreload) {
        console.warn(
          `Media ${this.name} is set 'alwaysPreload' but is not preloaded. It may play with a delay.`
        );
      }
      await this.preload();
    }
    if (this.sync && getUsers().some(u => u.isGM && u.active)) {
      const syncTime = await EunosSockets.getInstance().call<number>("requestMediaSync", UserTargetRef.gm, {mediaName: this.name}, true);
      kLog.log(`Syncing media ${this.name} to ${syncTime}`, this);
      if (Math.abs(syncTime - this.#element.currentTime) > 5) {
        this.#element.currentTime = syncTime;
      }
    }

    this.#element.loop = this.loop;

    try {
      await this.#element.play();
      kLog.log(`Fading in ${roundNum(await this.getDuration(), 2)}s Sound with ${roundNum(this.fadeInDuration)}s of fade in.  From ${fromVolume} to ${targetVolume}. `);
      await gsap.fromTo(this.#element, { volume: fromVolume }, { volume: targetVolume, duration: this.fadeInDuration, ease: this.fadeEase });
      kLog.log(`Faded in media ${this.name} from ${fromVolume} to ${targetVolume} = ${this.#element.volume}`);
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        kLog.error("Playback prevented, setting up interaction handlers", error);
        this.setupInteractionHandlers();
        throw error;
      }
      throw error;
    }
    this.loadedMap.set(this.name, this);
  }

  /**
   * Kills the media element, fading it out over the specified duration or an appropriate default.
   * Uses minimum of 2 seconds or 20% of media duration for short sounds, unless explicitly forced to 0.
   */
  async kill(fadeDuration?: number, isSocketCalling = false): Promise<void> {
    if (getUser().isGM && isSocketCalling) {
      void EunosSockets.getInstance().call("killMedia", UserTargetRef.all, {mediaName: this.name});
      return;
    }
    if (!this.#element) {
      return;
    }

    // Calculate appropriate fade duration if not provided
    let actualFadeDuration = fadeDuration;
    if (actualFadeDuration === undefined) {
      try {
        const duration = await this.getDuration();
        // Use minimum of 2 seconds or 20% of duration for short sounds
        actualFadeDuration = Math.max(2, Math.min(duration * 0.2, 2));
      } catch {
        actualFadeDuration = 2; // Default fallback
      }
    }

    kLog.log(`Found media "${this.name}", killing it with ${actualFadeDuration}s fade...`);
    await gsap.to(this.#element, { volume: 0, duration: actualFadeDuration, onComplete: () => {
      kLog.log(`... Awaited fade of "${this.name}", pausing.`);
      if (!this.#element) { return; }
      this.#element.pause();
      // Note: We don't restore element volume here - it will be set correctly when play() is called
    }, ease: "none" });
  }


}
// #endregion
