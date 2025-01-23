// import K4ActiveEffect from "../documents/K4ActiveEffect.js";
// import Document = foundry.abstract.Document;
// import K4PCSheet from "../documents/K4PCSheet.js";
// import K4NPCSheet from "../documents/K4NPCSheet.js";
// import K4ChatMessage from "../documents/K4ChatMessage.js";
// import K4Dialog from "../documents/K4Dialog.js";
// import K4Item from "../documents/K4Item.js";
// import K4Roll, {K4RollResult} from "../documents/K4Roll.js";
// import K4Scene from "../documents/K4Scene.js";

// import K4Config from "../scripts/config";
export {};
declare global {

  interface DocumentClassConfig {
    Actor: typeof k4ltActor;
  }

  // interface FlagConfig {
  //   ActiveEffect: {
  //     kult4th: Record<string, unknown> & {
  //       // data: Maybe<K4ActiveEffect.FlagData>
  //     };
  //   };
  //   Actor: {
  //     kult4th: {
  //       sheetTab: string;
  //     }
  //   };
  //   ChatMessage: {
  //     kult4th: {
  //       cssClasses: string[];
  //       isSummary: boolean;
  //       isAnimated: boolean;
  //       isRoll: boolean;
  //       isTrigger: boolean;
  //       // rollOutcome: Maybe<K4RollResult>;
  //       isEdge: boolean;
  //       // rollData: K4Roll.Serialized.Base;
  //     }
  //   }
  // }

  // interface SettingConfig {
  //   // Values: {
  //     "kult4th.debug": number;
  //     "kult4th.gears": boolean;
  //     "kult4th.shadows": boolean;
  //     "kult4th.blur": boolean;
  //     "kult4th.flare": boolean;
  //     "kult4th.animations": boolean;
  //     "kult4th.useStabilityVariant": boolean;
  //   // }
  // }

  // interface Game {
  //   // rolls: Collection<K4Roll>,
  // }

  // interface CONFIG {
  //   K4: typeof K4Config
  // }
}
