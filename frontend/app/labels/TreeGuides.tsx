import { Box } from "@mui/material";

const TREE_STEP = 20;
const LINE_WIDTH = 2;

// │ ├ └ connector lines for a nested label, one column per level (see TreeNode.guides).
export function TreeGuides({ guides }: { guides: boolean[] }) {
  const line = { content: '""', position: "absolute" } as const;
  // Must come after the border shorthands, which reset the color.
  const lineColor = { borderColor: "divider" } as const;
  return guides.map((continues, level) => {
    const isOwn = level === guides.length - 1;
    return (
      <Box
        key={level}
        aria-hidden
        sx={{
          position: "relative",
          alignSelf: "stretch",
          width: TREE_STEP,
          flexShrink: 0,
          // Full height to continue past this row, half height to end in └.
          "&::before":
            isOwn || continues
              ? {
                  ...line,
                  left: TREE_STEP / 2 - 1,
                  top: 0,
                  bottom: isOwn && !continues ? `calc(50% - ${LINE_WIDTH / 2}px)` : 0,
                  borderLeft: LINE_WIDTH,
                  ...lineColor,
                }
              : undefined,
          "&::after": isOwn
            ? {
                ...line,
                left: TREE_STEP / 2 - 1,
                right: 2,
                top: `calc(50% - ${LINE_WIDTH / 2}px)`,
                borderTop: LINE_WIDTH,
                ...lineColor,
              }
            : undefined,
        }}
      />
    );
  });
}
