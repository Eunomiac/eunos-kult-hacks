export {};
import ItemDataAbility from "../../../data-model/ItemDataAbility";
import ItemDataAdvantage from "../../../data-model/ItemDataAdvantage";
import ItemDataDarkSecret from "../../../data-model/ItemDataDarkSecret";
import ItemDataDisadvantage from "../../../data-model/ItemDataDisadvantage";
import ItemDataGear from "../../../data-model/ItemDataGear";
import ItemDataLimitation from "../../../data-model/ItemDataLimitation";
import ItemDataMove from "../../../data-model/ItemDataMove";
import ItemDataRelationship from "../../../data-model/ItemDataRelationship";
import ItemDataWeapon from "../../../data-model/ItemDataWeapon";

declare global {
  class k4ltitemsheet extends ItemSheet {
    get template(): string;
    override getData(): Promise<{
      system: ItemDataAbility | ItemDataAdvantage | ItemDataDarkSecret | ItemDataDisadvantage | ItemDataGear | ItemDataLimitation | ItemDataMove | ItemDataRelationship | ItemDataWeapon
    }>;
  }
}
//# sourceMappingURL=k4ltitemsheet.d.ts.map
