import { Sounds, PRE_SESSION, type EunosMediaData } from "../scripts/constants";
import { EunosMediaCategories, EunosMediaTypes, MediaLoadStatus, UserTargetRef } from "../scripts/enums";
import { isEmpty, objDeepFlatten } from "../scripts/utilities";
import EunosSockets from "./EunosSockets";
// #region === SOUND FUNCTIONS AND VALUES ===

// #region === TYPES === ~
type MediaMetadata<T extends EunosMediaTypes|"generic" = "generic"> =
    T extends EunosMediaTypes.audio ? { duration: number }
    : T extends EunosMediaTypes.video ? { duration: number; hasAudio: boolean }
    : { duration: number, hasAudio?: boolean};
type MediaElement = HTMLAudioElement | HTMLVideoElement;

// #endregion

export default class EunosMedia<T extends EunosMediaTypes> {
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

  static async SyncPlayingSounds(): Promise<void> {
    const soundData = await EunosSockets.getInstance().call<Record<string, number>>("requestSoundSync", UserTargetRef.gm, undefined, true);
    const currentSounds = EunosMedia.GetPlayingSounds();

    for (const sound of currentSounds) {
      if (sound.name in soundData) {
        const volume = soundData[sound.name]!;
        void sound.play({volume});
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete soundData[sound.name];
      } else {
        void sound.kill();
      }
    }

    for (const [soundName, volume] of Object.entries(soundData)) {
      const sound = EunosMedia.GetMedia(soundName);
      void sound?.play({volume});
    }
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
    void EunosMedia.SyncPlayingSounds();
  }
  // #endregion INITIALIZATION

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
  originalVolume: number;
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
        element.addEventListener('loadedmetadata', () => {
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
        element.addEventListener('error', () => {
          reject(new Error(`Failed to load metadata for ${this.type} element`));
        });

        // Ensure preload is set to at least "metadata"
        if (element.preload === 'none') {
          element.preload = 'metadata';
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

  #fadeInDuration: Maybe<number>;

  public get fadeInDuration(): number {
    if (this.#fadeInDuration) {
      return this.#fadeInDuration;
    } else {
      return 0;
    }
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
    }

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
          video.addEventListener('loadedmetadata', () => {
            this.reportPreloadStatusToGM();
          });

          video.addEventListener('canplay', () => {
            this.reportPreloadStatusToGM();
            this.loadedMap.set(this.name, this);
          });
        }

        video.addEventListener('canplaythrough', () => {
          this.reportPreloadStatusToGM();
          this.loadedMap.set(this.name, this);
          resolve();
        }, { once: true });

        video.addEventListener('error', () => {
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
        audio.addEventListener('loadedmetadata', () => {
          this.reportPreloadStatusToGM();
        });

        audio.addEventListener('canplay', () => {
          this.reportPreloadStatusToGM();
          this.loadedMap.set(this.name, this);
        });
      }

      audio.addEventListener('canplaythrough', () => {
        this.reportPreloadStatusToGM();
        this.loadedMap.set(this.name, this);
        resolve();
      }, { once: true });

      audio.addEventListener('error', () => {
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
      this.#element!.addEventListener('emptied', () => { resolve() }, { once: true });
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
    const targetVolume = this.originalVolume * audioFactor;
    gsap.to(this.#element, { volume: targetVolume, duration: 1, ease: "none" });
  }

  unDampenAudio(): void {
    if (!this.#element) {
      kLog.error("Cannot unDampen audio for media that has not been initialized", this);
      return;
    }
    this.isDampened = false;
    gsap.to(this.#element, { volume: this.originalVolume, duration: 1, ease: "none" });
  }

  async play(options?: {
    volume?: number;
    loop?: boolean;
    sync?: boolean;
    fadeInDuration?: number;
  }, isSocketCalling = false): Promise<void> {
    if (!this.#element) {
      kLog.error("Cannot play media that has not been initialized", this);
      return;
    }
    const { volume, loop, sync, fadeInDuration } = options ?? {};
    const isTweeningVolume = this.playing && typeof volume === "number" && this.volume !== volume;
    const fromVolume = this.volume;


    this.loop = loop ?? this.loop;
    this.sync = sync ?? this.sync;
    this.#fadeInDuration = fadeInDuration ?? this.#fadeInDuration;

    if (getUser().isGM && isSocketCalling) {
      const mediaData = await this.getSettingsData();
      void EunosSockets.getInstance().call("playMedia", UserTargetRef.all, {mediaName: this.name, mediaData});
      return;
    }
    if (!this.loaded) {
      if (this.alwaysPreload) {
        console.warn(
          `Media ${this.name} is not preloaded. It may play with a delay.`,
        );
      }
      await this.preload();
    }
    if (this.sync) {
      const syncTime = await EunosSockets.getInstance().call<number>("requestMediaSync", UserTargetRef.gm, {mediaName: this.name}, true);
      kLog.log(`Syncing media ${this.name} to ${syncTime}`, this);
      if (Math.abs(syncTime - this.#element.currentTime) > 5) {
        this.#element.currentTime = syncTime;
      }
    }
    this.#element.volume = this.fadeInDuration > 0 ? 0 : this.volume;
    this.#element.loop = this.loop;
    try {
      await this.#element.play();
      if (isTweeningVolume) {
        await gsap.fromTo(this.#element, { volume: fromVolume }, { volume: this.volume, duration: this.fadeInDuration ?? 2, ease: "none" });
      } else {
        await gsap.to(this.#element, { volume: this.volume, duration: this.fadeInDuration, ease: "none" });
      }
      kLog.log(`Faded in media ${this.name} from ${fromVolume} to ${this.volume} = ${this.#element.volume}`);
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
   * Kills the media element, fading it out over 0.5s if it is playing, then unloads it.
   */
  async kill(fadeDuration = 2, isSocketCalling = false): Promise<void> {
    if (getUser().isGM && isSocketCalling) {
      void EunosSockets.getInstance().call("killMedia", UserTargetRef.all, {mediaName: this.name});
      return;
    }
    if (!this.#element) {
      return;
    }
    kLog.log(`Found media "${this.name}", killing it ...`);
    await gsap.to(this.#element, { volume: 0, duration: fadeDuration, ease: "none" });
    kLog.log(`... Awaited fade of "${this.name}", pausing & restoring volume.`);
    this.#element.pause();
    this.#element.volume = this.volume;
    // await this.unload();
  }


}
// #endregion
