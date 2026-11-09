import { Box, MenuItem, TextField } from "@mui/material";

import { paletteColors } from "./colors";

const NONE = "";

type PaletteSelectProps = {
  label: string;
  value: string | null;
  // null for "—" (no color).
  onChange: (color: string | null) => void;
};

export function PaletteSelect({ label, value, onChange }: PaletteSelectProps) {
  const selected = value?.toLowerCase() ?? NONE;
  // Keep a legacy color selectable.
  const colors =
    selected === NONE || paletteColors.includes(selected) ? paletteColors : [selected, ...paletteColors];

  return (
    <TextField
      select
      size="small"
      fullWidth
      label={label}
      value={selected}
      onChange={(event) => onChange(event.target.value === NONE ? null : event.target.value)}
      sx={{ "& .MuiSelect-select": { display: "flex", alignItems: "center" } }}
      slotProps={{
        select: {
          displayEmpty: true,
          renderValue: (color) =>
            color ? (
              <Box
                sx={{
                  width: "100%",
                  height: "1.4375em",
                  borderRadius: 0.5,
                  bgcolor: color as string,
                  border: 1,
                  borderColor: "divider",
                }}
              />
            ) : (
              <Box component="span">—</Box>
            ),
          MenuProps: {
            slotProps: {
              list: {
                sx: { display: "grid", gridTemplateColumns: "repeat(8, auto)", gap: 0.5, p: 1 },
              },
            },
          },
        },
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem
        value={NONE}
        aria-label="No color"
        title="No color"
        sx={{ gridColumn: "1 / -1", justifyContent: "center", minHeight: 0 }}
      >
        —
      </MenuItem>
      {colors.map((color) => (
        <MenuItem key={color} value={color} aria-label={color} title={color} sx={{ p: 0.5, minHeight: 0 }}>
          <Swatch color={color} size={20} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function Swatch({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 0.5,
        bgcolor: color,
        border: 1,
        borderColor: "divider",
      }}
    />
  );
}
