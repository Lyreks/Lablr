import { useState } from "react";
import { Link } from "react-router";
import { Box, IconButton, Link as MuiLink, Popover } from "@mui/material";

import { ArrowDropDownIcon } from "../../components/icons";
import type { LabelColor } from "../api";
import { ColorPicker } from "./ColorPicker";

type LabelChipProps = {
  name: string;
  color: LabelColor | null;
  to?: string;
  title?: string;
  // Adds a dropdown for picking the color. null removes the color.
  onColorChange?: (color: LabelColor | null) => void;
};

export function LabelChip({ name, color, to, title, onColorChange }: LabelChipProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        title={title}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          maxWidth: "100%",
          height: 24,
          pl: 1,
          pr: onColorChange ? 0 : 1,
          borderRadius: 1,
          fontSize: "0.8125rem",
          lineHeight: 1,
          bgcolor: color?.backgroundColor ?? "action.selected",
          color: color?.textColor ?? "text.primary",
        }}
      >
        {to ? (
          <MuiLink
            component={Link}
            to={to}
            color="inherit"
            underline="hover"
            noWrap
            // Drag the row, not the link URL.
            draggable={false}
          >
            {name}
          </MuiLink>
        ) : (
          <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </Box>
        )}
        {onColorChange && (
          <IconButton
            size="small"
            color="inherit"
            aria-label={`Change color of ${name}`}
            aria-haspopup="dialog"
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ p: 0, ml: 0.25, borderRadius: 1 }}
          >
            <ArrowDropDownIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      {onColorChange && (
        <Popover
          open={anchor !== null}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          // Don't let the grid handle keys typed in here
          onKeyDown={(event) => event.stopPropagation()}
          slotProps={{ paper: { role: "dialog", "aria-label": `Color of ${name}` } }}
        >
          <Box sx={{ p: 2, width: 288 }}>
            <ColorPicker
              value={color}
              onChange={(picked) => {
                onColorChange(picked);
                setAnchor(null);
              }}
            />
          </Box>
        </Popover>
      )}
    </>
  );
}
