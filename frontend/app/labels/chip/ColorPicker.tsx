import type { ReactNode } from "react";
import { Box, Button, ButtonBase, Stack, Typography } from "@mui/material";

import { type LabelColor, useLabels } from "../api";
import {
  contrastingTextColor,
  customColors,
  DEFAULT_BACKGROUND,
  isPreset,
  presetColors,
  sameColor,
} from "../colors";
import { PaletteSelect } from "./PaletteSelect";

type ColorPickerProps = {
  value: LabelColor | null;
  // null removes the color.
  onChange: (color: LabelColor | null) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const labels = useLabels();
  const custom = customColors(labels.data ?? []);
  if (value && !isPreset(value) && !custom.some((color) => sameColor(color, value))) {
    custom.push(value);
  }

  return (
    <Stack spacing={2}>
      <Section title="Standard Presets">
        <SwatchGrid colors={presetColors} selected={value} onPick={onChange} />
      </Section>

      {custom.length > 0 && (
        <Section title="Custom Presets">
          <SwatchGrid colors={custom} selected={value} onPick={onChange} />
        </Section>
      )}

      {/* Gmail stores both colors as a pair, so clearing either clears both. */}
      <Section title="Custom">
        <Stack direction="row" spacing={1}>
          <PaletteSelect
            label="Text"
            value={value?.textColor ?? null}
            onChange={(textColor) =>
              onChange(
                textColor === null
                  ? null
                  : { textColor, backgroundColor: value?.backgroundColor ?? DEFAULT_BACKGROUND },
              )
            }
          />
          <PaletteSelect
            label="Background"
            value={value?.backgroundColor ?? null}
            onChange={(backgroundColor) =>
              onChange(
                backgroundColor === null
                  ? null
                  : {
                      backgroundColor,
                      textColor: value?.textColor ?? contrastingTextColor(backgroundColor),
                    },
              )
            }
          />
        </Stack>
      </Section>

      {value && (
        <Button color="error" onClick={() => onChange(null)} sx={{ alignSelf: "flex-start" }}>
          Remove color
        </Button>
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

type SwatchGridProps = {
  colors: LabelColor[];
  selected: LabelColor | null;
  onPick: (color: LabelColor) => void;
};

function SwatchGrid({ colors, selected, onPick }: SwatchGridProps) {
  return (
    // 6 per row, like Gmail.
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, 32px)", gap: 0.75 }}>
      {colors.map((color) => {
        const isSelected = sameColor(color, selected);
        return (
          <ButtonBase
            key={`${color.backgroundColor}${color.textColor}`}
            onClick={() => onPick(color)}
            aria-label={`${color.textColor} text on ${color.backgroundColor}`}
            aria-pressed={isSelected}
            title={`${color.textColor} on ${color.backgroundColor}`}
            sx={{
              aspectRatio: "1",
              borderRadius: 0.5,
              fontSize: "0.75rem",
              bgcolor: color.backgroundColor,
              color: color.textColor,
              border: 1,
              borderColor: "divider",
              outline: isSelected ? 2 : 0,
              outlineColor: "primary.main",
              outlineOffset: 1,
            }}
          >
            a
          </ButtonBase>
        );
      })}
    </Box>
  );
}
