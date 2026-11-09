import type { ReactNode } from "react";
import { Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";

import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { ApiError, loginUrl } from "../api/client";
import { Logo } from "../components/Logo";
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
      <Splash>
        <Typography color="text.secondary">Organize your Gmail.</Typography>
        {me.error instanceof ApiError && me.error.status === 401 ? (
          <Button variant="contained" size="large" href={loginUrl()}>
            Sign in with Google
          </Button>
        ) : (
          <ApiErrorAlert error={me.error} />
        )}
      </Splash>
    );
  }

  // Signed in, but the Gmail labels permission was skipped on Google's consent screen
  if (!me.data.gmailAccess) {
    return (
      <Splash>
        <Typography>Lablr needs permission to see and edit your Gmail labels.</Typography>
        <Typography color="text.secondary">
          On Google&apos;s screen, tick &ldquo;See and edit your email labels&rdquo;.
        </Typography>
        <Button variant="contained" size="large" href={loginUrl()}>
          Grant access
        </Button>
      </Splash>
    );
  }

  return children(me.data);
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="sm" sx={{ py: 12 }}>
      <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
        <Logo variant="h4" component="h1" />
        {children}
      </Stack>
    </Container>
  );
}
