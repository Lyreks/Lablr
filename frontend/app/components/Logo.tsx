import { Link } from "react-router";
import { Typography } from "@mui/material";

type LogoProps = {
  variant?: "h6" | "h4";
  component?: "span" | "h1";
  // Makes it a link, e.g. home
  to?: string;
};

export function Logo({ variant = "h6", component = "span", to }: LogoProps) {
  const logo = (
    <Typography
      variant={variant}
      component={component}
      sx={{
        display: "inline-block",
        m: 0,
        pl: "1.2em",
        pr: "0.6em",
        lineHeight: 1.6,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: "primary.contrastText",
        bgcolor: "primary.main",
        borderRadius: "0 0.3em 0.3em 0",
        clipPath: "polygon(0.6em 0, 100% 0, 100% 100%, 0.6em 100%, 0 50%)",
        mask: "radial-gradient(circle at 0.6em 50%, transparent 0.15em, #000 calc(0.15em + 0.5px))",
      }}
    >
      Lablr
    </Typography>
  );

  return to ? (
    <Link to={to} aria-label="Lablr home" style={{ display: "inline-flex", textDecoration: "none" }}>
      {logo}
    </Link>
  ) : (
    logo
  );
}
