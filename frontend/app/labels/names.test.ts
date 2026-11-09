import { describe, expect, it } from "vitest";

import {
  canCarryOut,
  compareNames,
  joinName,
  labelTree,
  planMove,
  splitName,
  TOP_LEVEL,
  userLabelNames,
} from "./names";

describe("splitName and joinName", () => {
  it("split a nested name into its parent and own name", () => {
    expect(splitName("Work/Clients/Acme")).toEqual({ parent: "Work/Clients", leaf: "Acme" });
    expect(splitName("Work")).toEqual({ parent: TOP_LEVEL, leaf: "Work" });
  });

  it("join them back", () => {
    expect(joinName("Work/Clients", "Acme")).toBe("Work/Clients/Acme");
    expect(joinName(TOP_LEVEL, "Work")).toBe("Work");
  });
});

describe("compareNames", () => {
  it("sorts each parent directly before its children", () => {
    const names = ["Work Stuff", "Work/Invoices", "Archive", "Work", "Work/Invoices/2026"];
    expect(names.sort(compareNames)).toEqual([
      "Archive",
      "Work",
      "Work/Invoices",
      "Work/Invoices/2026",
      "Work Stuff",
    ]);
  });
});

describe("userLabelNames", () => {
  it("leaves out system labels", () => {
    const labels = [
      { name: "INBOX", type: "system" },
      { name: "Work", type: "user" },
    ];
    expect(userLabelNames(labels)).toEqual(["Work"]);
  });
});

describe("labelTree", () => {
  const draw = (names: string[]) => {
    const tree = labelTree(names);
    return [...names].sort(compareNames).map((name) => {
      const { guides, relativeName } = tree.get(name)!;
      const prefix = guides
        .map((continues, i) =>
          i === guides.length - 1 ? (continues ? "├ " : "└ ") : continues ? "│ " : "  ",
        )
        .join("");
      return prefix + relativeName;
    });
  };

  it("draws connector lines that stop at each branch's last child", () => {
    expect(
      draw(["Work", "Work/Clients", "Work/Clients/Acme", "Work/Invoices", "Work/Invoices/2026"]),
    ).toEqual(["Work", "├ Clients", "│ └ Acme", "└ Invoices", "  └ 2026"]);
  });

  it("nests under the closest existing ancestor, showing the rest of the name", () => {
    expect(draw(["Work", "Work/Clients/Acme", "Orphan/Child"])).toEqual([
      "Orphan/Child",
      "Work",
      "└ Clients/Acme",
    ]);
  });
});

describe("planMove", () => {
  const all = [
    "Archive",
    "Home",
    "Home/Clients",
    "Personal",
    "Work",
    "Work/Clients",
    "Work/Clients/Acme",
    "Work/Invoices",
  ];

  it("moves a label with everything inside it, keeping their shape", () => {
    const plan = planMove(["Work"], all, "Archive");
    expect(plan.problem).toBeNull();
    expect(plan.roots).toEqual([
      {
        name: "Work",
        newName: "Archive/Work",
        children: [
          { name: "Work/Clients", newName: "Archive/Work/Clients" },
          { name: "Work/Clients/Acme", newName: "Archive/Work/Clients/Acme" },
          { name: "Work/Invoices", newName: "Archive/Work/Invoices" },
        ],
      },
    ]);
  });

  it("moves a selected child with its selected parent instead of flattening it", () => {
    const plan = planMove(["Work", "Work/Clients"], all, "Archive");
    expect(plan.roots.map((root) => root.name)).toEqual(["Work"]);
    expect(plan.carried).toEqual([{ name: "Work/Clients", with: "Work" }]);
  });

  it("moves a nested label to the top level", () => {
    const plan = planMove(["Work/Invoices"], all, TOP_LEVEL);
    expect(plan.roots[0].newName).toBe("Invoices");
    expect(canCarryOut(plan)).toBe(true);
  });

  it("leaves labels that are already there alone, with anything selected inside them", () => {
    const plan = planMove(["Work/Clients", "Work/Clients/Acme"], all, "Work");
    expect(plan.unchanged).toEqual(["Work/Clients"]);
    expect(plan.carried).toEqual([{ name: "Work/Clients/Acme", with: "Work/Clients" }]);
    expect(canCarryOut(plan)).toBe(false);
  });

  it("refuses to move a label inside itself", () => {
    const plan = planMove(["Work"], all, "Work/Clients");
    expect(plan.problem).toMatch(/inside itself/);
    expect(canCarryOut(plan)).toBe(false);
  });

  it("refuses a move onto an existing label's name", () => {
    expect(planMove(["Work/Clients"], all, "Home").problem).toMatch(/"Home\/Clients"/);
  });

  it("refuses moving two labels to the same new name", () => {
    expect(planMove(["Work/Clients", "Home/Clients"], all, "Personal").problem).toMatch(
      /"Personal\/Clients"/,
    );
  });
});
