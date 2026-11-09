import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";

import type { Route } from "./+types/label";
import { ApiErrorAlert } from "../api/ApiErrorAlert";
import { type Label, useLabel, useUpdateLabel } from "../labels/api";
import { sameColor } from "../labels/colors";
import { CreateLabelDialog } from "../labels/form/CreateLabelDialog";
import { DeleteLabelDialog } from "../labels/form/DeleteLabelDialog";
import { LabelForm } from "../labels/form/LabelForm";

const FORM_ID = "edit-label-form";

export const meta: Route.MetaFunction = () => [{ title: "Label · Lablr" }];

export default function LabelDetail({ params }: Route.ComponentProps) {
  const label = useLabel(params.labelId);

  return (
    <Stack spacing={3}>
      <Button component={Link} to="/labels" sx={{ alignSelf: "flex-start" }}>
        ← All labels
      </Button>
      {label.isPending && <CircularProgress sx={{ alignSelf: "center" }} />}
      {label.isError && <ApiErrorAlert error={label.error} />}
      {label.isSuccess && <LabelEditor key={label.data.id} label={label.data} />}
    </Stack>
  );
}

function LabelEditor({ label }: { label: Label }) {
  const navigate = useNavigate();
  const updateLabel = useUpdateLabel();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const isSystem = label.type === "system";

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h5" component="h1">
            {label.name}
          </Typography>
          <Chip label={label.type} size="small" variant={isSystem ? "outlined" : "filled"} />
        </Stack>
        <Typography color="text.secondary">
          {label.messagesTotal ?? 0} messages · {label.messagesUnread ?? 0} unread
        </Typography>

        {isSystem && (
          <Alert severity="info">System labels are managed by Gmail and can't be changed.</Alert>
        )}
        {updateLabel.isError && <ApiErrorAlert error={updateLabel.error} />}
        {updateLabel.isSuccess && <Alert severity="success">Label saved.</Alert>}

        <LabelForm
          id={FORM_ID}
          disabled={isSystem || updateLabel.isPending}
          defaultValues={{
            name: label.name,
            labelListVisibility: label.labelListVisibility ?? "labelShow",
            messageListVisibility: label.messageListVisibility ?? "show",
            color: label.color,
          }}
          editingName={label.name}
          // Clears "Label saved." (or an error) once you change something again
          onEdit={updateLabel.reset}
          onSubmit={({ color, ...rest }) =>
            // `color: null` means remove, so only send it if it changed.
            updateLabel.mutate({
              id: label.id,
              input: sameColor(color, label.color) ? rest : { ...rest, color },
            })
          }
        />

        {!isSystem && (
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1}>
              <Button color="error" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
              <Button onClick={() => setCreatingChild(true)}>Add sub-label</Button>
            </Stack>
            <Button type="submit" form={FORM_ID} variant="contained" loading={updateLabel.isPending}>
              Save
            </Button>
          </Stack>
        )}
      </Stack>

      <DeleteLabelDialog
        label={label}
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={() => navigate("/labels")}
      />

      <CreateLabelDialog
        open={creatingChild}
        onClose={() => setCreatingChild(false)}
        parent={label.name}
      />
    </Paper>
  );
}
