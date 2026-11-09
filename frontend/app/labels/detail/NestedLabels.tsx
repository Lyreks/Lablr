import { Box, CircularProgress, Typography } from "@mui/material";

import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { type Label, labelPagePath, useLabels } from "../api";
import { LabelChip } from "../ui/LabelChip";
import { TreeGuides } from "../ui/TreeGuides";
import { compareNames, labelTree, nestedUnder } from "../names";

// Everything nested under a label, drawn as a tree like the grid. Updates live as labels are added.
export function NestedLabels({ label }: { label: Label }) {
  const labels = useLabels();
  const nested = nestedUnder(labels.data ?? [], label.name).sort((a, b) => compareNames(a.name, b.name));
  // Rooted at this label, so its direct children get the first level of guides
  const tree = labelTree([label.name, ...nested.map((other) => other.name)]);

  if (labels.isPending) {
    return <CircularProgress size={24} />;
  }
  if (labels.isError) {
    return <ApiErrorAlert error={labels.error} />;
  }
  if (nested.length === 0) {
    return <Typography color="text.secondary">Nothing inside “{label.name}” yet.</Typography>;
  }
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {nested.map((child) => {
        const node = tree.get(child.name);
        return (
          <Box component="li" key={child.id} sx={{ display: "flex", alignItems: "center", height: 36 }}>
            {node && <TreeGuides guides={node.guides} />}
            <LabelChip
              name={node?.relativeName ?? child.name}
              color={child.color}
              to={labelPagePath(child)}
              title={child.name}
            />
          </Box>
        );
      })}
    </Box>
  );
}
