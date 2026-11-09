import { Box, Button, FormControlLabel, Switch, Typography } from "@mui/material";
import { Toolbar, type ToolbarPropsOverrides } from "@mui/x-data-grid";

// Props the grid passes through slotProps.toolbar
declare module "@mui/x-data-grid" {
  interface ToolbarPropsOverrides {
    selectedCount: number;
    onMove: () => void;
    onClearSelection: () => void;
    showSystem: boolean;
    onShowSystemChange: (show: boolean) => void;
  }
}

// Actions for the selected labels on the left, view options on the right
export function LabelGridToolbar({
  selectedCount,
  onMove,
  onClearSelection,
  showSystem,
  onShowSystemChange,
}: ToolbarPropsOverrides) {
  return (
    <Toolbar>
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1, pl: 1 }}>
        {selectedCount > 0 && (
          <>
            <Typography variant="body2">{selectedCount} selected</Typography>
            <Button variant="contained" size="small" onClick={onMove}>
              Move to…
            </Button>
            <Button size="small" onClick={onClearSelection}>
              Clear
            </Button>
          </>
        )}
      </Box>
      <FormControlLabel
        label="Show system labels"
        slotProps={{ typography: { variant: "body2" } }}
        control={
          <Switch size="small" checked={showSystem} onChange={(_, show) => onShowSystemChange(show)} />
        }
        sx={{ mr: 1 }}
      />
    </Toolbar>
  );
}
