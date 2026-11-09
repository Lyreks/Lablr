import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

import { ApiErrorAlert } from "../../api/ApiErrorAlert";
import { type Label, useLabels } from "../api";
import { LabelChip } from "../chip/LabelChip";
import { labelPath } from "../grid/columns";
import { TreeGuides } from "../grid/TreeGuides";
import { compareNames, isSameOrNestedUnder, labelTree } from "../names";

type NestedLabelsProps = {
  label: Label;
  onAdd: () => void;
};

// Everything nested under a label, drawn as a tree like the grid. Updates live as labels are added.
export function NestedLabels({ label, onAdd }: NestedLabelsProps) {
  const labels = useLabels();
  const nested = (labels.data ?? [])
    .filter((other) => other.id !== label.id && isSameOrNestedUnder(other.name, label.name))
    .sort((a, b) => compareNames(a.name, b.name));
  // Rooted at this label, so its direct children get the first level of guides
  const tree = labelTree([label.name, ...nested.map((other) => other.name)]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" component="h2">
          Labels inside
        </Typography>
        <Button size="small" onClick={onAdd}>
          Add sub-label
        </Button>
      </Stack>

      {labels.isPending && <CircularProgress size={24} />}
      {labels.isError && <ApiErrorAlert error={labels.error} />}
      {labels.isSuccess && nested.length === 0 && (
        <Typography color="text.secondary">Nothing inside “{label.name}” yet.</Typography>
      )}
      {nested.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {nested.map((child) => {
            const node = tree.get(child.name);
            return (
              <Box component="li" key={child.id} sx={{ display: "flex", alignItems: "center", height: 36 }}>
                {node && <TreeGuides guides={node.guides} />}
                <LabelChip
                  name={node?.relativeName ?? child.name}
                  color={child.color}
                  to={labelPath(child)}
                  title={child.name}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
