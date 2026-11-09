import type { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

type PageHeaderProps = {
  // A string becomes the page's h1; pass a node for anything richer, like breadcrumbs
  title: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}>
      {typeof title === "string" ? (
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
      ) : (
        title
      )}
      {actions && (
        <Stack direction="row" spacing={1}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
