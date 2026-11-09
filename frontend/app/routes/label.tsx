import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Box, Button, Chip, CircularProgress, Stack } from "@mui/material";

import type { Route } from "./+types/label";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { type Label, useLabel, useUpdateLabel } from "../labels/api";
import { sameColor } from "../labels/colors";
import { DeleteLabelDialog } from "../labels/detail/DeleteLabelDialog";
import { LabelBreadcrumbs } from "../labels/detail/LabelBreadcrumbs";
import { NestedLabels } from "../labels/detail/NestedLabels";
import { CreateLabelDialog } from "../labels/form/CreateLabelDialog";
import { LabelForm } from "../labels/form/LabelForm";

const FORM_ID = "edit-label-form";

export const meta: Route.MetaFunction = () => [{ title: "Label · Lablr" }];

export default function LabelDetail({ params }: Route.ComponentProps) {
  const label = useLabel(params.labelId);

  if (label.isSuccess) {
    return <LabelEditor key={label.data.id} label={label.data} />;
  }
  return (
    <Stack spacing={3}>
      <PageHeader title={<LabelBreadcrumbs />} />
      {label.isPending && <CircularProgress sx={{ alignSelf: "center" }} />}
      {label.isError && <ApiErrorAlert error={label.error} />}
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
    <Stack spacing={3}>
      <PageHeader
        title={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <LabelBreadcrumbs name={label.name} />
            <Chip label={label.type} size="small" variant={isSystem ? "outlined" : "filled"} />
          </Stack>
        }
        actions={
          !isSystem && (
            <Button color="error" variant="outlined" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <Section
          title="Settings"
          subtitle={`${label.messagesTotal ?? 0} messages · ${label.messagesUnread ?? 0} unread`}
        >
          <Stack spacing={3}>
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
              <Button
                type="submit"
                form={FORM_ID}
                variant="contained"
                loading={updateLabel.isPending}
                sx={{ alignSelf: "flex-end" }}
              >
                Save
              </Button>
            )}
          </Stack>
        </Section>

        {/* System labels can't have labels inside them */}
        {!isSystem && (
          <Section
            title="Labels inside"
            actions={
              <Button size="small" onClick={() => setCreatingChild(true)}>
                Add sub-label
              </Button>
            }
          >
            <NestedLabels label={label} />
          </Section>
        )}
      </Box>

      <DeleteLabelDialog
        label={label}
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={() => navigate("/labels")}
      />
      <CreateLabelDialog open={creatingChild} onClose={() => setCreatingChild(false)} parent={label.name} />
    </Stack>
  );
}
