import EunosItem from "../documents/EunosItem.ts";
import ActorDataPC from "../data-model/ActorDataPC";
import ActorDataNPC from "../data-model/ActorDataNPC";
import ItemDataAbility from "../data-model/ItemDataAbility";
import ItemDataAdvantage from "../data-model/ItemDataAdvantage";
import ItemDataDarkSecret from "../data-model/ItemDataDarkSecret";
import ItemDataDisadvantage from "../data-model/ItemDataDisadvantage";
import ItemDataFamily from "../data-model/ItemDataFamily";
import ItemDataGear from "../data-model/ItemDataGear";
import ItemDataLimitation from "../data-model/ItemDataLimitation";
import ItemDataMove from "../data-model/ItemDataMove";
import ItemDataOccupation from "../data-model/ItemDataOccupation";
import ItemDataRelationship from "../data-model/ItemDataRelationship";
import ItemDataWeapon from "../data-model/ItemDataWeapon";
import { GamePhase } from "../../module/scripts/enums";
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
    Actor: typeof EunosActor;
    Item: typeof EunosItem;
  }

  interface DataModelConfig {
    Actor: {
      pc: ActorDataPC;
      npc: ActorDataNPC;
    }
    Item: {
      ability: ItemDataAbility;
      advantage: ItemDataAdvantage;
      darksecret: ItemDataDarkSecret;
      disadvantage: ItemDataDisadvantage;
      family: ItemDataFamily;
      gear: ItemDataGear;
      limitation: ItemDataLimitation;
      move: ItemDataMove;
      occupation: ItemDataOccupation;
      relationship: ItemDataRelationship;
      weapon: ItemDataWeapon;
    }
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

  interface SettingConfig {
    "core.rollMods": string;
    "eunos-kult-hacks.gamePhase": GamePhase;
    "eunos-kult-hacks.debug": number;
    "eunos-kult-hacks.useStabilityVariant": boolean;
  }

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
