import { numberToWords, wordsToNumber } from "./utilities";

export const SYSTEM_ID = "eunos-kult-hacks";

// #region STABILITY ~
export const STABILITY_VALUES = [
  { value: 10, label: "10 - Composed" },
  { value: 9, label: "9 - Moderate Stress" },
  { value: 8, label: "8 - Moderate Stress" },
  { value: 7, label: "7 - Serious Stress" },
  { value: 6, label: "6 - Serious Stress" },
  { value: 5, label: "5 - Serious Stress" },
  { value: 4, label: "4 - Critical Stress" },
  { value: 3, label: "3 - Critical Stress" },
  { value: 2, label: "2 - Critical Stress" },
  { value: 1, label: "1 - Critical Stress" },
  { value: 0, label: "0 - Broken: Draw from the KULT Tarot" },
];

export const STABILITY_STATES = [
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  [
    "irrational",
    "unhinged",
    "frantic",
    "paranoid",
    "hysterical",
    "dissociative",
    "euphoric",
  ],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["anxious", "shaken", "distressed", "agitated", "obsessing", "withdrawn"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["uneasy", "irritable", "nervous", "distracted"],
  ["composed", "calm", "confident", "at ease"],
];

export const STABILITY_MODIFIERS = [
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 <span class='move-name'>Keep It Together</span>",
    "&minus;3 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  [
    "&minus;1 <span class='move-name'>Keep It Together</span>",
    "&minus;2 to Disadvantage Rolls",
  ],
  ["&minus;1 to Disadvantage Rolls"],
  ["&minus;1 to Disadvantage Rolls"],
  [],
];
// #endregion

// #region WOUNDS ~
export const WOUND_MODIFIERS = {
  untendedCritical: [
    "+3 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCritical: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCriticalWithSerious: [
    "+2 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  multipleSerious: [
    "&minus;2 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>",
  ],
  singleSerious: [
    "&minus;1 to All Moves except <span class='move-name'>Endure Injury</span> and <span class='move-name'>See Through the Illusion</span>",
  ],
  none: [],
};
export const WOUND_MODIFIERS_GRITTED_TEETH = {
  untendedCritical: [
    "+3 <span class='move-name'>See Through the Illusion</span>",
    "&minus;3 to All Other Moves except <span class='move-name'>Endure Injury</span>",
    "<span class='death-alert'>Death Is Imminent</span>",
  ],
  fieldTendedCritical: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  fieldTendedCriticalWithSerious: [
    "+1 <span class='move-name'>See Through the Illusion</span>",
    "&minus;2 to All Other Moves except <span class='move-name'>Endure Injury</span>",
  ],
  multipleSerious: [],
  singleSerious: [],
  none: [],
};
// #endregion

// #region SESSION DATA~


/**
 * Gets the chapter string based on current chapter number or string
 * @param current - Current chapter number or string
 * @param isGettingNext - Whether to increment the chapter by one
 * @returns Chapter string
 */
export function getChapterString(num: number | string, isGettingNext = false): string {
  // Convert input to number
  num = typeof num === "string" ? wordsToNumber(num) : num;

  if (isGettingNext) {
    num = num + 1;
  }

  if (num === 0) return "Preamble";
  return `Chapter ${numberToWords(num)}`;
}

export function getNextChapter(current: number | string): string {
  // Convert input to number
  const currentNum = typeof current === "string" ? wordsToNumber(current) : current;

  return getChapterString(currentNum + 1);
}
