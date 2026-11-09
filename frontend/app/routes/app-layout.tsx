import { Link, NavLink, Outlet } from "react-router";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import { AuthGate } from "../auth/AuthGate";
import { useSignOut } from "../auth/api";

type Section = { text: string; to?: string; soon?: string };

// Only Labels exists so far; the rest are placeholders
const sections: Section[] = [
  { text: "Labels", to: "/labels" },
  { text: "Organize", soon: "Label, archive and clean up emails in bulk." },
  { text: "Filters", soon: "Manage the rules that label new mail automatically." },
  { text: "Insights", soon: "See which labels and senders fill your inbox." },
];

export default function AppLayout() {
  const signOut = useSignOut();

  return (
    <AuthGate>
      {(me) => (
        <>
          <AppBar position="static" color="default" elevation={0}>
            <Toolbar sx={{ gap: 2 }}>
              {/* Tag-shaped wordmark. */}
              <Typography
                variant="h6"
                component={Link}
                to="/"
                sx={{
                  position: "relative",
                  display: "inline-block",
                  pl: 3,
                  pr: 1.5,
                  lineHeight: 1.6,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  textDecoration: "none",
                  color: "primary.contrastText",
                  bgcolor: "primary.main",
                  borderRadius: "0 6px 6px 0",
                  clipPath: "polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    width: 6,
                    height: 6,
                    mt: "-3px",
                    borderRadius: "50%",
                    bgcolor: "var(--mui-palette-AppBar-defaultBg)",
                  },
                }}
              >
                Lablr
              </Typography>
              <nav style={{ flexGrow: 1 }}>
                {sections.map((section) =>
                  section.to ? (
                    <Button
                      key={section.text}
                      component={NavLink}
                      to={section.to}
                      color="inherit"
                      sx={{ "&.active": { color: "primary.main" } }}
                    >
                      {section.text}
                    </Button>
                  ) : (
                    <Tooltip key={section.text} title={`Coming soon: ${section.soon}`}>
                      {/* Disabled buttons don't fire mouse events, so wrap for the tooltip. */}
                      <Box component="span" sx={{ display: { xs: "none", md: "inline-block" } }}>
                        <Button color="inherit" disabled>
                          {section.text}
                        </Button>
                      </Box>
                    </Tooltip>
                  ),
                )}
              </nav>
              <Avatar src={me.picture} alt={me.name} sx={{ width: 32, height: 32 }} />
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
                {me.email}
              </Typography>
              <Button onClick={() => signOut.mutate()} disabled={signOut.isPending}>
                Sign out
              </Button>
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Outlet />
          </Container>
        </>
      )}
    </AuthGate>
  );
}
