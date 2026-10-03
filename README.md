## 🚀 CollabSphere

CollabSphere is a **real-time collaborative project management platform** where teams can create organizations, manage projects using a **Kanban board**, collaborate on documents, chat in real time, and join online meetings through **Google Meet**.

### ✨ Key Features
- 🏢 Create & join organizations
- 📋 Kanban-based project management
- 🤝 Real-time collaboration
- 📝 Shared document management
- 💬 Real-time chat
- 📹 Google Meet integration
- 📊 Activity logs & data analysis


## Repository Structure

```
collabsphere/
├── backend/     # Express API + Socket.IO + MongoDB/Mongoose
└── frontend/    # React (JSX) + Vite + Tailwind CSS
```

Each folder has its own `README.md` with detailed setup instructions.

## Quickstart

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env    # fill in MONGO_URI, JWT secrets, Google OAuth creds, SMTP
npm run seed             # optional: creates demo data (admin@collabsphere.co / Password123!)
npm run dev               # starts on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env     # defaults already point at localhost:5000
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173` — the Vite dev server proxies API calls to the backend, so no CORS setup is needed locally.

## Core Features

- **Authentication** — email/password + Google OAuth 2.0 (redirect flow with account linking), JWT access/refresh tokens in httpOnly cookies, email verification, password reset
- **Multi-tenant workspaces** — organizations → workspaces → projects, with role-based access control (Workspace Admin, Project Manager, Member, Guest)
- **Kanban boards** — drag-and-drop tasks with live multi-user sync via Socket.IO, checklists, priorities, due dates, comments
- **Collaborative documents** — real-time co-editing with live cursors/typing indicators, autosave, version history and restore
- **Team chat** — channels, direct messages, threaded replies, reactions, typing indicators, read receipts
- **File management** — folders, drag-and-drop upload, version history, file locking, sharing, per-workspace storage quotas
- **Notifications** — real-time via Socket.IO, backed by a persistent notification center
- **Analytics** — productivity score, task completion trends, team workload, top contributors
- **Global search** — across tasks, documents, files, chat messages, and users
- **Audit logging** — every critical action (deletes, role changes, restores) is recorded

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Backend language | Plain JavaScript (CommonJS) — no TypeScript |
| Backend framework | Express.js |
| Database | MongoDB + Mongoose |
| Real-time | Socket.IO |
| Frontend language | JavaScript + JSX — no TypeScript |
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State management | Redux Toolkit |
| Auth | JWT + Google OAuth 2.0 (Passport) |

Deliberately **not used**, per project requirements: TypeScript, Prisma, PostgreSQL, Redis, Docker.

## License

Internal project — license terms as defined by the project owner.
