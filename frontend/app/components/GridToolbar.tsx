import type { ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Toolbar, type ToolbarPropsOverrides } from "@mui/x-data-grid";

// Props a grid passes through slotProps.toolbar
declare module "@mui/x-data-grid" {
  interface ToolbarPropsOverrides {
    selectedCount?: number;
    // Shown next to the count while rows are selected
    selectionActions?: ReactNode;
    onClearSelection?: () => void;
    // Right side, e.g. view switches
    options?: ReactNode;
  }
}

// Use with showToolbar and slots={{ toolbar: GridToolbar }}
export function GridToolbar({
  selectedCount = 0,
  selectionActions,
  onClearSelection,
  options,
}: ToolbarPropsOverrides) {
  return (
    <Toolbar>
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1, pl: 1 }}>
        {selectedCount > 0 && (
          <>
            <Typography variant="body2">{selectedCount} selected</Typography>
            {selectionActions}
            {onClearSelection && (
              <Button size="small" onClick={onClearSelection}>
                Clear
              </Button>
            )}
          </>
        )}
      </Box>
      {options}
    </Toolbar>
  );
}
