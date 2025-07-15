import { EunosMediaTypes } from "../scripts/enums";
import EunosMedia from "./EunosMedia";
import EunosOverlay from "./EunosOverlay";
import EunosSockets from "./EunosSockets";

export class EunosVolumeDialog extends Application {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "eunos-volume-control",
      classes: ["dialog", "eunos-volume-control"],
      template: "modules/eunos-kult-hacks/templates/dialog/volume-control.hbs",
      title: "Sound Volume Control",
      width: 600,
      height: "auto",
      closeOnSubmit: false
    });
  }

  override getData() {
    const playingSounds = EunosMedia.GetPlayingSounds()
      .filter(sound => sound.loop)
      .map(sound => ({
        name: sound.name,
        volume: sound.volume,
        displayName: sound.name.split("-").map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ")
      }));

    return {
      sounds: playingSounds
    };
  }

  override activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Debounce both local and remote updates
    const debouncedLocalUpdate = foundry.utils.debounce((sound: EunosMedia, volume: number) => {
      sound.setVolumeImmediate(volume);
    }, 50);  // More frequent for local updates

    const debouncedRemoteUpdate = foundry.utils.debounce(this.updateVolumes.bind(this), 100);

    html.find('.volume-slider').on('input', (event) => {
      const slider = event.currentTarget as HTMLInputElement;
      const soundName = slider.dataset["sound"];
      if (!soundName) {
        throw new Error("No sound name found in slider dataset.");
      }
      const volume = parseFloat(slider.value);

      // Update volume display
      const volumeDisplay = $(slider).closest('.volume-control-row').find('.volume-value');
      volumeDisplay.text(volume.toFixed(2));

      const sound = EunosMedia.GetMedia(soundName);
      if (sound) {
        debouncedLocalUpdate(sound, volume);
      }

      debouncedRemoteUpdate();
    });
  }

  private async updateVolumes(): Promise<void> {
    const volumes: Record<string, number> = {};

    EunosMedia.GetPlayingSounds()
      .filter(sound => sound.loop)
      .forEach(sound => {
        volumes[sound.name] = sound.volume;
      });

    // Send volume updates to all clients
    await Promise.all([
      EunosSockets.getInstance().call(
        "updateMediaVolumes",
        "all",
        { volumes }
      ),
      ...Object.entries(volumes).map(([soundName, volume]) =>
        EunosOverlay.instance.setVolumeOverride(soundName, volume)
      )
    ]);
  }
}
