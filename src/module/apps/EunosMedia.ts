import { Sounds, PRE_SESSION, type EunosMediaData } from "../scripts/constants";
import { EunosMediaTypes, MediaLoadStatus, UserTargetRef } from "../scripts/enums";
import { objDeepFlatten } from "../scripts/utilities";
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

  static GetMedia(mediaName: string): EunosMedia<EunosMediaTypes.audio | EunosMediaTypes.video> {
    if (EunosMedia.Sounds.has(mediaName)) {
      return EunosMedia.Sounds.get(mediaName)!;
    } else if (EunosMedia.Videos.has(mediaName)) {
      return EunosMedia.Videos.get(mediaName)!;
    } else {
      throw new Error(`Media ${mediaName} not found`);
    }
  }

  // #region === INITIALIZATION === ~
  /**
   * Initialize the sound system by preloading all sounds
   */
  static PostInitialize() {
    // Preload all sounds
    return Promise.all(
      objDeepFlatten(Sounds, {isKeepingLastObject: true}).map(([soundName, soundData]) => {
        const sound = new EunosMedia(soundName);
        if (sound.alwaysPreload) {
          return sound.preload();
        }
        return Promise.resolve();
      })
    );
  }
  // #endregion INITIALIZATION

  #type: T;
  #element: T extends EunosMediaTypes.audio ? HTMLAudioElement : HTMLVideoElement;
  path: string;
  name: string;
  delay: number;
  parentSelector: string;
  loop: boolean;
  mute: boolean;
  sync: boolean;
  volume: number;
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

  public get currentTime(): number {
    return this.element.currentTime ?? 0;
  }

  public set currentTime(time: number) {
    this.element.currentTime = time;
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

  constructor(mediaName: string, mediaData?: EunosMediaData & {type: T}) {

    let data: EunosMediaData & {type: T};
    if (mediaData) {
      data = mediaData;
    } else {
      const soundData = Object.fromEntries(objDeepFlatten(Sounds, {isKeepingLastObject: true}).filter(([key]) => key === mediaName));
      if (mediaName in soundData) {
        data = {
          type: EunosMediaTypes.audio,
          ...soundData[mediaName]
        } as EunosMediaData & {type: T};
      } else {
        throw new Error(`Media '${mediaName}' not found, and no configuration data was provided.`);
      }
    }

    this.name = mediaName;
    this.delay = data.delay ?? 0;
    this.displayDuration = data.displayDuration;
    this.reportPreloadStatus = data.reportPreloadStatus ?? false;
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
    this.loop = data.loop ?? false;
    this.mute = data.mute ?? false;
    this.sync = data.sync ?? false;
    this.volume = data.volume ?? 1;
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
      this.#element.addEventListener('emptied', () => { resolve() }, { once: true });
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

  async play(options?: {
    volume?: number;
    loop?: boolean;
    sync?: boolean;
  }): Promise<void> {
    const { volume, loop, sync } = options ?? {};
    this.volume = volume ?? this.volume;
    this.loop = loop ?? this.loop;
    this.sync = sync ?? this.sync;
    if (!this.loaded) {
      if (this.alwaysPreload) {
        console.warn(
          `Media ${this.name} is not preloaded. It may play with a delay.`,
        );
      }
      await this.preload();
    }
    // if (this.sync) {
    //   const syncTime = await EunosSockets.getInstance().call<number>("requestMediaSync", UserTargetRef.gm, {mediaName: this.name});
    //   kLog.log(`Syncing media ${this.name} to ${syncTime}`, this);
    //   if (Math.abs(syncTime - this.#element.currentTime) > 1) {
    //     this.#element.currentTime = syncTime;
    //   }
    // }
    this.#element.volume = this.volume;
    this.#element.loop = this.loop;
    try {
      await this.#element.play();
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
  async kill(): Promise<void> {
    if (!this.#element) {
      return;
    }
    kLog.log(`Found media "${this.name}", killing it ...`);
    await gsap.to(this.#element, { volume: 0, duration: 0.5, ease: "power2.in" });
    kLog.log(`... Awaited fade of "${this.name}", unloading.`);
    await this.unload();
  }


}
// #endregion
