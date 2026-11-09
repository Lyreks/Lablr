import type { ReactNode } from "react";
import { MenuItem, TextField } from "@mui/material";

// One of the settings in ../visibility.ts
type Setting = { title: string; options: { value: string; text: string }[] };

type VisibilitySelectProps = {
  setting: Setting;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: ReactNode;
  // Borderless, for a grid cell. There's no visible label, so labelName goes in the aria-label.
  compact?: boolean;
  labelName?: string;
};

export function VisibilitySelect({
  setting,
  value,
  onChange,
  disabled,
  helperText,
  compact = false,
  labelName,
}: VisibilitySelectProps) {
  const items = setting.options.map((option) => (
    <MenuItem key={option.value} value={option.value} sx={compact ? { fontSize: "0.875rem" } : undefined}>
      {option.text}
    </MenuItem>
  ));

  if (compact) {
    return (
      <TextField
        select
        variant="standard"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        // Don't let the grid's keyboard nav eat the select's keys
        onKeyDown={(event) => event.stopPropagation()}
        slotProps={{
          input: { disableUnderline: true, sx: { fontSize: "inherit" } },
          select: { SelectDisplayProps: { "aria-label": `${setting.title}: ${labelName}` } },
        }}
      >
        {items}
      </TextField>
    );
  }

  return (
    <TextField
      select
      label={setting.title}
      helperText={helperText}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {items}
    </TextField>
  );
}
