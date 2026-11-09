# Lablr

## Layout

| Path                 | What                                                    |
|----------------------|---------------------------------------------------------|
| `frontend/`          | React Router (TypeScript, Vite) app, port 3000          |
| `backend/`           | Java 25 Spring Boot (Maven) REST API, port 8080         |
| `docker-compose.yml` | Runs both together for local development                |

## Run everything with Docker

Copy `.env.example` to `.env` and fill in a Google OAuth client ID and secret (Web application, redirect URI `http://localhost:8080/login/oauth2/code/google`, `gmail.labels` scope).

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8080/actuator/health

The browser calls the API directly at `http://localhost:8080`; the backend allows the frontend origins via `CORS_ALLOWED_ORIGINS`.

## Run each part directly

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend (requires JDK 25+)
```bash
cd backend
./mvnw spring-boot:run      # Windows: mvnw.cmd spring-boot:run
```
