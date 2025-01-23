import Document = foundry.abstract.Document;

export default class Macros {
    static createK4ltMacro: (dropData: Document.DropData<Macro.ConfiguredInstance>, slot: number) => Promise<false | undefined>;
    /**
     * @description Create a macro
     *  All macros are flaged with a k4lt.macro flag at true
     * @param {*} slot
     * @param {*} name
     * @param {*} command
     * @param {*} img
     */
    static createMacro: (slot: number, name: string, command: string, img: string) => Promise<void>;
}
//# sourceMappingURL=macros.d.ts.map
