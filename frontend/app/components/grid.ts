import { useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";

import { readStored, writeStored } from "../storage";

export const pageSizeOptions = [10, 25, 50, 100];

// Pagination that remembers the page size per grid, e.g. key "lablr.labels.pageSize"
export function useStoredPagination(key: string) {
  const [model, setModel] = useState<GridPaginationModel>(() => {
    const stored = Number(readStored(key));
    return { page: 0, pageSize: pageSizeOptions.includes(stored) ? stored : pageSizeOptions[0] };
  });
  const onChange = (next: GridPaginationModel) => {
    setModel(next);
    writeStored(key, String(next.pageSize));
  };
  return {
    pageSizeOptions,
    paginationModel: model,
    onPaginationModelChange: onChange,
  };
}

// For onRowClick: true when the click was on a control inside the row, which handles it itself.
// The grid already skips the checkbox column and clicks from popups like select menus.
export function isRowControlClick(event: { target: EventTarget }) {
  return (event.target as Element).closest('a, button, [role="button"], [role="combobox"], [draggable="true"]') !== null;
}
