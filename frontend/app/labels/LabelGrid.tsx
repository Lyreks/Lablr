import { useMemo, useState } from "react";
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

import { readStored, writeStored } from "../storage";
import type { Label, LabelInput } from "./api";
import { DragIndicatorIcon } from "./icons";
import { InfoTooltip } from "./InfoTooltip";
import { LabelChip } from "./LabelChip";
import { EditableLabelChip } from "./EditableLabelChip";
import { MoveLabelsDialog } from "./MoveLabelsDialog";
import { compareNames, labelTree, TOP_LEVEL } from "./names";
import { TreeGuides } from "./TreeGuides";
import { useLabelDragAndDrop } from "./useLabelDragAndDrop";
import {
  labelListVisibility,
  messageListVisibility,
  optionText,
  sidebarRestrictionLookup,
  sidebarRestrictionText,
} from "./visibility";

const PAGE_SIZE_KEY = "lablr.labels.pageSize";
const SHOW_SYSTEM_KEY = "lablr.labels.showSystem";
const pageSizeOptions = [10, 25, 50, 100];
const GRIP_WIDTH = 24;

// A real grid filter, so it shows up in the filter panel.
const HIDE_SYSTEM_FILTER: GridFilterItem = {
  id: "hide-system-labels",
  field: "type",
  operator: "equals",
  value: "user",
};

const hidesSystem = (filterModel: GridFilterModel) =>
  filterModel.items.some(
    (item) => item.field === "type" && item.operator === "equals" && item.value === "user",
  );

function storedPageSize() {
  const pageSize = Number(readStored(PAGE_SIZE_KEY));
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
    items: readStored(SHOW_SYSTEM_KEY) === "true" ? [] : [HIDE_SYSTEM_FILTER],
  }));
  const showSystem = !hidesSystem(filterModel);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});

  const changeFilterModel = (model: GridFilterModel) => {
    setFilterModel(model);
    writeStored(SHOW_SYSTEM_KEY, String(!hidesSystem(model)));
  };
  const setShowSystem = (show: boolean) => {
    const others = filterModel.items.filter((item) => item.field !== "type");
    changeFilterModel({ ...filterModel, items: show ? others : [...others, HIDE_SYSTEM_FILTER] });
  };

  // Tree lines only make sense in name order.
  const showTree = sortModel[0]?.field === "name" && sortModel[0]?.sort === "asc";

  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>(NOTHING_SELECTED);
  // Select-all can produce an "exclude" model.
  const selected = labels.filter(
    (label) =>
      label.type === "user" &&
      rowSelectionModel.ids.has(label.id) === (rowSelectionModel.type === "include"),
  );

  // Bumping `count` remounts the dialog so it starts at `destination`.
  const [moveRequest, setMoveRequest] = useState({ open: false, count: 0, destination: TOP_LEVEL });
  const openMove = (destination: string) =>
    setMoveRequest(({ count }) => ({ open: true, count: count + 1, destination }));

  const drag = useLabelDragAndDrop({
    labels,
    selected,
    onMoveOne: (label, newName) => onChange(label, { name: newName }),
    onMoveMany: openMove,
  });
  const { dragSource } = drag;

  const columns = useMemo<GridColDef<Label>[]>(() => {
    const tree = labelTree(labels.map((label) => label.name));
    const sidebarRestriction = sidebarRestrictionLookup(labels);

    const visibilityColumn = (
      field: "labelListVisibility" | "messageListVisibility",
      { title, help, options }: (typeof labelListVisibility | typeof messageListVisibility),
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
              // Don't let the grid's keyboard nav eat the select's keys
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
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              {showTree && node && <TreeGuides guides={node.guides} />}
              {row.type === "user" ? (
                // Source for the drag preview (see showTagWhileDragging).
                <Box data-drag-preview>
                  <EditableLabelChip {...chip} onColorChange={(color) => onChange(row, { color })} />
                </Box>
              ) : (
                <LabelChip {...chip} />
              )}
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
    <Stack spacing={1} {...drag.containerProps}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          {selected.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2">{selected.length} selected</Typography>
              <Button variant="contained" size="small" onClick={() => openMove(TOP_LEVEL)}>
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
          control={<Switch checked={showSystem} onChange={(_, show) => setShowSystem(show)} />}
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
          writeStored(PAGE_SIZE_KEY, String(model.pageSize));
        }}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={changeFilterModel}
        // Type is only useful while system labels are shown.
        columnVisibilityModel={{ ...columnVisibilityModel, type: showSystem }}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        checkboxSelection
        isRowSelectable={({ row }) => row.type === "user"}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        getRowClassName={({ row }) => drag.rowClassName(row)}
        slotProps={{ row: drag.rowProps }}
        sx={drag.sx}
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
