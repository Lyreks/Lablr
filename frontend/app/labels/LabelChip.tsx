import { Link } from "react-router";
import { Box, IconButton, Link as MuiLink } from "@mui/material";

import type { LabelColor } from "./api";
import { ArrowDropDownIcon } from "./icons";

type LabelChipProps = {
  name: string;
  color: LabelColor | null;
  to?: string;
  title?: string;
  onColorClick?: (anchor: HTMLElement) => void;
};

export function LabelChip({ name, color, to, title, onColorClick }: LabelChipProps) {
  return (
    <Box
      title={title}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        height: 24,
        pl: 1,
        pr: onColorClick ? 0 : 1,
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
      {onColorClick && (
        <IconButton
          size="small"
          color="inherit"
          aria-label={`Change color of ${name}`}
          aria-haspopup="dialog"
          onClick={(event) => onColorClick(event.currentTarget)}
          sx={{ p: 0, ml: 0.25, borderRadius: 1 }}
        >
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}
