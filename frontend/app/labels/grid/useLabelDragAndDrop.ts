import { type DragEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gridClasses } from "@mui/x-data-grid";

import type { Label } from "../api";
import { canCarryOut, type MovePlan, planMove, splitName, TOP_LEVEL, userLabelNames } from "../names";

type DropMark = "inside" | "above" | "below";

// Share of a top-level row's height, at each end, that targets the top level.
const EDGE_SHARE = 0.25;

// The tint is translucent because it overlays the row; the edge line is solid so row borders
// don't show through it.
const DROP_SHARE = 34;
const DROP_COLOR = `rgba(var(--mui-palette-primary-mainChannel) / ${DROP_SHARE / 100})`;
const DROP_LINE_COLOR = "var(--mui-palette-primary-main)";
const DROP_LINE_WIDTH = 6;

const NO_DROP = "no-drop";
const DROP_EDGES = "drop-edges";

// Same rules as the Move dialog.
function planDrop(group: Label[], labels: Label[], parent: string): MovePlan {
  return planMove(
    group.map((label) => label.name),
    userLabelNames(labels),
    parent,
  );
}

// setDragImage on the real chip captures what's around it too, so use a detached copy.
function showTagWhileDragging(event: DragEvent<HTMLElement>, chip: Element, name: string) {
  const style = getComputedStyle(chip);
  const tag = document.createElement("div");
  tag.textContent = name;
  Object.assign(tag.style, {
    position: "fixed",
    top: "-1000px",
    left: "-1000px",
    padding: "4px 8px",
    borderRadius: style.borderRadius,
    backgroundColor: style.backgroundColor,
    color: style.color,
    font: style.font,
    whiteSpace: "nowrap",
  });
  document.body.append(tag);
  event.dataTransfer.setDragImage(tag, 12, 12);
  // The image is captured synchronously during dragstart.
  setTimeout(() => tag.remove());
}

type Options = {
  labels: Label[];
  // Grabbing one of these drags them all.
  selected: Label[];
  onMoveOne: (label: Label, newName: string) => void;
  onMoveMany: (parent: string) => void;
};

/**
 * Drag-and-drop for the labels grid. Dropping on a row nests under it; dropping on the top or
 * bottom edge of a top-level row moves to the top level.
 *
 * Feedback is set on the row elements directly and handlers read from refs, so the grid doesn't
 * re-render mid-drag (which can cancel the drag in some browsers).
 */
