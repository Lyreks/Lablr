import { describe, expect, it } from "vitest";

import { sidebarRestrictionLookup } from "./visibility";

describe("sidebarRestrictionLookup", () => {
  const restrictionOf = sidebarRestrictionLookup([
    { name: "Work", labelListVisibility: "labelShowIfUnread" },
    { name: "Work/Clients", labelListVisibility: "labelHide" },
    { name: "Work/Clients/Acme", labelListVisibility: "labelShow" },
    { name: "Work/Notes", labelListVisibility: "labelShow" },
    { name: "Home", labelListVisibility: "labelShow" },
  ]);

  it("finds nothing for top-level labels or under labels that show", () => {
    expect(restrictionOf("Work")).toBeNull();
    expect(restrictionOf("Home/Recipes")).toBeNull();
  });

  it("names a 'show if unread' label above", () => {
    expect(restrictionOf("Work/Notes")).toEqual({ ancestor: "Work", hidden: false });
  });

  it("prefers the closest hidden label above, the stronger limit", () => {
    expect(restrictionOf("Work/Clients/Acme")).toEqual({ ancestor: "Work/Clients", hidden: true });
  });

  it("matches whole name parts only", () => {
    expect(restrictionOf("Workshop/Tools")).toBeNull();
  });
});
