import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

type SectionProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

// Titled card for a part of a page
export function Section({ title, subtitle, actions, children }: SectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