export function useLabelDragAndDrop({ labels, selected, onMoveOne, onMoveMany }: Options) {
  const dragged = useRef<{ label: Label; group: Label[] } | null>(null);
  // State copy of the group, so rows can render whether they accept the drop.
  const [dragging, setDragging] = useState<Label[] | null>(null);
  const latest = useRef({ labels, selected, onMoveOne, onMoveMany });
  useLayoutEffect(() => {
    latest.current = { labels, selected, onMoveOne, onMoveMany };
  });
  const markedRow = useRef<HTMLElement | null>(null);

  // Handlers only read refs, so create them once.
  const handlers = useMemo(() => {
    // Only touch the DOM when the target changes; clearing on dragleave flickers, since it fires
    // between a row's child elements.
    const markRow = (row: HTMLElement | null, mark?: DropMark) => {
      if (markedRow.current && markedRow.current !== row) {
        delete markedRow.current.dataset.drop;
      }
      markedRow.current = row;
      if (row && mark && row.dataset.drop !== mark) {
        row.dataset.drop = mark;
      }
    };

    // Rows carry their label's id in data-id.
    const dropOn = (event: DragEvent<HTMLElement>) => {
      const drag = dragged.current;
      const row = event.currentTarget;
      const label = latest.current.labels.find((l) => String(l.id) === row.dataset.id);
      if (!drag || label?.type !== "user") return null;
      let spot: { parent: string; mark: DropMark } = { parent: label.name, mark: "inside" };
      if (splitName(label.name).parent === TOP_LEVEL) {
        const { top, height } = row.getBoundingClientRect();
        const y = event.clientY - top;
        if (y < height * EDGE_SHARE) spot = { parent: TOP_LEVEL, mark: "above" };
        else if (y > height * (1 - EDGE_SHARE)) spot = { parent: TOP_LEVEL, mark: "below" };
      }
      const plan = planDrop(drag.group, latest.current.labels, spot.parent);
      return canCarryOut(plan) ? { ...spot, drag, plan } : null;
    };

    return {
      dragSource: (label: Label) => ({
        draggable: true,
        onDragStart: (event: DragEvent<HTMLElement>) => {
          const { selected } = latest.current;
          const group =
            selected.length > 1 && selected.some((s) => s.id === label.id) ? selected : [label];
          dragged.current = { label, group };
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", group.map((l) => l.name).join("\n"));
          const chip = event.currentTarget
            .closest('[role="row"]')
            ?.querySelector("[data-drag-preview] > *");
          if (chip) {
            const leaf = splitName(label.name).leaf;
            showTagWhileDragging(event, chip, group.length > 1 ? `${leaf} +${group.length - 1}` : leaf);
          }
          // Deferred: re-rendering during dragstart can cancel the drag.
          setTimeout(() => setDragging(group));
        },
        onDragEnd: () => {
          dragged.current = null;
          markRow(null);
          setDragging(null);
        },
      }),

      rowProps: {
        onDragOver: (event: DragEvent<HTMLElement>) => {
          const drop = dropOn(event);
          if (drop) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            markRow(event.currentTarget, drop.mark);
          } else {
            markRow(null);
          }
        },
        onDrop: (event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          markRow(null);
          const drop = dropOn(event);
          if (!drop) return;
          if (drop.drag.group.length === 1) {
            latest.current.onMoveOne(drop.drag.label, drop.plan.roots[0].newName);
          } else {
            latest.current.onMoveMany(drop.parent);
          }
        },
      },

      // Clears feedback over non-droppable areas and when leaving the grid. Droppable rows call
      // preventDefault first.
      containerProps: {
        onDragOver: (event: DragEvent<HTMLElement>) => {
          if (dragged.current && !event.defaultPrevented) markRow(null);
        },
        onDragLeave: (event: DragEvent<HTMLElement>) => {
          const to = event.relatedTarget as Node | null;
          if (to && !event.currentTarget.contains(to)) markRow(null);
        },
      },
    };
  }, []);

  const takesTopLevel = dragging !== null && canCarryOut(planDrop(dragging, labels, TOP_LEVEL));
  const rowClassName = (row: Label) => {
    if (!dragging) return "";
    if (row.type !== "user") return NO_DROP;
    const nests = canCarryOut(planDrop(dragging, labels, row.name));
    const edges = takesTopLevel && splitName(row.name).parent === TOP_LEVEL;
    return [nests || edges ? "" : NO_DROP, edges ? DROP_EDGES : ""].join(" ").trim();
  };

  return { ...handlers, rowClassName, sx: dropStyles(dragging !== null) };
}

// Feedback is drawn with ::after so cell backgrounds can't cover it.
function dropStyles(dragging: boolean) {
  const row = `& .${gridClasses.row}`;
  return {
    [row]: { position: "relative" },
    // Raise the marked row so its edge line can overlap the next row.
    [`${row}[data-drop]`]: { zIndex: 2 },
    [`${row}[data-drop]::after`]: {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      pointerEvents: "none",
      zIndex: 1,
    },
    [`${row}[data-drop='inside']::after`]: { top: 0, bottom: 0, bgcolor: DROP_COLOR },
    // Centered on the row boundary, so "below" and the next row's "above" look the same.
    [`${row}[data-drop='above']::after`]: {
      top: -DROP_LINE_WIDTH / 2,
      height: DROP_LINE_WIDTH,
      bgcolor: DROP_LINE_COLOR,
    },
    [`${row}[data-drop='below']::after`]: {
      bottom: -DROP_LINE_WIDTH / 2,
      height: DROP_LINE_WIDTH,
      bgcolor: DROP_LINE_COLOR,
    },
    ...(dragging && {
      [`& .${NO_DROP}`]: {
        opacity: "var(--mui-palette-action-disabledOpacity, 0.38)",
        bgcolor: "action.disabledBackground",
        pointerEvents: "none",
      },
      // Faint hint where top-level drops are possible.
      [`& .${DROP_EDGES}:not([data-drop])`]: {
        boxShadow: `inset 0 1px 0 ${DROP_COLOR}, inset 0 -1px 0 ${DROP_COLOR}`,
      },
    }),
  };
}
