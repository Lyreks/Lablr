import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Box, Button, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import {
  DataGrid,
  gridClasses,
  type GridColumnVisibilityModel,
  type GridFilterItem,
  type GridFilterModel,
  type GridPaginationModel,
  type GridRowSelectionModel,
  type GridSortModel,
} from "@mui/x-data-grid";

import { readStored, writeStored } from "../../storage";
import type { Label, LabelInput } from "../api";
import { DRAG_FIELD, labelColumns, labelPath } from "./columns";
import { MoveLabelsDialog } from "./MoveLabelsDialog";
import { TOP_LEVEL } from "../names";
import { useLabelDragAndDrop } from "./useLabelDragAndDrop";

const PAGE_SIZE_KEY = "lablr.labels.pageSize";
const SHOW_SYSTEM_KEY = "lablr.labels.showSystem";
const pageSizeOptions = [10, 25, 50, 100];

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

// Clicking these shouldn't open the label. The grid already ignores the checkbox column and
// portal clicks (select menus).
const ROW_CONTROLS = 'a, button, [role="button"], [role="combobox"], [draggable="true"]';

type LabelGridProps = {
  labels: Label[];
  onChange: (label: Label, input: Partial<LabelInput>) => void;
};

export function LabelGrid({ labels, onChange }: LabelGridProps) {
  const navigate = useNavigate();
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

  const columns = useMemo(
    () => labelColumns({ labels, showTree, dragSource, onChange }),
    [labels, showTree, dragSource, onChange],
  );

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
        onRowClick={({ row }, event) => {
          if (!(event.target as Element).closest(ROW_CONTROLS)) {
            navigate(labelPath(row));
          }
        }}
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
        sx={[
          drag.sx,
          {
            [`& .${gridClasses.row}`]: { cursor: "pointer" },
            // Clicking the grip focuses its cell, and the focus outline lingers after a drag
            [`& .${gridClasses.cell}[data-field="${DRAG_FIELD}"]:is(:focus, :focus-within)`]: { outline: "none" },
          },
        ]}
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
