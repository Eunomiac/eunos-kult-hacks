export {};
declare global {
  class k4ltActor extends Actor {
    override prepareBaseData(): void;
    _preparePCData(): void;
    get hasUnstabilizedMajorWounds(): boolean;
    get hasUnstabilizedCriticalWound(): boolean;
    displayRollResult({
      roll,
      moveName,
      resultText,
      moveResultText,
      optionsText,
      rollMode,
    }: {
      roll: Roll;
      moveName: string;
      resultText: string;
      moveResultText: string;
      optionsText: string;
      rollMode: string;
    }): Promise<void>;
    moveroll(moveID: string): Promise<void>;
    _attributeAsk(): Promise<string>;
    updateConditionCount(): number;
  }
}
//# sourceMappingURL=k4ltActor.d.ts.map
