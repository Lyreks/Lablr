import { type DragEvent, useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GRID_CHECKBOX_SELECTION_COL_DEF,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridFilterItem,
  type GridFilterModel,
  type GridPaginationModel,
  type GridRowSelectionModel,
  type GridSortModel,
} from "@mui/x-data-grid";

import type { Label, LabelInput } from "./api";
import { InfoTooltip } from "./InfoTooltip";
import { LabelChip } from "./LabelChip";
import { DragIndicatorIcon } from "./icons";
import { EditableLabelChip } from "./LabelColorPicker";
import { MoveLabelsDialog } from "./MoveLabelsDialog";
import { compareNames, isSameOrNestedUnder, joinName, labelTree, planMove, splitName } from "./names";
import {
  sidebarRestrictionLookup,
  sidebarRestrictionText,
  labelListVisibility,
  messageListVisibility,
  optionText,
} from "./visibility";

const PAGE_SIZE_KEY = "lablr.labels.pageSize";
const SHOW_SYSTEM_KEY = "lablr.labels.showSystem";
const pageSizeOptions = [10, 25, 50, 100];
const TREE_STEP = 20;
const LINE_WIDTH = 2;
const GRIP_WIDTH = 24;

// A real grid filter, so it shows up in the filter panel.
const HIDE_SYSTEM_FILTER: GridFilterItem = {
  id: "hide-system-labels",
  field: "type",
  operator: "equals",
  value: "user",
};

// Not where it already is, and not inside itself.
const canMoveUnder = (name: string, parent: string) =>
  parent !== splitName(name).parent && (parent === "" || !isSameOrNestedUnder(parent, name));

type DropMark = "inside" | "above" | "below";

// Share of a top-level row's height, at each end, that targets the top level.
const EDGE_SHARE = 0.25;

// The tint is translucent because it overlays the row; the edge line is solid so row borders
// don't show through it.
const DROP_SHARE = 34;
const DROP_COLOR = `rgba(var(--mui-palette-primary-mainChannel) / ${DROP_SHARE / 100})`;
const DROP_LINE_COLOR = "var(--mui-palette-primary-main)";
const DROP_LINE_WIDTH = 6;

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

const hidesSystem = (filterModel: GridFilterModel) =>
  filterModel.items.some(
    (item) => item.field === "type" && item.operator === "equals" && item.value === "user",
  );

// localStorage can throw (private mode, blocked storage).
function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Best effort.
  }
}

function storedPageSize() {
  const pageSize = Number(stored(PAGE_SIZE_KEY));
  return pageSizeOptions.includes(pageSize) ? pageSize : pageSizeOptions[0];
}

const NOTHING_SELECTED: GridRowSelectionModel = { type: "include", ids: new Set() };

type LabelGridProps = {
  labels: Label[];
  onChange: (label: Label, input: Partial<LabelInput>) => void;
};

