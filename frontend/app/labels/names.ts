// Gmail nests labels by name: "Work/Invoices" shows up under "Work".

export const TOP_LEVEL = "";

export function userLabelNames(labels: { name: string; type: string }[]) {
  return labels.filter((label) => label.type === "user").map((label) => label.name);
}

export function splitName(name: string) {
  const slash = name.lastIndexOf("/");
  return slash < 0
    ? { parent: "", leaf: name }
    : { parent: name.slice(0, slash), leaf: name.slice(slash + 1) };
}

export function joinName(parent: string, leaf: string) {
  return parent ? `${parent}/${leaf}` : leaf;
}

export function isSameOrNestedUnder(name: string, ancestor: string) {
  return name === ancestor || name.startsWith(`${ancestor}/`);
}

// Everything nested under `ancestor`, at any depth
export function nestedUnder<T extends { name: string }>(labels: T[], ancestor: string) {
  return labels.filter((label) => label.name.startsWith(`${ancestor}/`));
}

// Sorts each parent directly before its children.
export function compareNames(a: string, b: string) {
  const aParts = a.split("/");
  const bParts = b.split("/");
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const order = aParts[i].localeCompare(bParts[i]);
    if (order !== 0) return order;
  }
  return aParts.length - bParts.length;
}

export type MovePlan = {
  // Labels to rename, each with its descendants.
  roots: { name: string; newName: string; children: { name: string; newName: string }[] }[];
  // Selected labels inside another selected label; they move with it.
  carried: { name: string; with: string }[];
  // Selected labels already under the destination.
  unchanged: string[];
  problem: string | null;
};

// Plans moving `selected` and their descendants under `destination`, keeping the hierarchy:
// moving "Work" into "Archive" turns "Work/Invoices" into "Archive/Work/Invoices".
export function planMove(selected: string[], allNames: string[], destination: string): MovePlan {
  const sorted = [...new Set(selected)].sort(compareNames);
  const plan: MovePlan = { roots: [], carried: [], unchanged: [], problem: null };

  for (const name of sorted) {
    const outer = plan.roots.find((root) => isSameOrNestedUnder(name, root.name))?.name
      ?? plan.unchanged.find((kept) => isSameOrNestedUnder(name, kept));
    if (outer) {
      plan.carried.push({ name, with: outer });
      continue;
    }
    if (destination !== "" && isSameOrNestedUnder(destination, name)) {
      plan.problem = `"${name}" can't be moved inside itself.`;
      return plan;
    }
    const newName = joinName(destination, splitName(name).leaf);
    if (newName === name) {
      plan.unchanged.push(name);
      continue;
    }
    const children = allNames
      .filter((other) => other !== name && isSameOrNestedUnder(other, name))
      .sort(compareNames)
      .map((child) => ({ name: child, newName: newName + child.slice(name.length) }));
    plan.roots.push({ name, newName, children });
  }

  // No clashes with each other or with labels that aren't moving.
  const moving = new Set(plan.roots.flatMap((root) => [root.name, ...root.children.map((c) => c.name)]));
  const staying = new Set(allNames.filter((name) => !moving.has(name)));
  const taken = new Set<string>();
  for (const { newName } of plan.roots.flatMap((root) => [root, ...root.children])) {
    if (staying.has(newName) || taken.has(newName)) {
      plan.problem = `There would be two labels called "${newName}".`;
      return plan;
    }
    taken.add(newName);
  }
  return plan;
}

export const canCarryOut = (plan: MovePlan) => plan.problem === null && plan.roots.length > 0;

export type TreeNode = {
  // Name relative to the closest existing ancestor ("Work/Invoices/2026" → "Invoices/2026").
  relativeName: string;
  // Per nesting level, outermost first: whether that level's line continues below this row.
  // The last entry is this label's own connector (├ if true, └ if false).
  guides: boolean[];
};

// Tree layout for drawing labels in compareNames order; each nests under its closest ancestor.
export function labelTree(names: string[]) {
  const existing = new Set(names);
  const ancestorsOf = (name: string) => {
    const parts = name.split("/");
    return parts
      .slice(1)
      .map((_, i) => parts.slice(0, i + 1).join("/"))
      .filter((ancestor) => existing.has(ancestor));
  };

  const lastChild = new Map<string, string>();
  for (const name of [...names].sort(compareNames)) {
    lastChild.set(ancestorsOf(name).at(-1) ?? "", name);
  }
  const isLast = (name: string) => lastChild.get(ancestorsOf(name).at(-1) ?? "") === name;

  const tree = new Map<string, TreeNode>();
  for (const name of names) {
    const ancestors = ancestorsOf(name);
    // One guide per ancestor below the top level, plus this label.
    const path = [...ancestors, name].slice(1);
    const parent = ancestors.at(-1);
    tree.set(name, {
      relativeName: parent ? name.slice(parent.length + 1) : name,
      guides: path.map((node) => !isLast(node)),
    });
  }
  return tree;
}
