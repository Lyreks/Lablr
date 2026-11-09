import { MenuItem, TextField, type TextFieldProps } from "@mui/material";

import { compareNames, isSameOrNestedUnder, TOP_LEVEL } from "../names";

type ParentSelectProps = Omit<TextFieldProps, "select" | "value" | "onChange" | "children"> & {
  value: string;
  onChange: (parent: string) => void;
  names: string[];
  // Labels being moved; neither they nor their children can be the parent.
  placing: string[];
};

export function ParentSelect({ value, onChange, names, placing, ...field }: ParentSelectProps) {
  const options = names.filter((name) => !placing.some((placed) => isSameOrNestedUnder(name, placed)));
  // The current parent may not exist as a label.
  if (value !== TOP_LEVEL && !options.includes(value)) {
    options.push(value);
  }
  options.sort(compareNames);

  return (
    <TextField
      {...field}
      select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      // TOP_LEVEL is "", which a select otherwise shows as blank
      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
    >
      <MenuItem value={TOP_LEVEL}>Nothing (top level)</MenuItem>
      {options.map((name) => (
        <MenuItem key={name} value={name}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  );
}
