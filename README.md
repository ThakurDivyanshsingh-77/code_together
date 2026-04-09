# Code Together / CodeCollab

Code Together is a full-stack collaborative coding workspace. The app combines a Vite React frontend, an Express/MongoDB API, authenticated project rooms, Monaco-based editing, file management, project chat, AI-assisted code actions, terminal execution, and local folder import tools.

The package name is `code-together`, while several UI and server names use `CodeCollab`. They refer to the same project in this repository.

Sensitive environment values are intentionally not documented here. This README lists only the variable names and placeholder examples needed to run the project.

## Main Features

| Area | Current status | What it does |
| --- | --- | --- |
| Landing page | Implemented | Public `/` page with product-style feature sections and links to login/dashboard/demo editor. |
| Authentication | Implemented | Email/password registration, login, logout, session restore via `/auth/me`, JWT bearer token stored in `sessionStorage`. |
| Protected app routes | Implemented | `/dashboard`, `/editor/:roomId`, and placeholder `/profile` route are behind `ProtectedRoute`. |
| Project dashboard | Implemented | Create, rename/edit, delete, open, and list owned or collaborated projects. |
| Collaborator management | Implemented | Owner can invite users by email and assign `viewer` or `editor`; backend also supports `admin`. Owner can remove collaborators. |
| Role-based access | Implemented | Owners, editors, and admins can edit; viewers are read-only. Backend checks project access before protected actions. |
| File explorer | Implemented | Nested DB-backed file/folder tree with create, rename, drag/drop move, delete, context menus, language-based templates, and optional material-style icons. |
| File locking | Implemented | Editors can acquire/release file locks. Active locks block other editors from changing, moving, or deleting the locked file. |
| Revision history | Implemented | File snapshots are stored for system creation, manual saves, autosaves, and imports. The Source Control activity shows version history, not real Git. |
| Monaco editor | Implemented | Tabs, dirty state, syntax modes, VS Code-like theme, TypeScript/React stubs, selection tracking, editor settings, and read-only lock banner. |
| Real-time collaboration | Implemented | Authenticated Socket.IO project/file rooms, live code-change broadcasting, cursor updates, presence snapshots, autosave, and project file events. |
| Autosave | Implemented | Live file sessions autosave after a short debounce and create file version snapshots. |
| Active users | Implemented | Right-side active user panel plus status/header online counts. |
| Project chat | Implemented | Mongo-backed messages, user identity, timestamps, reactions, Ably realtime publish/subscribe when configured, and 5-second polling fallback. |
| Search | Implemented | In-memory filename, path, and file-content search across the current project with ranked results and previews. |
| Terminal | Implemented | Socket.IO `/execution` namespace for running code and shell commands, persistent per-socket cwd, process kill, input forwarding, and output streaming. |
| Code execution | Implemented | Local backend execution for Python, JavaScript, shell, PHP; Judge0 public API execution for several compiled languages; SQL validation-only mode. |
| HTML preview | Implemented | HTML/CSS files can open split or preview mode in an iframe; CSS/JS from open and saved project files is injected into the preview. |
| AI Assistant | Implemented in code | `/api/ai/chat` supports explain, fix, refactor, generate, UI fix, and file chat actions through Groq. |
| AI Console | Implemented | Bottom-panel command console sends natural-language file commands to `/api/ai/execute` and applies returned create/modify/delete changes. |
| AI file operations | Implemented in API | `/api/ai/files/:action` supports `read`, `write`, `create`, `analyze`, and `fix_errors` actions. |
| Local folder import | Implemented | Browse or type a local directory path and import folders/files into a cloud project. Existing project files are replaced during import. |
| Local filesystem editor | Partially wired | `LocalProjectEditor` and `useLocalProject` can browse/read/save local files, but `App.tsx` currently does not expose a route for it. |
| Extensions panel | Mock/UI state | Searchable mock extension list; installing `vscode-icons` changes file tree icon style. No real VS Code extension runtime. |
| Settings | Implemented | Editor font size, word wrap, and minimap toggles. Dashboard also includes a dark mode toggle. |
| Git integration | Placeholder/limited | UI labels mention Source Control and `main`, but real Git operations are not implemented. The collaborative editor uses this activity for file version history. |

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Zustand for editor/workspace state
- TanStack React Query provider
- Monaco Editor through `@monaco-editor/react`
- Tailwind CSS
- shadcn/Radix UI components
- Socket.IO client
- Ably browser SDK for chat realtime
- React Markdown for AI responses
- Sonner and shadcn toast notifications
- Vitest and Testing Library

### Backend

