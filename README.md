# CodeCollab

CodeCollab is a full-stack collaborative coding workspace built with:

- React + TypeScript + Vite (frontend)
- Express + Node.js (backend API)
- MongoDB + Mongoose (database)
- Monaco Editor (in-browser IDE experience)

It supports authentication, projects, collaborators, file editing, presence tracking, chat, and sandboxed code execution.

## Feature Summary

| Area | Status | Details |
| --- | --- | --- |
| Authentication | Implemented | JWT auth with register, login, logout, and `/auth/me` session restore. |
| Projects | Implemented | Create, list, edit, delete projects (owner controls update/delete). |
| Collaborators | Implemented | Owner can invite/remove collaborators by email with role assignment. |
| File Explorer | Implemented | Nested per-project tree, file create/delete from UI, folder support via API and initial bootstrap. |
| Monaco Editor | Implemented | Tabs, syntax highlighting, cursor events, dirty tab state. |
| Presence | Implemented (polling) | Online users and cursor/file position, refreshed on 2s polling. |
| Project Chat | Implemented (polling) | Persisted project chat messages with user identity and timestamp. |
| Conflict Handling | Implemented (basic locking) | File-level edit lock with TTL/heartbeat to prevent concurrent write conflicts. |
| Code Execution | Implemented | Browser sandbox execution for JavaScript, TypeScript, and Python (Pyodide). |
| AI Assistant | Implemented (Gemini API) | Supports explain selected code, bug fixing, refactor, function generation, and file chat. |
| Search / Git / Extensions panels | Placeholder UI | Visual panels exist, backend logic not implemented yet. |

## Architecture

```
Frontend (React/Vite) <----HTTP REST----> Express API <----> MongoDB
                                    ^
                                    |
                          JWT (Bearer token auth)
```

Collaboration behavior currently uses short interval polling (2 seconds) for:

- project files
- presence
- chat

This is not websocket-based yet.

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS + shadcn/ui components
- Zustand (editor UI state)
- Monaco Editor
- React Query

### Backend

- Node.js + Express
- Mongoose
- JWT (`jsonwebtoken`)
- Password hashing with `bcryptjs`
- CORS + dotenv

## Repository Structure

```text
.
|- src/                  # Frontend source
|  |- components/
|  |- hooks/
|  |- lib/
|  |- pages/
|  |- store/
|  |- types/
|- server/               # Backend source
|  |- src/
|     |- config/
|     |- middleware/
|     |- models/
|     |- routes/
|     |- utils/
|- .env.example
|- package.json
|- vite.config.ts
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or remote (Atlas/local URI)

## Environment Variables

The project uses env values from:

- `server/.env` (loaded first)
- root `.env` (loaded second for missing keys)

Because dotenv does not override existing values by default, keys from `server/.env` win if present.

Create root `.env` (or copy `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/codecollab
JWT_SECRET=replace-with-a-strong-secret
CLIENT_URL=http://localhost:8080
```

### Variable Reference

| Variable | Used by | Description |
| --- | --- | --- |
| `VITE_API_URL` | Frontend | Base URL for API requests. |
| `PORT` | Backend | Express server port (default `5000`). |
| `MONGODB_URI` | Backend | MongoDB connection string. |
| `JWT_SECRET` | Backend | Secret used to sign/verify auth tokens. |
| `CLIENT_URL` | Backend | Allowed CORS origin(s), comma-separated if multiple. |
| `GEMINI_API_KEY` | Backend | Google Gemini API key used by `/api/ai/chat`. |
| `GEMINI_MODEL` | Backend | Gemini model name (default: `gemini-1.5-flash`). |

## Installation

From project root:

```bash
npm install
npm install --prefix server
```

## Running Locally

Start backend (terminal 1):

```bash
npm run dev:server
```

Start frontend (terminal 2):

```bash
npm run dev:client
```

Default URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- Health check: `GET http://localhost:5000/api/health`

## Available Scripts

