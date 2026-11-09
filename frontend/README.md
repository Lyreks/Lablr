# Lablr frontend

React Router v7 (framework mode) + Vite, MUI and MUI X Data Grid, TanStack Query, react-hook-form. Node 26+.

## Running

Start the backend on :8080 first (see the root README), then:

```bash
npm install
npm run dev        # http://localhost:3000
```

Vite proxies `/api`, `/oauth2`, `/login/oauth2` and `/logout` to the backend, so the session cookie is first-party and there's no CORS.

It's an SPA (`ssr: false`), since all data loads in the browser anyway. The root `Dockerfile` builds it into the backend's static resources, so in Docker and on Cloud Run Spring Boot serves the app and the API from one origin.

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
    grid/        Data Grid and its columns, drag-and-drop, Move dialog
    form/        label form, create dialog
    detail/      detail page pieces: breadcrumbs, nested label tree, delete dialog
    ui/          pieces shared by the above: label chip, color picker, parent and
                 visibility pickers, tree lines
  components/    shared across sections: page header, section card, grid toolbar and
                 helpers, API error alert, logo, info tooltip, icons
  api/           fetch wrapper
  auth/          current user and the sign-in gate
```

## Errors

`apiFetch` throws an `ApiError` with the status, the backend's problem detail as the message, a `loginUrl` when signing in again would fix it, and the `X-Request-Id` the backend logged it under. Queries retry server and network errors but not 4xx. Query and mutation errors all go through `reportError` in `api/client.ts`, which only logs to the console for now.
