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
import { GamePhase } from "../scripts/enums";
import { UserTarget } from "../apps/EunosSockets";
import { type Location, type EunosMediaData } from "../scripts/constants";

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

  interface FlagConfig {
    Actor: {
      ["eunos-kult-hacks"]: {
        sheetTab: string;
      }
    };
  }



  interface SettingConfig {
    "core.rollMods": string;
    "eunos-kult-hacks.gamePhase": GamePhase;
    "eunos-kult-hacks.debug": number;
    "eunos-kult-hacks.useStabilityVariant": boolean;
    "eunos-kult-hacks.chapterTitle": string;
    "eunos-kult-hacks.chapterNumber": number;
    "eunos-kult-hacks.isPlottingLocations": boolean;
    "eunos-kult-hacks.isEntryVisible": boolean;
    "eunos-kult-hacks.currentLocation": string;
    "eunos-kult-hacks.locationData": Partial<Record<string, Location.SettingsData>>;
    "eunos-kult-hacks.nextGameSession": string; // ISO date string in Toronto timezone
    "eunos-kult-hacks.sessionScribeDeck": string[];
    "eunos-kult-hacks.sessionScribe": string;
    "eunos-kult-hacks.dramaticHookAssignments": Record<string, string>;
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
