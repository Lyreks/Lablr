import { Fragment, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { ApiErrorAlert } from "../api/ApiErrorAlert";
import { type Label, useUpdateLabel } from "./api";
import { canCarryOut, planMove, TOP_LEVEL, userLabelNames } from "./names";
import { ParentSelect } from "./ParentSelect";

type MoveLabelsDialogProps = {
  open: boolean;
  // Read on mount only; remount with a new key to change it.
  initialDestination?: string;
  selected: Label[];
  labels: Label[];
  onClose: () => void;
  onMoved: () => void;
};

export function MoveLabelsDialog({
  open,
  initialDestination = TOP_LEVEL,
  selected,
  labels,
  onClose,
  onMoved,
}: MoveLabelsDialogProps) {
  const updateLabel = useUpdateLabel();
  const [destination, setDestination] = useState(initialDestination);
  const [moving, setMoving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; error: Error } | null>(null);

  const selectedNames = selected.map((label) => label.name);
  const userNames = userLabelNames(labels);
  const plan = planMove(selectedNames, userNames, destination);
  const total = plan.roots.reduce((count, root) => count + 1 + root.children.length, 0);
  const idByName = new Map(labels.map((label) => [label.name, label.id]));

  const close = () => {
    setProgress(null);
    onClose();
  };

  // The backend moves each label's children with it, so one request per root.
  const move = async () => {
    setMoving(true);
    setProgress(null);
    let done = 0;
    try {
      for (const root of plan.roots) {
        await updateLabel.mutateAsync({ id: idByName.get(root.name)!, input: { name: root.newName } });
        done++;
      }
      onMoved();
      close();
    } catch (error) {
      setProgress({ done, error: error instanceof Error ? error : new Error(String(error)) });
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onClose={moving ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>
        Move {selected.length} {selected.length === 1 ? "label" : "labels"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <ParentSelect
            label="Move into"
            value={destination}
            onChange={setDestination}
            names={userNames}
            placing={selectedNames}
            disabled={moving}
          />

          <Alert severity="info">
            Labels inside the ones you move go with them and keep their place underneath, so the
            hierarchy stays the same.
          </Alert>

          {progress && (
            <>
              <ApiErrorAlert error={progress.error} />
              {progress.done > 0 && (
                <Alert severity="warning">
                  {progress.done} of {plan.roots.length} moved before this error. The rest were left
                  where they were.
                </Alert>
              )}
            </>
          )}
          {plan.problem && <Alert severity="error">{plan.problem}</Alert>}

          {!plan.problem && (
            <Stack spacing={1.5}>
              {/* Columns so the arrows line up. */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                  columnGap: 2,
                  rowGap: 0.5,
                  alignItems: "baseline",
                }}
              >
                {plan.roots.map((root) => (
                  <Fragment key={root.name}>
                    <Rename from={root.name} to={root.newName} />
                    {root.children.map((child) => (
                      <Rename key={child.name} from={child.name} to={child.newName} isChild />
                    ))}
                  </Fragment>
                ))}
              </Box>
              {plan.carried.map(({ name, with: outer }) => (
                <Typography key={name} variant="body2" color="text.secondary">
                  {plan.unchanged.includes(outer)
                    ? `“${name}” is inside “${outer}”, so it stays put too.`
                    : `“${name}” is inside “${outer}”, so it moves with it and stays underneath.`}
                </Typography>
              ))}
              {plan.unchanged.map((name) => (
                <Typography key={name} variant="body2" color="text.secondary">
                  “{name}” is already there, so it stays put.
                </Typography>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={moving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          loading={moving}
          disabled={!canCarryOut(plan)}
          onClick={move}
        >
          {total === 0 ? "Move" : `Move ${total} ${total === 1 ? "label" : "labels"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Rename({ from, to, isChild = false }: { from: string; to: string; isChild?: boolean }) {
  const cell = {
    overflowWrap: "anywhere",
    pl: isChild ? 2 : 0,
    color: isChild ? "text.secondary" : "text.primary",
  } as const;
  return (
    <>
      <Typography variant="body2" sx={cell}>
        {from}
      </Typography>
      <Typography variant="body2" color="text.secondary" aria-label="becomes">
        →
      </Typography>
      <Typography variant="body2" sx={{ ...cell, fontWeight: isChild ? 400 : 600 }}>
        {to}
      </Typography>
    </>
  );
}
