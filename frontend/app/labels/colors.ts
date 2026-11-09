import type { Label, LabelColor } from "./api";

// The only colors Gmail accepts for labels, ordered like Google's color picker:
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels#color
// Legacy values the API also accepts (e.g. #4986e7) are omitted.
export const paletteColors = [
  ["#000000", "#434343", "#666666", "#999999", "#cccccc", "#efefef", "#f3f3f3", "#ffffff"],
  ["#fb4c2f", "#ffad47", "#fad165", "#16a766", "#43d692", "#4a86e8", "#a479e2", "#f691b3"],
  ["#f6c5be", "#ffe6c7", "#fef1d1", "#b9e4d0", "#c6f3de", "#c9daf8", "#e4d7f5", "#fcdee8"],
  ["#efa093", "#ffd6a2", "#fce8b3", "#89d3b2", "#a0eac9", "#a4c2f4", "#d0bcf1", "#fbc8d9"],
  ["#e66550", "#ffbc6b", "#fcda83", "#44b984", "#68dfa9", "#6d9eeb", "#b694e8", "#f7a7c0"],
  ["#cc3a21", "#eaa041", "#f2c960", "#149e60", "#3dc789", "#3c78d8", "#8e63ce", "#e07798"],
  ["#ac2b16", "#cf8933", "#d5ae49", "#0b804b", "#2a9c68", "#285bac", "#653e9b", "#b65775"],
  ["#822111", "#a46a21", "#aa8831", "#076239", "#1a764d", "#1c4587", "#41236d", "#83334c"],
].flat();

// Used when only a text color is picked for an uncolored label.
export const DEFAULT_BACKGROUND = "#efefef";

export function contrastingTextColor(backgroundColor: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(backgroundColor.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
}

const pair = (backgroundColor: string, textColor: string): LabelColor => ({ backgroundColor, textColor });

// Gmail's preset pairs in picker order (4 rows of 6).
export const presetColors: LabelColor[] = [
  pair("#e7e7e7", "#464646"),
  pair("#b6cff5", "#0d3472"),
  pair("#98d7e4", "#0d3b44"),
  pair("#e3d7ff", "#3d188e"),
  pair("#fbd3e0", "#711a36"),
  pair("#f2b2a8", "#8a1c0a"),

  pair("#666666", "#ffffff"),
  pair("#285bac", "#ffffff"),
  pair("#2da2bb", "#ffffff"),
  pair("#8e63ce", "#ffffff"),
  pair("#b65775", "#ffffff"),
  pair("#cc3a21", "#ffffff"),

  pair("#ffc8af", "#7a2e0b"),
  pair("#ffdeb5", "#7a4706"),
  pair("#fbe983", "#594c05"),
  pair("#fdedc1", "#684e07"),
  pair("#b3efd3", "#0b4f30"),
  pair("#a2dcc1", "#04502e"),

  pair("#ff7537", "#7a2e0b"),
  pair("#ffad46", "#7a4706"),
  pair("#ebdbde", "#662e37"),
  pair("#cca6ac", "#662e37"),
  pair("#42d692", "#000000"),
  pair("#16a765", "#094228"),
];

export function normalizeColor(color: LabelColor): LabelColor {
  return {
    backgroundColor: color.backgroundColor.toLowerCase(),
    textColor: color.textColor.toLowerCase(),
  };
}

export function sameColor(a: LabelColor | null, b: LabelColor | null) {
  if (a === null || b === null) return a === b;
  const [x, y] = [normalizeColor(a), normalizeColor(b)];
  return x.backgroundColor === y.backgroundColor && x.textColor === y.textColor;
}

export function isPreset(color: LabelColor) {
  return presetColors.some((preset) => sameColor(preset, color));
}

// The API doesn't expose Gmail's saved custom colors, so derive them from labels in use.
export function customColors(labels: Label[]) {
  const custom: LabelColor[] = [];
  for (const { color } of labels) {
    if (color && !isPreset(color) && !custom.some((known) => sameColor(known, color))) {
      custom.push(normalizeColor(color));
    }
  }
  return custom;
}
