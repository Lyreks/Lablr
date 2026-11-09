import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Stack,
} from "@mui/material";

import { ApiErrorAlert } from "../../api/ApiErrorAlert";
import { type Label, useDeleteLabel, useLabels } from "../api";
import { nestedUnder, splitName } from "../names";

type DeleteLabelDialogProps = {
  label: Label;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteLabelDialog({ label, open, onClose, onDeleted }: DeleteLabelDialogProps) {
  const deleteLabel = useDeleteLabel(label.id);
  const labels = useLabels();
  const [deleteNested, setDeleteNested] = useState(false);

  const childCount = nestedUnder(labels.data ?? [], label.name).length;
  const children = childCount === 1 ? "The label inside it" : `The ${childCount} labels inside it`;
  const { parent } = splitName(label.name);

  const close = () => {
    deleteLabel.reset();
    setDeleteNested(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close}>
      <DialogTitle>Delete “{label.name}”?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {deleteLabel.isError && <ApiErrorAlert error={deleteLabel.error} />}
          <DialogContentText>
            The label is removed from Gmail. Messages that had it are kept.
            {childCount > 0 &&
              !deleteNested &&
              ` ${children} ${childCount === 1 ? "moves" : "move"} ${parent ? `up to “${parent}”` : "to the top level"}.`}
          </DialogContentText>
          {childCount > 0 && (
            <FormControlLabel
              label={childCount === 1 ? "Also delete the label inside it" : `Also delete the ${childCount} labels inside it`}
              control={
                <Checkbox checked={deleteNested} onChange={(_, checked) => setDeleteNested(checked)} />
              }
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          loading={deleteLabel.isPending}
          onClick={() => deleteLabel.mutate({ deleteNested }, { onSuccess: onDeleted })}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
