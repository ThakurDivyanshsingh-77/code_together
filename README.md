# CodeCollab (MERN)

A collaborative code editor built with the MERN stack:
- MongoDB
- Express
- React (Vite + TypeScript)
- Node.js

Supabase has been removed. The project now uses a custom Express + MongoDB backend with JWT authentication.

## Project Structure

- `src/` - React frontend
- `server/` - Express backend

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally or reachable via connection string

## Environment Variables

Create `.env` in the project root (or copy from `.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/codecollab
JWT_SECRET=replace-with-a-secure-random-string
CLIENT_URL=http://localhost:8080
```

Backend also supports `server/.env` (see `server/.env.example`).

## Install

```bash
npm install
npm install --prefix server
```

## Run

Terminal 1 (backend):

```bash
npm run dev:server
```

Terminal 2 (frontend):

```bash
npm run dev:client
```

Frontend runs on `http://localhost:8080` and backend on `http://localhost:5000`.

## Build Frontend

```bash
npm run build
```

## API Health Check

```bash
GET http://localhost:5000/api/health
```
