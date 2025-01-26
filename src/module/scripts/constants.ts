export const STABILITY_STATES = [
  ["irrational", "unhinged", "frantic", "paranoid", "hysterical", "dissociative", "euphoric"],
  ["irrational", "unhinged", "frantic", "paranoid", "hysterical", "dissociative", "euphoric"],
  ["irrational", "unhinged", "frantic", "paranoid", "hysterical", "dissociative", "euphoric"],
  ["irrational", "unhinged", "frantic", "paranoid", "hysterical", "dissociative", "euphoric"],
  ["irrational", "unhinged", "frantic", "paranoid", "hysterical", "dissociative", "euphoric"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["composed", "calm", "confident", "at ease"],
];

export const STABILITY_MODIFIERS = [
  ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 <span class='move-name'>Keep It Together</span>", "&minus;3 to Disadvantage Rolls"],
  ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 <span class='move-name'>Keep It Together</span>", "&minus;3 to Disadvantage Rolls"],
  ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 <span class='move-name'>Keep It Together</span>", "&minus;3 to Disadvantage Rolls"],
  ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 <span class='move-name'>Keep It Together</span>", "&minus;3 to Disadvantage Rolls"],
  ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 <span class='move-name'>Keep It Together</span>", "&minus;3 to Disadvantage Rolls"],
  ["&minus;1 <span class='move-name'>Keep It Together</span>", "&minus;2 to Disadvantage Rolls"],
  ["&minus;1 <span class='move-name'>Keep It Together</span>", "&minus;2 to Disadvantage Rolls"],
  ["&minus;1 <span class='move-name'>Keep It Together</span>", "&minus;2 to Disadvantage Rolls"],
  ["&minus;1 to Disadvantage Rolls"],
  ["&minus;1 to Disadvantage Rolls"],
  [],
];

export const WOUND_MODIFIERS = {
  "untendedCritical": ["+3 <span class='move-name'>See Through the Illusion</span>", "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>"],
  "fieldTendedCritical": ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>"],
  "fieldTendedCriticalWithSerious": ["+2 <span class='move-name'>See Through the Illusion</span>", "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>"],
  "multipleSerious": ["&minus;2 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>"],
  "singleSerious": ["&minus;1 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>"],
  "none": [],
};
export const WOUND_MODIFIERS_GRITTED_TEETH = {
  "untendedCritical": ["+3 <span class='move-name'>See Through the Illusion</span>", "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>", "<span class='death-alert'>Death Is Imminent</span>"],
  "fieldTendedCritical": ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>"],
  "fieldTendedCriticalWithSerious": ["+1 <span class='move-name'>See Through the Illusion</span>", "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>"],
  "multipleSerious": [],
  "singleSerious": [],
  "none": [],
};
