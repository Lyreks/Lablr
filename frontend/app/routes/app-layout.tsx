import { NavLink, Outlet } from "react-router";
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
import { Logo } from "../Logo";
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
              <Logo to="/" />
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
