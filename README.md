# Boxing Tracker

A full-stack training tracker for boxing and Muay Thai. Log your sessions, look back at your history, and (eventually) generate workouts with AI.

> **Status:** in progress. Scaffolding, Express routes, and the initial schema design are done. Postgres setup and the three core features are being built. The checklist under [Roadmap](#roadmap) shows what is real today versus planned.

---

## What it does

Three core features (scope is intentionally capped at three):

1. **Session logger** – record a training session: date, type (boxing, Muay Thai, etc.), duration, and notes.
2. **Session history** – browse past sessions, newest first.
3. **AI workout generator** – ask for a workout and get one back, generated server-side through the Anthropic API.

The app is **single-user** for now. Auth is deliberately deferred (see [Design decisions](#design-decisions)).

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite), ESLint, Prettier |
| Backend | Node.js + Express (REST) |
| Database | PostgreSQL, accessed with raw SQL via `pg` |
| AI | Anthropic API, called from the server only |
| Dev environment | Windows 11, WSL Ubuntu, VS Code, nvm, npm |
| API testing | REST Client (`.http` files) |
| Planned hosting | Vercel (frontend), Render (backend + database) |

---

## Architecture

```
React client  ──HTTP──▶  Express server  ──SQL──▶  PostgreSQL
                              │
                              └──HTTPS──▶  Anthropic API
```

The browser never talks to the database or to Anthropic directly. The Anthropic API key lives only in the server's `.env`, because anything shipped to the browser is visible in DevTools.

### Project layout

```
boxing-tracker/
├── client/          # React app (Vite)
├── server/          # Express API
├── .gitignore       # node_modules/, .env
└── README.md
```

### Data model (initial draft)

`session_types` (lookup table)

| Column | Type | Why |
|---|---|---|
| `id` | serial primary key | unique row identity |
| `name` | text, unique | "Boxing", "Muay Thai", and later anything else |

`sessions`

| Column | Type | Why |
|---|---|---|
| `id` | serial primary key | unique row identity |
| `date` | `DATE` (`YYYY-MM-DD`) | sorts correctly and aggregates by week/month |
| `session_type_id` | integer, foreign key → `session_types(id)` | links each session to a type (column name is provisional) |
| `duration_minutes` | integer | easy to sum and average |
| `notes` | text | free-form |

Session type is its own table, not a text column, a `CHECK` constraint, or an `ENUM`. Adding a new type (climbing, general workout, or sublabels like sparring, technique, strength, cardio) is then just an `INSERT`, with no schema change.

No `user_id` yet, since the app is single-user. The tradeoff was weighed: adding it later is a migration, but the complexity saved now is worth more.

### API (planned REST routes)

| Method | Route | Purpose |
|---|---|---|
| GET | `/session-types` | list available session types (for the logger's dropdown) |
| GET | `/sessions` | list sessions (joined with their type name) |
| POST | `/sessions` | create a session |
| POST | `/workouts/generate` | generate a workout via the Anthropic API |

---

## Design decisions

| Decision | Reasoning |
|---|---|
| **Raw SQL over an ORM (e.g. Prisma)** | The project is small, and writing SQL directly builds a real understanding of the database layer. |
| **PostgreSQL over SQLite** | Enforced types and a clear path to multi-user and concurrent writes. A small setup cost now beats a migration later. SQLite would have been fine for a pure single-user prototype. |
| **Postgres in WSL, not Docker** | The Express server already runs in WSL, and a reviewer is unlikely to run the project locally. |
| **Plain JavaScript, not TypeScript** | TypeScript pays off at scale; for a solo mid-build project it adds config without advancing the app. JSDoc annotations give some type documentation. |
| **Session type as a lookup table** | A `session_types` table with a foreign key from `sessions` lets new types (and possibly sublabels) be added without a schema change, unlike a `CHECK` constraint or `ENUM`. |
| **Auth deferred** | Single-user first to reduce complexity. |
| **API key server-side only** | Frontend code is untrusted. `.env` holds secrets, `.gitignore` keeps it out of git, and `.env.example` documents the shape without exposing values. |

---

## Getting started

> Setup steps will be finalized as the database and client wiring land. This is the intended flow.

**Prerequisites:** Node.js (via nvm), PostgreSQL, npm.

```bash
# clone
git clone <repo-url>
cd boxing-tracker

# server
cd server
npm install
cp .env.example .env     # then fill in values
npm run dev              # check the scripts in package.json

# client (second terminal)
cd client
npm install
npm run dev
```

**Environment variables** (see `server/.env.example` once added): database connection details, and `ANTHROPIC_API_KEY` once the AI feature is built. Never commit `.env`.

---

## Roadmap

**Done**
- [x] Project scaffolding (Vite client, Express server, Git, GitHub)
- [x] Basic Express routes tested with REST Client
- [x] Initial `sessions` schema designed

**Core build**
- [ ] Install and configure Postgres in WSL
- [ ] `schema.sql` and database connection from Express
- [ ] `POST /sessions` and `GET /sessions` backed by Postgres
- [ ] Session logger form in React
- [ ] Session history view in React
- [ ] AI workout generator (server route + UI)
- [ ] Deployment (Vercel + Render)

---

## TODO: future features and how to implement them

These are **gated**: nothing here starts until the three core features work end-to-end. Each entry has a rough approach and the questions to answer *before* writing code, so the decision stays yours.

### 1. Edit and delete sessions
- **Why:** a logger you can't correct is frustrating, and it completes the CRUD set.
- **Approach:** add `PUT /sessions/:id` and `DELETE /sessions/:id`. Use route params for the id and parameterized queries (`$1`, `$2`) for every value. On the client, reuse the logger form pre-filled for editing.
- **Decide first:** what status code and body should a delete of a nonexistent id return? Should delete be permanent or a soft delete flag?

### 2. Filtering, sorting, and pagination on history
- **Why:** history gets long fast.
- **Approach:** accept query params like `?type=boxing&from=2026-10-01&to=2026-10-31&limit=20&offset=0` on `GET /sessions`. Build the `WHERE` clause conditionally while keeping values parameterized. Add `ORDER BY date DESC`.
- **Decide first:** offset pagination vs. cursor pagination, and which one holds up as the table grows? Would an index on `date` help?

### 3. Richer session detail (rounds, drills, intensity)
- **Why:** "60 minutes, boxing" is thin. Rounds, drills, and a perceived-effort score make the data far more useful, and give the AI generator better context.
- **Approach:** add a second table (e.g. `session_entries`) with a foreign key to `sessions`, one row per round or drill. Fetch with a `JOIN` or a second query.
- **Decide first:** one-to-many vs. a JSON column on `sessions`? What does each cost when you later want to query "total rounds of pad work this month"?

### 4. Data visualization / stats dashboard
- **Why:** turns logged data into something motivating (weekly volume, streaks, sessions by type).
- **Approach:** add aggregate endpoints using SQL (`GROUP BY`, `DATE_TRUNC('week', date)`, `SUM(duration_minutes)`), and render with a small chart library such as Recharts on the client.
- **Decide first:** compute aggregates in SQL or in JavaScript? Why is SQL usually the better place?

### 5. Smarter AI generation
- **Why:** a generic workout is less useful than one based on your history.
- **Approach:** have the server read recent sessions, summarize them, and include that summary in the prompt sent to the Anthropic API. Ask for structured output (e.g. JSON with rounds and drills) so the client can render it reliably. Add basic rate limiting on the generate route so a bug can't burn your API budget.
- **Decide first:** how much history is enough context without bloating the prompt? What happens when the API call fails or returns malformed output?

### 6. Authentication and multi-user support
- **Why:** needed before real users can have separate data.
- **Approach:** add a `users` table and a `user_id` foreign key on `sessions` (the migration cost you already weighed). Hash passwords with bcrypt, then pick sessions or JWT. Scope every query with `WHERE user_id = $1`.
- **Decide first:** sessions vs. JWT, and why? Where does the token live on the client, and what are the security tradeoffs of each place?

### 7. PWA support
- **Why:** installable on a phone and usable at the gym, even with poor signal.
- **Approach:** add a web app manifest and a service worker (the Vite PWA plugin handles most of the wiring). Cache the app shell, and consider queuing session logs offline and syncing when back online.
- **Decide first:** what should work offline, and how do you handle sync conflicts?

### 8. Quality and polish
- **Input validation** on the server (reject bad dates, negative durations) and matching client-side checks.
- **Error handling middleware** in Express so failures return consistent JSON.
- **Automated tests** (e.g. Vitest or Jest with Supertest for routes) once the API stabilizes.
- **JSDoc annotations** on route handlers and utilities.
- **Mobile-friendly layout** and accessibility pass.

---

## What I learned building this

- JavaScript's async model (Promises, async/await) is the core conceptual shift coming from C, Python, and Java.
- Frontend code is untrusted territory; secrets belong on the server.
- Defensibility over completeness: a working app I can fully explain beats a polished one I can't.

---

## License

TBD.
