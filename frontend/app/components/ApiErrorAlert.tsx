import { Alert, Button } from "@mui/material";

import { ApiError } from "../api/client";

export function ApiErrorAlert({ error }: { error: Error }) {
  const loginUrl = error instanceof ApiError ? error.loginUrl : undefined;
  // 403 with a login link: signed in, but the Gmail labels permission was left unticked
  const needsGrant = loginUrl !== undefined && error instanceof ApiError && error.status === 403;

  return (
    <Alert
      severity={needsGrant ? "warning" : "error"}
      action={
        loginUrl && (
          <Button color="inherit" size="small" href={loginUrl}>
            {needsGrant ? "Grant access" : "Sign in again"}
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  );
}
