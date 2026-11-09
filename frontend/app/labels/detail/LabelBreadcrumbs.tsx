import { Link } from "react-router";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";

import { labelPagePath, useLabels } from "../api";

// Same spot and size as the Labels page heading. "Labels / Work / Clients / Acme", where each
// ancestor links to its page if it exists as a label (Gmail allows gaps in the chain).
export function LabelBreadcrumbs({ name }: { name?: string }) {
  const labels = useLabels();
  const parts = name?.split("/") ?? [];
  const crumb = { variant: "h5", color: "text.secondary" } as const;

  return (
    <Breadcrumbs sx={{ typography: "h5" }}>
      <MuiLink component={Link} to="/labels" underline="hover" {...crumb}>
        Labels
      </MuiLink>
      {parts.slice(0, -1).map((part, i) => {
        const ancestor = labels.data?.find((label) => label.name === parts.slice(0, i + 1).join("/"));
        return ancestor ? (
          <MuiLink key={i} component={Link} to={labelPagePath(ancestor)} underline="hover" {...crumb}>
            {part}
          </MuiLink>
        ) : (
          <Typography key={i} {...crumb}>
            {part}
          </Typography>
        );
      })}
      {name && (
        <Typography variant="h5" component="h1" title={name}>
          {parts.at(-1)}
        </Typography>
      )}
    </Breadcrumbs>
  );
}
