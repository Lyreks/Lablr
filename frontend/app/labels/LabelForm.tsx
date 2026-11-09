import { Controller, useForm, useWatch } from "react-hook-form";
import { Link } from "react-router";
import { Link as MuiLink, MenuItem, Stack, TextField } from "@mui/material";

import { type LabelInput, useLabels } from "./api";
import { LabelChip } from "./LabelChip";
import { EditableLabelChip } from "./EditableLabelChip";
import { joinName, splitName, userLabelNames } from "./names";
import { ParentSelect } from "./ParentSelect";
import {
  sidebarRestrictionLookup,
  sidebarRestrictionText,
  labelListVisibility,
  messageListVisibility,
} from "./visibility";

export const newLabel: LabelInput = {
  name: "",
  labelListVisibility: "labelShow",
  messageListVisibility: "show",
  color: null,
};

type FormValues = Omit<LabelInput, "name"> & { parent: string; leaf: string };

type LabelFormProps = {
  id: string;
  defaultValues?: LabelInput;
  // Can't be nested under itself or its children
  editingName?: string;
  disabled?: boolean;
  onSubmit: (input: LabelInput) => void;
};

export function LabelForm({
  id,
  defaultValues = newLabel,
  editingName,
  disabled,
  onSubmit,
}: LabelFormProps) {
  const labels = useLabels();
  const { parent, leaf } = splitName(defaultValues.name);
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { ...defaultValues, parent, leaf },
  });
  const previewName = useWatch({ control, name: "leaf" }).trim() || "Label";
  const pickedParent = useWatch({ control, name: "parent" });
  const restriction = sidebarRestrictionLookup(labels.data ?? [])(joinName(pickedParent, previewName));
  const restrictingLabel =
    restriction && labels.data?.find((label) => label.name === restriction.ancestor);

  return (
    <Stack
      component="form"
      id={id}
      spacing={2}
      noValidate
      onSubmit={handleSubmit(({ parent, leaf, ...rest }) =>
        onSubmit({ ...rest, name: joinName(parent, leaf.trim()) }),
      )}
    >
      <Controller
        name="leaf"
        control={control}
        rules={{ validate: (leaf) => leaf.trim() !== "" || "Name is required" }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Name"
            required
            autoFocus
            disabled={disabled}
            error={fieldState.invalid}
            helperText={fieldState.error?.message}
          />
        )}
      />
      <Controller
        name="parent"
        control={control}
        render={({ field }) => (
          <ParentSelect
            label="Nested under"
            value={field.value}
            onChange={field.onChange}
            names={userLabelNames(labels.data ?? [])}
            placing={editingName === undefined ? [] : [editingName]}
            disabled={disabled}
            helperText="Shows this label inside another one in Gmail's sidebar."
          />
        )}
      />
      <Controller
        name="color"
        control={control}
        render={({ field }) => (
          // Read-only TextField just so the chip lines up with the other fields
          <TextField
            label="Color"
            disabled={disabled}
            helperText="How the label looks in Gmail. Use the arrow to change it."
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                readOnly: true,
                startAdornment: disabled ? (
                  <LabelChip name={previewName} color={field.value} />
                ) : (
                  <EditableLabelChip
                    name={previewName}
                    color={field.value}
                    onColorChange={field.onChange}
                  />
                ),
              },
              // Hide the unused text input but keep its height.
              htmlInput: { tabIndex: -1, "aria-hidden": true, sx: { width: 0, px: 0 } },
            }}
          />
        )}
      />
      <Controller
        name="labelListVisibility"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label={labelListVisibility.title}
            helperText={
              restriction ? (
                <>
                  {sidebarRestrictionText(restriction)}{" "}
                  {restriction.hidden
                    ? "This setting takes effect again once it's shown."
                    : "Within that, this setting still decides whether this label appears."}
                  {restrictingLabel && (
                    <>
                      {" "}
                      <MuiLink component={Link} to={`/labels/${encodeURIComponent(restrictingLabel.id)}`}>
                        Go to “{restrictingLabel.name}”
                      </MuiLink>
                    </>
                  )}
                </>
              ) : (
                labelListVisibility.help
              )
            }
            disabled={disabled}
          >
            {labelListVisibility.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.text}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        name="messageListVisibility"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            select
            label={messageListVisibility.title}
            helperText={messageListVisibility.help}
            disabled={disabled}
          >
            {messageListVisibility.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.text}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}
