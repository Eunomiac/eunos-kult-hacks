export {};
declare global {
  class k4ltPCsheet extends ActorSheet {
    /** @override */
    static override get defaultOptions(): any;
    /** @override */
    override get template(): string;
    /** @override */
    override getData(): any;
    /** @override */
    override activateListeners(html: any): void;
    _onUpdateWound(ev: any): void;
    _onUpdateCondition(ev: any): void;
    updateConditionBadge(): void;
    _onUpdateAdvancement(ev: any): void;
  }
}
//# sourceMappingURL=k4ltPCsheet.d.ts.map
