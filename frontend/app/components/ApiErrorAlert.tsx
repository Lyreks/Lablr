import { Alert, Button } from "@mui/material";

import { ApiError } from "../api/client";

export function ApiErrorAlert({ error }: { error: Error }) {
  const loginUrl = error instanceof ApiError ? error.loginUrl : undefined;

  return (
    <Alert
      severity="error"
      action={
        loginUrl && (
          <Button color="inherit" size="small" href={loginUrl}>
            Sign in again
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  );
}
