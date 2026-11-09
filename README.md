# Lablr

## Layout

| Path                 | What                                                    |
|----------------------|---------------------------------------------------------|
| `frontend/`          | React Router (TypeScript, Vite) app, port 3000          |
| `backend/`           | Java 25 Spring Boot (Maven) REST API, port 8080         |
| `docker-compose.yml` | Runs both together for local development                |
| `Caddyfile`          | Proxy that puts both on one origin under Docker         |

The browser only ever talks to one origin. A proxy sends `/api/*`, `/oauth2/*`, `/login/oauth2/*` and `/logout` to the backend and everything else to the frontend, so the session cookie is first-party and there's no CORS. That proxy is Vite's dev server when running directly, and Caddy under Docker.

## Google OAuth setup

Copy `.env.example` to `.env` and fill in a Google OAuth client ID and secret (Web application, `gmail.labels` scope). Add a redirect URI for each way you run the app:

- `http://localhost:5173/login/oauth2/code/google` (running directly)
- `http://localhost:3000/login/oauth2/code/google` (Docker)

## Run everything with Docker

```bash
docker compose up --build
```

- App: http://localhost:3000
- Backend health: http://localhost:8080/actuator/health

## Run each part directly

Start both, then open http://localhost:5173.

### Backend (requires JDK 25+)
```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
npm test                    # unit tests (Vitest)
```
