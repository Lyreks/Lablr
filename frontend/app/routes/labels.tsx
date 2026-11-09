import { useCallback, useState } from "react";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";

import type { Route } from "./+types/labels";
import { ApiErrorAlert } from "../api/ApiErrorAlert";
import { type Label, type LabelInput, useLabels, useUpdateLabel } from "../labels/api";
import { CreateLabelDialog } from "../labels/CreateLabelDialog";
import { LabelGrid } from "../labels/LabelGrid";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Labels · Lablr" }];
}

export default function Labels() {
  const labels = useLabels();
  const updateLabel = useUpdateLabel();
  const [creating, setCreating] = useState(false);

  const { mutate } = updateLabel;
  const changeLabel = useCallback(
    (label: Label, input: Partial<LabelInput>) => mutate({ id: label.id, input }),
    [mutate],
  );

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" component="h1">
          Labels
        </Typography>
        <Button variant="contained" onClick={() => setCreating(true)}>
          New label
        </Button>
      </Stack>

      {labels.isPending && <CircularProgress sx={{ alignSelf: "center" }} />}
      {labels.isError && <ApiErrorAlert error={labels.error} />}
      {updateLabel.isError && <ApiErrorAlert error={updateLabel.error} />}
      {labels.isSuccess && <LabelGrid labels={labels.data} onChange={changeLabel} />}

      <CreateLabelDialog open={creating} onClose={() => setCreating(false)} />
    </Stack>
  );
}
