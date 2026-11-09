import type { ReactNode } from "react";
import { Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";

import { ApiErrorAlert } from "../api/ApiErrorAlert";
import { ApiError, loginUrl } from "../api/client";
import { type Me, useMe } from "./api";

export function AuthGate({ children }: { children: (me: Me) => ReactNode }) {
  const me = useMe();

  if (me.isPending) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (me.isError) {
    return (
      <Container maxWidth="sm" sx={{ py: 12 }}>
        <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h4" component="h1">
            Lablr
          </Typography>
          <Typography color="text.secondary">Organize your Gmail.</Typography>
          {me.error instanceof ApiError && me.error.status === 401 ? (
            <Button variant="contained" size="large" href={loginUrl()}>
              Sign in with Google
            </Button>
          ) : (
            <ApiErrorAlert error={me.error} />
          )}
        </Stack>
      </Container>
    );
  }

  return children(me.data);
}
