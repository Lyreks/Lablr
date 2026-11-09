import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type { Route } from "./+types/label";
import { ApiErrorAlert } from "../api/ApiErrorAlert";
import { type Label, labelPagePath, useLabel, useLabels, useUpdateLabel } from "../labels/api";
import { sameColor } from "../labels/colors";
import { DeleteLabelDialog } from "../labels/detail/DeleteLabelDialog";
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
      <Title />
      {label.isPending && <CircularProgress sx={{ alignSelf: "center" }} />}
      {label.isError && <ApiErrorAlert error={label.error} />}
    </Stack>
  );
}

// Same spot and size as the Labels page heading. "Labels / Work / Clients / Acme", where each
// ancestor links to its page if it exists as a label (Gmail allows gaps in the chain).
function Title({ name }: { name?: string }) {
  const labels = useLabels();
  const parts = name?.split("/") ?? [];
  const crumb = { variant: "h5", color: "text.secondary" } as const;

  return (
    <Breadcrumbs sx={{ typography: "h5" }}>
      <MuiLink component={Link} to="/labels" underline="hover" {...crumb}>
        Labels
      </MuiLink>
      {parts.slice(0, -1).map((part, i) => {
        const ancestor = labels.data?.find((label) => label.name === parts.slice(0, i + 1).join("/"));
        return ancestor ? (
          <MuiLink key={i} component={Link} to={labelPagePath(ancestor)} underline="hover" {...crumb}>
            {part}
          </MuiLink>
        ) : (
          <Typography key={i} {...crumb}>
            {part}
          </Typography>
        );
      })}
      {name && (
        <Typography variant="h5" component="h1" title={name}>
          {parts.at(-1)}
        </Typography>
      )}
    </Breadcrumbs>
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
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <Title name={label.name} />
          <Chip label={label.type} size="small" variant={isSystem ? "outlined" : "filled"} />
        </Stack>
        {!isSystem && (
          <Button color="error" variant="outlined" onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" component="h2">
                Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label.messagesTotal ?? 0} messages · {label.messagesUnread ?? 0} unread
              </Typography>
            </Box>

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
        </Paper>

        {/* System labels can't have labels inside them */}
        {!isSystem && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <NestedLabels label={label} onAdd={() => setCreatingChild(true)} />
          </Paper>
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
