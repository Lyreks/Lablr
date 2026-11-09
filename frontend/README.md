# Lablr frontend

React Router v7 (framework mode) + Vite, MUI and MUI X Data Grid, TanStack Query, react-hook-form. Node 26+.

## Running

Start the backend on :8080 first (see the root README), then:

```bash
npm install
npm run dev        # http://localhost:5173
```

Vite proxies `/api`, `/oauth2`, `/login/oauth2` and `/logout` to the backend, so the session cookie is first-party and there's no CORS. Caddy does the same under Docker.

| Script              | Does                       |
|---------------------|----------------------------|
| `npm run dev`       | Dev server with HMR        |
| `npm test`          | Vitest unit tests          |
| `npm run lint`      | ESLint                     |
| `npm run typecheck` | Route typegen + `tsc`      |
| `npm run build`     | Production build           |

## Layout

```
app/
  routes/        pages: /labels (grid), /labels/:labelId (detail/edit)
  labels/        query hooks (api.ts) and the pure naming/move/visibility/color
                 logic, which has the tests
    grid/        Data Grid and its column definitions, tree lines, drag-and-drop, Move dialog
    form/        label form, parent and visibility pickers, create and delete dialogs
    chip/        label chip and its color picker
  components/    shared bits: logo, info tooltip, icons
  api/           fetch wrapper and error alert
  auth/          current user and the sign-in gate
```

## Errors

`apiFetch` throws an `ApiError` with the status, the backend's problem detail as the message, a `loginUrl` when signing in again would fix it, and the `X-Request-Id` the backend logged it under. Queries retry server and network errors but not 4xx. Query and mutation errors all go through `reportError` in `api/client.ts`, which only logs to the console for now.
