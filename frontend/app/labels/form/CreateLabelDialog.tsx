import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";

import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { useCreateLabel } from "../api";
import { LabelForm, newLabel } from "./LabelForm";
import { joinName } from "../names";

const FORM_ID = "create-label-form";

type CreateLabelDialogProps = {
  open: boolean;
  onClose: () => void;
  parent?: string;
};

export function CreateLabelDialog({ open, onClose, parent = "" }: CreateLabelDialogProps) {
  const createLabel = useCreateLabel();

  const close = () => {
    createLabel.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{parent ? "New sub-label" : "New label"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {createLabel.isError && <ApiErrorAlert error={createLabel.error} />}
          <LabelForm
            id={FORM_ID}
            defaultValues={{ ...newLabel, name: joinName(parent, "") }}
            disabled={createLabel.isPending}
            onSubmit={(input) => createLabel.mutate(input, { onSuccess: close })}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button type="submit" form={FORM_ID} variant="contained" loading={createLabel.isPending}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