- Node.js with native ES modules
- Express
- HTTP server plus Socket.IO
- MongoDB with Mongoose
- JWT authentication with `jsonwebtoken`
- Password hashing with `bcryptjs`
- CORS and dotenv
- Ably server SDK for chat publishing
- Groq OpenAI-compatible chat completions API
- Judge0 public API for selected code execution
- Node child processes for local code/shell execution

## Repository Structure

```text
.
|-- src/                         # React frontend
|   |-- App.tsx                   # Browser routes and providers
|   |-- main.tsx                  # Vite entry point
|   |-- components/
|   |   |-- auth/                 # Auth form and protected route
|   |   |-- editor/               # IDE/editor panels
|   |   |-- projects/             # Dashboard and collaborator dialogs
|   |   `-- ui/                   # shadcn/Radix primitives
|   |-- hooks/                    # Auth, project files, sockets, chat, local FS hooks
|   |-- lib/                      # API client, Ably, preview, search, terminal helpers
|   |-- pages/                    # Landing and 404 pages
|   |-- store/                    # Zustand editor store
|   |-- test/                     # Vitest tests
|   `-- types/                    # Editor/project/chat types
|-- server/
|   |-- package.json              # Backend package
|   `-- src/
|       |-- config/               # Mongo connection
|       |-- middleware/           # Auth and error middleware
|       |-- models/               # Mongoose models
|       |-- routes/               # REST API routes
|       |-- socket/               # Socket.IO collaboration and execution
|       `-- utils/                # Serializers, access checks, runner, Ably, versions
|-- public/                       # Static assets
|-- vite.config.ts                # Vite config, port 8080, @ alias
|-- vitest.config.ts              # Test config
|-- tailwind.config.ts            # Theme tokens and animations
|-- vercel.json                   # Frontend deployment rewrite config
|-- package.json                  # Frontend/root scripts and dependencies
`-- README.md
```

## Frontend Flow

1. `App.tsx` creates the React Query client, auth context, tooltips, toasters, and browser router.
2. Public users land on `/`, then go to `/login` or `/register`.
3. `AuthProvider` restores an existing token from `sessionStorage` using `/auth/me`.
4. Protected users enter `/dashboard`, where `ProjectList` loads projects from `/api/projects`.
5. Creating or opening a project navigates to `/editor/:roomId` and passes project metadata in route state.
6. `CollaborativeEditor` loads DB files, joins Socket.IO collaboration rooms, and renders the IDE layout.
7. The file explorer opens files into Zustand-managed tabs.
8. Monaco sends content changes over Socket.IO; the server rebroadcasts them to other users and autosaves.
9. Chat uses persisted REST endpoints plus Ably realtime if configured.
10. The bottom panel can run code/shell commands or open the AI Console.

## Backend Flow

1. `server/src/server.js` loads env configuration, creates the Express app and HTTP server, applies CORS and JSON parsing, mounts routes, and starts MongoDB.
2. REST endpoints under `/api/projects`, `/api/ai`, and `/api/local` are protected by `requireAuth`.
3. `requireAuth` verifies the bearer JWT, loads the user, and attaches `req.auth`.
4. Project access checks are centralized in `getProjectAccess`.
5. `initializeCollaborationSocket` attaches the main Socket.IO server with JWT auth.
6. `initializeExecutionSocket` attaches the `/execution` namespace for terminal and code execution.
7. File updates, locks, imports, chat messages, and project deletion update MongoDB through Mongoose models.

## Data Model

| Model | Purpose |
| --- | --- |
| `User` | Email, password hash, display name, avatar URL, and user color. |
| `Project` | Project name, optional description, owner, created/updated timestamps. |
| `ProjectCollaborator` | Project/user role mapping with unique project-user index. |
| `File` | Project file/folder node, path, language, content, revision, parent path, lock metadata. |
| `FileVersion` | Immutable snapshots of file content by revision and source. |
| `Presence` | Online state, active file path, cursor line/column, and last seen timestamp. |
| `ChatMessage` | Project chat content, sender, message type, created time, and reactions map. |

## API Overview

Base URL: `/api`

### Health

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Service health check. |

### Auth

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Create an account. Requires email, password, and display name. |
| `POST` | `/auth/login` | No | Login and receive a 7-day JWT. |
| `GET` | `/auth/me` | Yes | Restore current user/profile from token. |
| `POST` | `/auth/logout` | Yes | Stateless logout acknowledgement. Frontend clears local token. |

### Projects and Collaborators

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects` | Yes | List owned and collaborated projects. |
| `POST` | `/projects` | Yes | Create a project. |
| `PATCH` | `/projects/:projectId` | Yes | Rename/update description. Owner only. |
| `DELETE` | `/projects/:projectId` | Yes | Delete project and related collaborators/files/presence/chat. Owner only. |
| `GET` | `/projects/:projectId/collaborators` | Yes | List project collaborators. |
| `POST` | `/projects/:projectId/collaborators` | Yes | Add collaborator by email and role. Owner only. |
| `DELETE` | `/projects/:projectId/collaborators/:collaboratorId` | Yes | Remove collaborator. Owner only. |