### Root scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start frontend (same as `dev:client`). |
| `npm run dev:client` | Start Vite frontend dev server. |
| `npm run dev:server` | Start backend in watch mode via `server` package. |
| `npm run build` | Build frontend for production. |
| `npm run build:dev` | Build frontend in development mode. |
| `npm run preview` | Preview built frontend locally. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |

### Server scripts (`server/package.json`)

| Command | Description |
| --- | --- |
| `npm --prefix server run dev` | Run backend with Node watch mode. |
| `npm --prefix server run start` | Run backend without watch mode. |

## Usage Flow

1. Open app in browser.
2. Register a new account or sign in.
3. Create a project from project dashboard.
4. Open project and create/edit files in Monaco editor.
5. Invite collaborators by email (project owner action).
6. Use right panel for chat and AI assistant.
7. Run supported code from editor quick run or terminal panel.

## API Overview

Base path: `/api`

### Health

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Service health check. |

### Auth

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Create account. |
| `POST` | `/auth/login` | No | Login and get JWT token. |
| `GET` | `/auth/me` | Yes | Get current user/profile from token. |
| `POST` | `/auth/logout` | Yes | Token-session logout acknowledgement. |

### Projects and Collaborators

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects` | Yes | List owned + collaborated projects. |
| `POST` | `/projects` | Yes | Create project. |
| `PATCH` | `/projects/:projectId` | Yes | Update project (owner only). |
| `DELETE` | `/projects/:projectId` | Yes | Delete project and related data (owner only). |
| `GET` | `/projects/:projectId/collaborators` | Yes | List collaborators. |
| `POST` | `/projects/:projectId/collaborators` | Yes | Add collaborator by email (owner only). |
| `DELETE` | `/projects/:projectId/collaborators/:collaboratorId` | Yes | Remove collaborator (owner only). |

### Files

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/files` | Yes | List project files/folders. |
| `POST` | `/projects/:projectId/files` | Yes | Create file or folder. |
| `PATCH` | `/projects/:projectId/files/:fileId` | Yes | Update name/path/type/content metadata. |
| `POST` | `/projects/:projectId/files/:fileId/lock` | Yes | Acquire or refresh file edit lock. |
| `DELETE` | `/projects/:projectId/files/:fileId/lock` | Yes | Release file edit lock (owner only). |
| `DELETE` | `/projects/:projectId/files/:fileId` | Yes | Delete file/folder (recursive by path prefix). |

### Presence

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/presence` | Yes | Get online presence list. |
| `PUT` | `/projects/:projectId/presence` | Yes | Update online state + cursor position. |

### Chat

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/chat` | Yes | Get chat messages (`limit` query supported). |
| `POST` | `/projects/:projectId/chat` | Yes | Send chat message. |

### AI

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/ai/chat` | Yes | AI assistant chat with task modes: explain, fix, refactor, generate, file chat. |

## Data Model Snapshot

Main Mongo collections:

- `users`
- `projects`
- `projectcollaborators`
- `files`
- `presences`
- `chatmessages`

## Known Limitations

- Real-time sync is polling-based, not websocket/CRDT.
- Conflict handling is lock-based (single editor at a time), not merge-based.
- AI responses depend on `GEMINI_API_KEY`; without it, assistant calls fail.
- Terminal is browser sandbox execution, not full OS shell.
- UI exposes only `viewer` and `editor` roles; backend also accepts `admin`.
- Automated tests are minimal at the moment.

## Troubleshooting

### 401 auth errors after login

- Clear browser local storage key `codecollab_auth_token`.
- Re-login to refresh token.

### CORS errors

- Ensure `CLIENT_URL` matches frontend origin (`http://localhost:8080` by default).
- For multiple origins, use comma-separated values.

### Mongo connection fails

- Verify `MONGODB_URI` in env.
- Make sure MongoDB service is running and reachable.

### Python execution seems slow on first run

- Expected behavior: Pyodide loads in browser on first Python execution.

## Future Improvements

- Replace polling with websocket or WebRTC sync.
- Add operational transform or CRDT-based collaborative editing.
- Connect AI panel to a real LLM backend.
- Implement actual Git operations and project search indexing.
- Add stronger test coverage (frontend + backend).

## License

No license file is currently included in this repository.
