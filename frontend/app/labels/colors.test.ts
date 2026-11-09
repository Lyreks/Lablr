import { describe, expect, it } from "vitest";

import type { Label } from "./api";
import { contrastingTextColor, customColors, presetColors, sameColor } from "./colors";

const label = (color: Label["color"]): Label => ({
  id: "id",
  name: "name",
  type: "user",
  labelListVisibility: null,
  messageListVisibility: null,
  color,
  messagesTotal: null,
  messagesUnread: null,
});

describe("contrastingTextColor", () => {
  it("picks dark text on light backgrounds and light text on dark ones", () => {
    expect(contrastingTextColor("#ffffff")).toBe("#000000");
    expect(contrastingTextColor("#1c4587")).toBe("#ffffff");
  });
});

describe("sameColor", () => {
  it("ignores letter case", () => {
    expect(
      sameColor(
        { textColor: "#FFFFFF", backgroundColor: "#A479E2" },
        { textColor: "#ffffff", backgroundColor: "#a479e2" },
      ),
    ).toBe(true);
  });
});

describe("customColors", () => {
  it("collects each non-preset combination once, leaving out presets and uncolored labels", () => {
    const custom = { textColor: "#43d692", backgroundColor: "#653e9b" };
    const labels = [
      label(presetColors[0]),
      label(custom),
      label({ textColor: "#43D692", backgroundColor: "#653E9B" }),
      label(null),
    ];
    expect(customColors(labels)).toEqual([custom]);
  });
});
