import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("routes/app-layout.tsx", [
    index("routes/home.tsx"),
    route("labels", "routes/labels.tsx"),
    route("labels/:labelId", "routes/label.tsx"),
  ]),
] satisfies RouteConfig;
