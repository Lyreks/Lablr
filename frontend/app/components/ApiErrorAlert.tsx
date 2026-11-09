import { Alert, Button } from "@mui/material";

import { ApiError } from "../api/client";

export function ApiErrorAlert({ error }: { error: Error }) {
  const loginUrl = error instanceof ApiError ? error.loginUrl : undefined;
  // 403 with a login link: signed in, but Gmail labels access hasn't been granted yet. That's the
  // normal next step after a first sign-in, so it's a prompt rather than an error.
  const needsGrant = loginUrl !== undefined && error instanceof ApiError && error.status === 403;

  return (
    <Alert
      severity={needsGrant ? "info" : "error"}
      action={
        loginUrl && (
          <Button color="inherit" size="small" variant={needsGrant ? "outlined" : "text"} href={loginUrl}>
            {needsGrant ? "Grant access" : "Sign in again"}
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  );
}
