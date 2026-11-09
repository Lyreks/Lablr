import { Tooltip } from "@mui/material";

import { InfoIcon } from "./icons";

// SvgIcon is aria-hidden by default; expose it as an image so screen readers get the text.
export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <InfoIcon
        role="img"
        aria-hidden={false}
        aria-label={text}
        tabIndex={0}
        sx={{ fontSize: 16, color: "text.secondary" }}
      />
    </Tooltip>
  );
}
