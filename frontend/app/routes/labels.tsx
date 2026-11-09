import { useCallback, useState } from "react";
import { Button, CircularProgress, Stack } from "@mui/material";

import type { Route } from "./+types/labels";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { PageHeader } from "../components/PageHeader";
import { type Label, type LabelInput, useLabels, useUpdateLabel } from "../labels/api";
import { CreateLabelDialog } from "../labels/form/CreateLabelDialog";
import { LabelGrid } from "../labels/grid/LabelGrid";

export const meta: Route.MetaFunction = () => [{ title: "Labels · Lablr" }];

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
      <PageHeader
        title="Labels"
        actions={
          <Button variant="contained" onClick={() => setCreating(true)}>
            New label
          </Button>
        }
      />

      {labels.isPending && <CircularProgress sx={{ alignSelf: "center" }} />}
      {labels.isError && <ApiErrorAlert error={labels.error} />}
      {updateLabel.isError && <ApiErrorAlert error={updateLabel.error} />}
      {labels.isSuccess && <LabelGrid labels={labels.data} onChange={changeLabel} />}

      <CreateLabelDialog open={creating} onClose={() => setCreating(false)} />
    </Stack>
  );
}