export function LabelGrid({ labels, onChange }: LabelGridProps) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(() => ({
    page: 0,
    pageSize: storedPageSize(),
  }));
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: "name", sort: "asc" }]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>(() => ({
    items: stored(SHOW_SYSTEM_KEY) === "true" ? [] : [HIDE_SYSTEM_FILTER],
  }));
  const showSystem = !hidesSystem(filterModel);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});

  const changeFilterModel = (model: GridFilterModel) => {
    setFilterModel(model);
    store(SHOW_SYSTEM_KEY, String(!hidesSystem(model)));
  };
  // Tree lines only make sense in name order.
  const showTree = sortModel[0]?.field === "name" && sortModel[0]?.sort === "asc";

  // Drag state lives in refs and feedback is set on row elements directly, so the grid doesn't
  // re-render mid-drag (which can cancel the drag in some browsers).
  const dragged = useRef<{ label: Label; group: Label[] } | null>(null);
  // State copy of the group, so rows can render whether they accept the drop.
  const [dragging, setDragging] = useState<Label[] | null>(null);

  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(NOTHING_SELECTED);
  // Bumping `count` remounts the dialog so it starts at `destination`.
  const [moveRequest, setMoveRequest] = useState({ open: false, count: 0, destination: "" });
  const openMove = (destination: string) =>
    setMoveRequest(({ count }) => ({ open: true, count: count + 1, destination }));
  // Select-all can produce an "exclude" model.
  const selected = labels.filter(
    (label) =>
      label.type === "user" &&
      rowSelectionModel.ids.has(label.id) === (rowSelectionModel.type === "include"),
  );

  const latest = useRef({ selected, labels });
  latest.current = { selected, labels };

  const canDrop = (parent: string) => {
    const drag = dragged.current;
    if (!drag) return false;
    if (drag.group.length === 1) return canMoveUnder(drag.label.name, parent);
    const userNames = latest.current.labels.filter((l) => l.type === "user").map((l) => l.name);
    const plan = planMove(drag.group.map((label) => label.name), userNames, parent);
    return plan.problem === null && plan.roots.length > 0;
  };

  // Edges of a top-level row target the top level; anywhere else nests. Rows carry their
  // label's id in data-id.
  const dropSpot = (event: DragEvent<HTMLElement>): { parent: string; mark: DropMark } | null => {
    const row = event.currentTarget;
    const label = latest.current.labels.find((l) => String(l.id) === row.dataset.id);
    if (label?.type !== "user") return null;
    if (splitName(label.name).parent === "") {
      const { top, height } = row.getBoundingClientRect();
      const y = event.clientY - top;
      if (y < height * EDGE_SHARE) return { parent: "", mark: "above" };
      if (y > height * (1 - EDGE_SHARE)) return { parent: "", mark: "below" };
    }
    return { parent: label.name, mark: "inside" };
  };

  // Only touch the DOM when the target changes; clearing on dragleave flickers, since it fires
  // between a row's child elements.
  const markedRow = useRef<HTMLElement | null>(null);
  const markRow = (row: HTMLElement | null, mark?: DropMark) => {
    if (markedRow.current && markedRow.current !== row) {
      delete markedRow.current.dataset.drop;
    }
    markedRow.current = row;
    if (row && mark && row.dataset.drop !== mark) {
      row.dataset.drop = mark;
    }
  };

  const rowDropHandlers = useMemo(
    () => ({
      onDragOver: (event: DragEvent<HTMLElement>) => {
        const spot = dropSpot(event);
        if (spot && canDrop(spot.parent)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          markRow(event.currentTarget, spot.mark);
        } else {
          markRow(null);
        }
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        markRow(null);
        const spot = dropSpot(event);
        const drag = dragged.current;
        if (!spot || !drag || !canDrop(spot.parent)) return;
        if (drag.group.length === 1) {
          onChange(drag.label, { name: joinName(spot.parent, splitName(drag.label.name).leaf) });
        } else {
          openMove(spot.parent);
        }
      },
    }),
    // The helpers only read refs and state setters, so they never go stale.
    [onChange],
  );

  const dragSource = useCallback(
    (label: Label) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        const { selected } = latest.current;
        const group = selected.length > 1 && selected.some((s) => s.id === label.id) ? selected : [label];
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
    [],
  );

  const columns = useMemo<GridColDef<Label>[]>(() => {
    const tree = labelTree(labels.map((label) => label.name));
    const sidebarRestriction = sidebarRestrictionLookup(labels);

    const visibilityColumn = (
      field: "labelListVisibility" | "messageListVisibility",
      { title, help, options }: { title: string; help: string; options: { value: string; text: string }[] },
    ): GridColDef<Label> => ({
      field,
      headerName: title,
      flex: 1,
      minWidth: 160,
      valueGetter: (_, row) => optionText(options, row[field]),
      renderHeader: () => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
          {title}
          <InfoTooltip text={help} />
        </Box>
      ),
      renderCell: ({ row, formattedValue }) => {
        if (row.type !== "user") {
          return formattedValue;
        }
        // Disabled when a parent overrides it. Still editable on the detail page.
        const restriction = field === "labelListVisibility" ? sidebarRestriction(row.name) : null;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
            <TextField
              select
              variant="standard"
              disabled={restriction !== null}
              value={row[field] ?? options[0].value}
              onChange={(event) => onChange(row, { [field]: event.target.value })}
              onKeyDown={(event) => event.stopPropagation()}
              slotProps={{
                input: { disableUnderline: true, sx: { fontSize: "inherit" } },
                select: { SelectDisplayProps: { "aria-label": `${title}: ${row.name}` } },
              }}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: "0.875rem" }}>
                  {option.text}
                </MenuItem>
              ))}
            </TextField>
            {restriction && (
              <InfoTooltip
                text={`${sidebarRestrictionText(restriction)} Change it on the label's page.`}
              />
            )}
          </Box>
        );
      },
    });

    return [
      {
        field: "__drag__",
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
      },
      GRID_CHECKBOX_SELECTION_COL_DEF,
      {
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
            to: `/labels/${encodeURIComponent(row.id)}`,
            title: row.name,
          };
          if (row.type !== "user") {
            return (
              <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
                {showTree && node && <TreeGuides guides={node.guides} />}
                <LabelChip {...chip} />
              </Box>
            );
          }
          return (
            <Box
              sx={{ display: "flex", alignItems: "center", height: "100%" }}
            >
              {showTree && node && <TreeGuides guides={node.guides} />}
              <Box data-drag-preview>
                <EditableLabelChip {...chip} onColorChange={(color) => onChange(row, { color })} />
              </Box>
            </Box>
          );
        },
      },
      {
        field: "type",
        headerName: "Type",
        flex: 1,
        minWidth: 100,
        renderCell: ({ row }) => (
          <Chip label={row.type} size="small" variant={row.type === "user" ? "filled" : "outlined"} />
        ),
      },
      visibilityColumn("labelListVisibility", labelListVisibility),
      visibilityColumn("messageListVisibility", messageListVisibility),
    ];
  }, [labels, onChange, showTree, dragSource]);

  return (
    <Stack
      spacing={1}
      // Clears feedback over non-droppable areas and when leaving the grid. Droppable rows call
      // preventDefault first.
      onDragOver={(event) => {
        if (dragged.current && !event.defaultPrevented) markRow(null);
      }}
      onDragLeave={(event) => {
        const to = event.relatedTarget as Node | null;
        if (to && !event.currentTarget.contains(to)) markRow(null);
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          {selected.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2">{selected.length} selected</Typography>
              <Button variant="contained" size="small" onClick={() => openMove("")}>
                Move to…
              </Button>
              <Button size="small" onClick={() => setRowSelectionModel(NOTHING_SELECTED)}>
                Clear
              </Button>
            </Stack>
          )}
        </Box>
        <FormControlLabel
          label="Show system labels"
          control={
          <Switch
            checked={showSystem}
            onChange={(_, show) =>
              changeFilterModel({
                ...filterModel,
                items: show
                  ? filterModel.items.filter((item) => item.field !== "type")
                  : [...filterModel.items.filter((item) => item.field !== "type"), HIDE_SYSTEM_FILTER],
              })
            }
          />
        }
        />
      </Stack>
      <DataGrid
        rows={labels}
        columns={columns}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={pageSizeOptions}
        paginationModel={paginationModel}
        onPaginationModelChange={(model) => {
          setPaginationModel(model);
          store(PAGE_SIZE_KEY, String(model.pageSize));
        }}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={changeFilterModel}
        getRowClassName={({ row }) => {
          if (row.type === "system") return "system-label";
          if (!dragging) return "";
          const nest = canDrop(row.name);
          const edges = splitName(row.name).parent === "" && canDrop("");
          return [nest || edges ? "" : "no-drop", edges ? "drop-edges" : ""].join(" ");
        }}
        slotProps={{ row: rowDropHandlers }}
        sx={{
          // Feedback is drawn with ::after so cell backgrounds can't cover it.
          "& .MuiDataGrid-row": { position: "relative" },
          // Raise the marked row so its edge line can overlap the next row.
          "& .MuiDataGrid-row[data-drop]": { zIndex: 2 },
          "& .MuiDataGrid-row[data-drop]::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            pointerEvents: "none",
            zIndex: 1,
          },
                "& .MuiDataGrid-row[data-drop='inside']::after": {
            top: 0,
            bottom: 0,
            bgcolor: DROP_COLOR,
          },
          // Centered on the row boundary, so "below" and the next row's "above" look the same.
          "& .MuiDataGrid-row[data-drop='above']::after": {
            top: -DROP_LINE_WIDTH / 2,
            height: DROP_LINE_WIDTH,
            bgcolor: DROP_LINE_COLOR,
          },
          "& .MuiDataGrid-row[data-drop='below']::after": {
            bottom: -DROP_LINE_WIDTH / 2,
            height: DROP_LINE_WIDTH,
            bgcolor: DROP_LINE_COLOR,
          },
          ...(dragging && {
            "& .system-label, & .no-drop": {
              opacity: "var(--mui-palette-action-disabledOpacity, 0.38)",
              bgcolor: "action.disabledBackground",
              pointerEvents: "none",
            },
            // Faint hint where top-level drops are possible.
            "& .drop-edges:not([data-drop])": {
              boxShadow:
                `inset 0 1px 0 ${DROP_COLOR}, ` +
                `inset 0 -1px 0 ${DROP_COLOR}`,
            },
          }),
        }}
        // Type is only useful while system labels are shown.
        columnVisibilityModel={{ ...columnVisibilityModel, type: showSystem }}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        checkboxSelection
        isRowSelectable={({ row }) => row.type === "user"}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
      />
      <MoveLabelsDialog
        key={moveRequest.count}
        open={moveRequest.open}
        initialDestination={moveRequest.destination}
        selected={selected}
        labels={labels}
        onClose={() => setMoveRequest((request) => ({ ...request, open: false }))}
        onMoved={() => setRowSelectionModel(NOTHING_SELECTED)}
      />
    </Stack>
  );
}

// │ ├ └ connector lines for a nested label, one column per level (see TreeNode.guides).
function TreeGuides({ guides }: { guides: boolean[] }) {
  const line = { content: '""', position: "absolute" } as const;
  // Must come after the border shorthands, which reset the color.
  const lineColor = { borderColor: "divider" } as const;
  return guides.map((continues, level) => {
    const isOwn = level === guides.length - 1;
    return (
      <Box
        key={level}
        aria-hidden
        sx={{
          position: "relative",
          alignSelf: "stretch",
          width: TREE_STEP,
          flexShrink: 0,
          // Full height to continue past this row, half height to end in └.
          "&::before": (isOwn || continues) ? {
            ...line,
            left: TREE_STEP / 2 - 1,
            top: 0,
            bottom: isOwn && !continues ? `calc(50% - ${LINE_WIDTH / 2}px)` : 0,
            borderLeft: LINE_WIDTH,
            ...lineColor,
          } : undefined,
          "&::after": isOwn ? {
            ...line,
            left: TREE_STEP / 2 - 1,
            right: 2,
            top: `calc(50% - ${LINE_WIDTH / 2}px)`,
            borderTop: LINE_WIDTH,
            ...lineColor,
          } : undefined,
        }}
      />
    );
  });
}