### Files and Version History

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/files` | Yes | Load all files/folders for a project. |
| `POST` | `/projects/:projectId/files` | Yes | Create a file or folder. Editor/admin/owner only. |
| `PATCH` | `/projects/:projectId/files/:fileId` | Yes | Update file metadata or content; checks revision and active locks. |
| `POST` | `/projects/:projectId/files/:fileId/lock` | Yes | Acquire or refresh a file lock. |
| `DELETE` | `/projects/:projectId/files/:fileId/lock` | Yes | Release a file lock. Lock owner only. |
| `DELETE` | `/projects/:projectId/files/:fileId` | Yes | Delete file or folder subtree; checks active locks. |
| `GET` | `/projects/:projectId/files/:fileId/history` | Yes | Load recent file version snapshots. |

### Presence

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/presence` | Yes | Load current online presence rows. |
| `PUT` | `/projects/:projectId/presence` | Yes | Update online/cursor state. |

The collaborative editor primarily uses Socket.IO presence now. The REST presence hook still exists as a polling-capable fallback/helper.

### Chat

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/chat` | Yes | Load chat messages. Supports `limit`, clamped to 1-500. |
| `POST` | `/projects/:projectId/chat` | Yes | Send a text message and publish it to Ably if configured. |
| `POST` | `/projects/:projectId/chat/:messageId/reaction` | Yes | Toggle an emoji reaction and publish reaction updates to Ably. |

### AI

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/ai/chat` | Yes | Chat about a file or selected code using Groq. |
| `POST` | `/ai/files/:action` | Yes | AI file operation: `read`, `write`, `create`, `analyze`, or `fix_errors`. |
| `POST` | `/ai/execute` | Yes | Natural-language AI console command that can create, modify, or delete project files. |

Supported `/ai/chat` actions:

- `explain_selected_code`
- `fix_bugs`
- `fix_errors`
- `fix_ui`
- `refactor_code`
- `generate_function`
- `chat_about_file`

### Local Filesystem

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/local/tree` | Yes | Scan a local directory into a flat tree. |
| `POST` | `/local/read` | Yes | Read a text file inside a selected local root. |
| `POST` | `/local/save` | Yes | Save content to a file inside a selected local root. |
| `POST` | `/local/browse` | Yes | Browse local drives/directories for folder import. |
| `POST` | `/local/import` | Yes | Import a local folder into a cloud project, replacing existing DB files. |
| `POST` | `/local/projects/:projectId/write-to-disk` | Yes | Export DB project files to a temp folder for terminal access. |

Local filesystem routes protect against path traversal by resolving paths under the selected root. They still operate on the backend machine, so do not expose them on an untrusted server.

## Socket.IO Events

### Collaboration namespace

The main namespace is created by `initializeCollaborationSocket`.

Client-to-server:

- `join-file`: join a project and file room after access checks.
- `leave-file`: leave the active file room and clear current file presence.
- `cursor-move`: update cursor position and broadcast it to collaborators.
- `code-change`: broadcast live content changes, update in-memory live session, and schedule autosave.

Server-to-client:

- `presence-snapshot`: full online participant list for the project.
- `user-joined`: collaborator joined a file/project room.
- `user-left`: collaborator left or disconnected.
- `cursor-move`: collaborator cursor update.
- `code-change`: remote content update for the current file.
- `file-state`: saved file state after autosave flush.
- `project-file-event`: file-created, file-updated, file-deleted, file-locked, file-unlocked, file-saved, files-imported.

### Execution namespace

The `/execution` namespace is created by `initializeExecutionSocket`.

Client-to-server:

- `run-code`: run code for a given language.
- `run-shell-command`: run a shell command in the socket's tracked cwd.
- `send-input`: send stdin to the active process.
- `kill-process`: kill the active process for the socket.
- `get-cwd`: request the current working directory.

Server-to-client:

- `execution-started`: process metadata.
- `output`: stdout/stderr/system lines.
- `cwd-changed`: shell cwd update.
- `clear-terminal`: clear command from backend, currently for `clear` or `cls`.

## Code Execution Details

Local backend execution:

- `python` or `py`: runs with `python` on Windows and `python3` elsewhere.
- `javascript` or `js`: runs with Node.
- `shell` or `sh`: runs through `cmd.exe` on Windows and `bash` elsewhere.
- `php`: runs with `php`.
- Timeout: local code payloads are force-killed after 30 seconds.

Judge0 public API execution:

- `c`
- `cpp`
- `java`
- `typescript`
- `go`
- `rust`
- `csharp`
- `kotlin`
- `swift`
- `r`

SQL:

- `sql` is validation-only in this codebase and does not execute against a database.

Security note: the terminal shell runner can execute commands on the backend host. Use it only in a trusted development environment unless you add stronger isolation.

## Environment Variables

The server loads `server/.env` first and then the root `.env`. Because dotenv does not override existing keys by default, values from `server/.env` win when the same key exists in both files.

The Vite frontend reads `VITE_*` variables from the root env at dev/build time.

Placeholder example only:

```env
VITE_API_URL=http://localhost:5000/api
VITE_ABLY_API_KEY=your_ably_browser_key

PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/code_together
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:8080
GROQ_API_KEY=your_groq_key
ABLY_API_KEY=your_ably_server_key
```

| Variable | Side | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | Frontend | Optional | API base URL. Defaults to local API in dev and a deployed backend URL in production. |
| `VITE_ABLY_API_KEY` | Frontend | Optional | Browser Ably key for realtime chat subscription. Without it, chat still polls. |
| `PORT` | Backend | Optional | Express/Socket.IO server port. Defaults to `5000`. |
| `MONGODB_URI` | Backend | Required | MongoDB connection string. |
| `JWT_SECRET` | Backend | Required | JWT signing and verification secret. |
| `CLIENT_URL` | Backend | Optional | Comma-separated allowed CORS origins. If omitted, all origins are accepted by current config. |
| `GROQ_API_KEY` | Backend | Required for AI | API key for Groq chat completions used by `/api/ai/*`. |
| `ABLY_API_KEY` | Backend | Optional | Server Ably key used to publish chat messages and reaction updates. |

Do not commit real env values.

## Installation

Install root/frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
npm install --prefix server
```

MongoDB must be running locally or available through a remote connection string.

## Running Locally

Start the backend in one terminal:

```bash
npm run dev:server
```

Start the frontend in another terminal:

```bash
npm run dev:client
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Scripts

### Root package

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite frontend. |
| `npm run dev:client` | Start the Vite frontend. |
| `npm run dev:server` | Start backend through the server package in watch mode. |
| `npm run build` | Build frontend for production. |
| `npm run build:dev` | Build frontend in development mode. |
| `npm run preview` | Preview built frontend locally. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest once. |
| `npm run test:watch` | Run Vitest in watch mode. |

### Server package

| Command | Description |
| --- | --- |
| `npm --prefix server run dev` | Run backend with `node --watch src/server.js`. |
| `npm --prefix server run start` | Run backend with `node src/server.js`. |

## Testing

Vitest is configured with `jsdom`, global test APIs, and `@/` path alias support.

Current test coverage includes:

- chat route serialization behavior
- chat panel own-message rendering
- chat hook behavior
- file search ranking and snippets
- terminal/project path helper behavior
- HTML preview helper behavior
- serializer behavior
- example sanity tests

Run tests with:

```bash
npm run test
```

Note: some server route tests import backend utilities. If you need strict secret isolation in a local run, verify test imports before running the full suite.

## Deployment Notes

`vercel.json` is configured for a Vite frontend build:

- build command: `npm run build`
- output directory: `dist`
- SPA rewrite to `/index.html`

The backend is a separate Node/Express service and needs its own hosting target with MongoDB, JWT, Groq, optional Ably, and CORS configuration.

The frontend API client currently defaults to:

- local dev API: `http://localhost:5000/api`
- deployed fallback API in production when `VITE_API_URL` is not set

Set `VITE_API_URL` explicitly for predictable deployments.

## Known Limitations

- Real Git operations are not implemented. Source Control mostly represents file version history.
- `LocalProjectEditor` exists but is not currently routed in `App.tsx`.
- AI file mutation endpoints do not all use the same lock/revision path as manual editor saves.
- Terminal shell execution runs on the backend host and is not containerized.
- Judge0 execution uses the public API and can hit public rate limits.
- Ably chat realtime needs both frontend and backend Ably keys; otherwise chat falls back to polling.
- `/profile` is a placeholder page.
- The frontend includes a dependency on `@google/genai`, but the active backend AI implementation uses Groq through `fetch`.

## License

No license file is currently included in this repository.
