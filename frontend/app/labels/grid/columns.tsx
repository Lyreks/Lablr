import { Box, Chip } from "@mui/material";
import { GRID_CHECKBOX_SELECTION_COL_DEF, type GridColDef } from "@mui/x-data-grid";

import { DragIndicatorIcon } from "../../components/icons";
import { InfoTooltip } from "../../components/InfoTooltip";
import type { Label, LabelInput } from "../api";
import { LabelChip } from "../chip/LabelChip";
import { VisibilitySelect } from "../form/VisibilitySelect";
import { compareNames, labelTree, type TreeNode } from "../names";
import {
  labelListVisibility,
  messageListVisibility,
  optionText,
  type SidebarRestriction,
  sidebarRestrictionLookup,
  sidebarRestrictionText,
} from "../visibility";
import { TreeGuides } from "./TreeGuides";
import type { useLabelDragAndDrop } from "./useLabelDragAndDrop";

export const DRAG_FIELD = "__drag__";
const GRIP_WIDTH = 24;

export const labelPath = (label: Label) => `/labels/${encodeURIComponent(label.id)}`;

type ChangeLabel = (label: Label, input: Partial<LabelInput>) => void;

type ColumnOptions = {
  labels: Label[];
  // Draws tree lines and relative names; only makes sense in name order
  showTree: boolean;
  dragSource: ReturnType<typeof useLabelDragAndDrop>["dragSource"];
  onChange: ChangeLabel;
};

export function labelColumns({ labels, showTree, dragSource, onChange }: ColumnOptions): GridColDef<Label>[] {
  const tree = labelTree(labels.map((label) => label.name));
  const sidebarRestriction = sidebarRestrictionLookup(labels);
  return [
    dragColumn(dragSource),
    GRID_CHECKBOX_SELECTION_COL_DEF,
    nameColumn(tree, showTree, onChange),
    typeColumn(),
    visibilityColumn("labelListVisibility", labelListVisibility, onChange, sidebarRestriction),
    visibilityColumn("messageListVisibility", messageListVisibility, onChange, () => null),
  ];
}

function dragColumn(dragSource: ColumnOptions["dragSource"]): GridColDef<Label> {
  return {
    field: DRAG_FIELD,
    headerName: "",
    width: GRIP_WIDTH + 12,
    sortable: false,
    filterable: false,
    hideable: false,
    resizable: false,
    disableColumnMenu: true,
    renderCell: ({ row }) =>
      row.type === "user" && (
        <Box
          {...dragSource(row)}
          aria-hidden
          title="Drag onto another label to nest it (with the rest of the selection, if it's selected)"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "text.disabled",
            cursor: "grab",
            "&:hover": { color: "text.secondary" },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      ),
  };
}

function nameColumn(tree: Map<string, TreeNode>, showTree: boolean, onChange: ChangeLabel): GridColDef<Label> {
  return {
    field: "name",
    headerName: "Name",
    flex: 2,
    minWidth: 240,
    sortComparator: compareNames,
    renderCell: ({ row }) => {
      const node = tree.get(row.name);
      const chip = {
        name: showTree && node ? node.relativeName : row.name,
        color: row.color,
        to: labelPath(row),
        title: row.name,
      };
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          {showTree && node && <TreeGuides guides={node.guides} />}
          {row.type === "user" ? (
            // Source for the drag preview (see showTagWhileDragging).
            <Box data-drag-preview>
              <LabelChip {...chip} onColorChange={(color) => onChange(row, { color })} />
            </Box>
          ) : (
            <LabelChip {...chip} />
          )}
        </Box>
      );
    },
  };
}

function typeColumn(): GridColDef<Label> {
  return {
    field: "type",
    headerName: "Type",
    flex: 1,
    minWidth: 100,
    renderCell: ({ row }) => (
      <Chip label={row.type} size="small" variant={row.type === "user" ? "filled" : "outlined"} />
    ),
  };
}

function visibilityColumn(
  field: "labelListVisibility" | "messageListVisibility",
  setting: typeof labelListVisibility | typeof messageListVisibility,
  onChange: ChangeLabel,
  restrictionOf: (name: string) => SidebarRestriction | null,
): GridColDef<Label> {
  return {
    field,
    headerName: setting.title,
    flex: 1,
    minWidth: 160,
    valueGetter: (_, row) => optionText(setting.options, row[field]),
    renderHeader: () => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
        {setting.title}
        <InfoTooltip text={setting.help} />
      </Box>
    ),
    renderCell: ({ row, formattedValue }) => {
      if (row.type !== "user") {
        return formattedValue;
      }
      // Disabled when a parent overrides it. Still editable on the detail page.
      const restriction = restrictionOf(row.name);
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
          <VisibilitySelect
            compact
            setting={setting}
            labelName={row.name}
            value={row[field] ?? setting.options[0].value}
            onChange={(value) => onChange(row, { [field]: value })}
            disabled={restriction !== null}
          />
          {restriction && (
            <InfoTooltip text={`${sidebarRestrictionText(restriction)} Change it on the label's page.`} />
          )}
        </Box>
      );
    },
  };
}
