import { STABILITY_MODIFIERS, STABILITY_STATES } from "../../scripts/constants";

export default function overridePCSheet() {
  // @ts-expect-error - The existing sheet classes haven't been registered with TypeScript yet.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const pcSheet: typeof ActorSheet = CONFIG.Actor.sheetClasses.pc["k4lt.k4ltPCsheet"].cls as typeof ActorSheet;

  class EunosPCSheet extends pcSheet {
    override get template() {
      return `modules/eunos-kult-hacks/templates/sheets/pc-sheet.hbs`;
    }

    override getData() {
      const data = super.getData() as {
        system: {
          stability: {
            value: string;
          };
          stabilityValues: {
            value: string;
            label: string;
          }[];
          stabilityStates: string;
          stabilityModifiers: string[];
        };
      };
      const stabilityVal = parseInt(data.system.stability.value, 10);
      data.system.stabilityValues = [
        {value: "0", label: "10 - Composed"},
        {value: "1", label: "9 - Moderate Stress"},
        {value: "2", label: "8 - Moderate Stress"},
        {value: "3", label: "7 - Serious Stress"},
        {value: "4", label: "6 - Serious Stress"},
        {value: "5", label: "5 - Serious Stress"},
        {value: "6", label: "4 - Critical Stress"},
        {value: "7", label: "3 - Critical Stress"},
        {value: "8", label: "2 - Critical Stress"},
        {value: "9", label: "1 - Critical Stress"},
        {value: "10", label: "0 - Broken: Draw from the KULT Tarot"},
      ];
      data.system.stabilityStates = (STABILITY_STATES[stabilityVal] ?? []).join(", ");
      data.system.stabilityModifiers = STABILITY_MODIFIERS[stabilityVal] ?? [];
      return data;
    }
  }

  Actors.unregisterSheet("k4lt", pcSheet);
  Actors.registerSheet("k4lt", EunosPCSheet, { types: ["pc"], makeDefault: true });
}
