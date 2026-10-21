# Boxing Tracker

A full-stack training tracker for boxing and Muay Thai. Log your sessions and look back at your old session. Eventually, I'll add a workout generator using AI.

Live Link: https://boxing-tracker-client-b2wn.onrender.com

> **Status:** In progress. The AI feature is not started. The checklist under [Roadmap](#roadmap) shows what is real today versus planned.

---

## What it does

Three core features (scope is intentionally capped at three):

1. **Session logger** – record a training session: date, type (boxing, Muay Thai, etc.), duration, and notes.
2. **Session history** – browse past sessions, newest first.
3. **AI workout generator** – ask for a workout and get one back, generated server-side through the Anthropic API.

The app is **single-user** for now. Auth is deliberately deferred (see [Design decisions](#design-decisions)).

---

## Tech stack

| Layer           | Choice                                                                        |
| --------------- | ----------------------------------------------------------------------------- |
| Frontend        | React (Vite), ESLint, Prettier                                                |
| Backend         | Node.js + Express (REST)                                                      |
| Database        | PostgreSQL, accessed with raw SQL via `pg`                                    |
| AI              | Anthropic API, called from the server only                                    |
| Dev environment | Windows 11, WSL Ubuntu, VS Code, nvm, npm                                     |
| API testing     | REST Client (`.http` files)                                                   |
| Hosting         | Render (static site + web service, defined in `render.yaml`), Neon (Postgres) |

---

## Architecture

- The browser never talks to the database or to Anthropic directly. The Anthropic API key lives only in the server's `.env`, because anything shipped to the browser is visible in DevTools.

### Project layout

```text
boxing-tracker/
├── client/          # React app (Vite)
│   ├── src/App.jsx          # session logger form + session history table
│   ├── src/helpers/         # dateFormatter, durationFormatter
│   └── .env.example
├── server/          # Express API
│   ├── server.js        # routes and pg Pool
│   ├── schema.sql       # tables + seeded session types
│   ├── seed.sql         # test data (truncates sessions)
│   ├── requests.http    # REST Client requests
│   └── .env.example
├── eslint.config.mjs    # root ESLint config
├── render.yaml      # Render Blueprint (client, server)
├── .gitignore       # node_modules/, .env
└── README.md
```

### Data model (see `server/schema.sql`)

`session_types` (lookup table)

| Column | Type                                                | Why                                                               |
| ------ | --------------------------------------------------- | ----------------------------------------------------------------- |
| `id`   | integer, `generated always as identity` primary key | unique row identity                                               |
| `name` | text, not null, unique                              | "Boxing" and "Muay Thai" are seeded; anything else is an `INSERT` |

`sessions`

| Column             | Type                                                 | Why                                                                                          |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `id`               | integer, `generated always as identity` primary key  | unique row identity                                                                          |
| `session_date`     | `DATE`, not null                                     | the day you trained, not the day you logged it; sorts correctly and aggregates by week/month |
| `session_type_id`  | integer, not null, foreign key → `session_types(id)` | links each session to a type                                                                 |
| `duration_in_mins` | integer, not null, `CHECK (> 0)`                     | easy to sum and average; the database rejects zero or negative durations                     |
| `notes`            | text, nullable                                       | free-form                                                                                    |

Session type is its own table. Adding a new type (climbing, general workout, or sublabels like sparring, technique, strength, cardio) is then just an `INSERT`, with no schema change, which is a lot easier.

No `user_id` yet, since the app is single-user. Adding it later would be a little complicated but having to do auth and other multi-user stuff would be a lot right now.

### API (REST routes)

| Method | Route                | Purpose                                                                                                        | Status  |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------------------- | ------- |
| GET    | `/session-types`     | list available session types (`id` and `name`, ordered by `id`; for the logger's dropdown)                     | done    |
| GET    | `/sessions`          | list sessions joined with their type name, newest first, capped at 15                                          | done    |
| POST   | `/sessions`          | create a session; returns `201` with the created row (same shape as `GET /sessions`, including `session_type`) | done    |
| POST   | `/workouts/generate` | generate a workout via the Anthropic API                                                                       | planned |

`GET /sessions` casts `session_date` to text in SQL, because `pg` would otherwise convert a `DATE` into a JS `Date` and the JSON would include a timezone.

`POST /sessions` takes `session_date`, `session_type` (the type's name, e.g. `"Muay Thai"`), `duration_in_mins`, and `notes`. The type name is resolved to its id with a subquery inside the `INSERT`, so the client never needs to know ids. Database errors are mapped to error messages through an `errorMessages` lookup keyed on the error's column, constraint, or code (null `session_type_id`, missing date or duration, the `duration_in_mins > 0` check, Postgres codes `22007` and `22008` for an invalid date, `22P02` for a non-numeric duration, and `22003` for a duration too large for an integer), and return `400`. Anything unrecognized returns `500`.

---

## Design decisions

| Decision                              | Reasoning                                                                                                                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Raw SQL over an ORM (e.g. Prisma)** | The project is small, and writing SQL directly builds a better understanding of the database layer.                                                                                             |
| **PostgreSQL over SQLite**            | Enforced types and a clear path to multi-user and concurrent writes. Not that much trouble to set up vs a massive headache later. SQLite would have been fine for a pure single-user prototype. |
| **Plain JavaScript, not TypeScript**  | TypeScript pays off at scale; for a solo mid-build project it adds config without advancing the app. JSDoc annotations give some type documentation. Eventually I'll learn TypeScript though.   |
| **Session type as a lookup table**    | A `session_types` table with a foreign key from `sessions` lets new types (and possibly sublabels) be added without a schema change, unlike a `CHECK` constraint or `ENUM`.                     |
| **Auth deferred**                     | Single-user first to reduce complexity because I don't have that much time right now.                                                                                                           |
| **API key server-side only**          | Frontend code is untrusted. `.env` holds secrets, `.gitignore` keeps it out of git, and `.env.example` documents the shape without exposing values.                                             |

---

## Getting started

(I had claude do this)

> Setup steps will be finalized as the database and client wiring land. This is the intended flow.

**Prerequisites:** Node.js (via nvm), PostgreSQL, npm.

```bash
# clone
git clone <repo-url>
cd boxing-tracker

# database (Postgres runs in WSL, not Docker; it doesn't start automatically)
sudo service postgresql start

# one time: a fresh Postgres only has the `postgres` role, so create a role named
# after your Linux user (so `psql` can log in without a password) and a database it owns
sudo -u postgres psql -c "create role $USER with login password 'choose-a-password'"
sudo -u postgres createdb -O $USER boxing_tracker

# one time: creates tables and seeds Boxing and Muay Thai.
# Don't rerun it: `create table` will error on the existing tables.
psql -d boxing_tracker -f server/schema.sql

# server
cd server
npm install
cp .env.example .env     # then set DATABASE_URL and ORIGIN (below)
npm run dev              # node --watch: restarts on save; port 3000 unless PORT is set
npm run seed             # optional: WARNING deletes ALL sessions, then inserts test rows

# client (second terminal)
cd client
npm install
cp .env.example .env     # then set VITE_API_URL (below)
npm run dev
```

**Environment variables**

Server (`server/.env.example`):

- `DATABASE_URL`: the Postgres connection, using the role and password you created above: `postgresql://<your-linux-username>:<choose-a-password>@localhost:5432/boxing_tracker`.
- `ORIGIN`: the client's URL (e.g. `http://localhost:5173`). Required: it is the only origin CORS allows, and the server exits at startup if it is unset.
- `PORT`: optional, defaults to `3000`.

Client (`client/.env.example`):

- `VITE_API_URL`: the server's URL (e.g. `http://localhost:3000`). If unset, the page shows a config error instead of loading.

`ANTHROPIC_API_KEY` is added once the AI feature is built. Never commit `.env`.

---

## Deployment

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec) that sets up the client and server in one go. The database is hosted on [Neon](https://neon.tech), because Render allows only one free Postgres database per account and its free databases are deleted after 30 days.

| Resource                | Type                    | Notes                                                                                                                                           |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `boxing-tracker-api`    | Node web service (free) | runs `node server.js` from `server/`; Render sets `PORT`; `ORIGIN` is the client's URL; `DATABASE_URL` is entered when the Blueprint is applied |
| `boxing-tracker-client` | static site             | builds `client/` and serves `dist/`; `VITE_API_URL` is the API's URL                                                                            |

`ORIGIN` and `VITE_API_URL` are hardcoded in `render.yaml`, because a Blueprint can only reference another service's host, not its full `https://` URL. Render added a random suffix to both service names, so the live URLs are:

- Client: https://boxing-tracker-client-b2wn.onrender.com
- API: https://boxing-tracker-api-p2q1.onrender.com

If either service is recreated, check its URL in the Render dashboard and update `render.yaml` to match. `VITE_API_URL` is baked into the client at build time, so the static site must rebuild after it changes.

1. Create a Neon project and copy its connection string (`postgresql://...neon.tech/neondb?sslmode=require`). No code change is needed: `pg` reads `sslmode=require` from the string and enables SSL, which Neon requires.
2. One time: create the tables (`schema.sql` errors if it runs twice):
   ```bash
   psql "<neon-connection-string>" -f server/schema.sql
   ```
   Optionally seed it with `psql "<neon-connection-string>" -f server/seed.sql`. Don't use `npm run seed` for this, because it targets the local database.
3. Push `render.yaml` to GitHub.
4. In the Render dashboard: **New → Blueprint**, pick this repo, paste the Neon connection string when prompted for `DATABASE_URL`, and click **Apply**. `sync: false` keeps the secret in Render's dashboard instead of the committed YAML.

Free-tier caveats: the free web service sleeps when idle, so the first request after a while takes about 30 seconds. Neon's free database also suspends when idle and wakes on the next query, which adds a short delay.

---

## Roadmap

**Done**

- [x] Project scaffolding (Vite client, Express server, Git, GitHub)
- [x] Basic Express routes tested with REST Client
- [x] Initial `sessions` schema designed
- [x] `schema.sql` and database connection from Express (`pg` Pool via `DATABASE_URL`)
- [x] `GET /sessions` backed by Postgres
- [x] `POST /sessions` backed by Postgres, with DB errors mapped to `400` messages
- [x] Seed script for testing (`npm run seed`)
- [x] ESLint config
- [x] `GET /session-types` backed by Postgres
- [x] CORS restricted to the client origin (`ORIGIN`)
- [x] Session history view in React (bare-bones read-only table of the latest 15 sessions)
- [x] Session logger form in React (type dropdown filled from `GET /session-types`, client-side checks, shows the server's error message on a `400`, and adds the new session to the history table without a refetch)

- [x] Deployment (Render Blueprint in `render.yaml` for client and API, Neon for Postgres)

**Core build**

- [ ] AI workout generator (server route + UI)

---

## TODO: future features and how to implement them

### 1. Edit and delete sessions

- **Why:** It's annoying if you can't edit or delete mistakes, and it completes the CRUD set.
- **Approach:** add `PUT /sessions/:id` and `DELETE /sessions/:id`. Use route params for the id and parameterized queries (`$1`, `$2`) for every value. On the client, reuse the logger form pre-filled for editing.

### 2. Filtering, sorting, and pagination on history

- **Why:** History gets long after a lot of use.
- **Approach:** accept query params like `?type=boxing&from=2026-10-01&to=2026-10-31&limit=20&offset=0` on `GET /sessions`. Build the `WHERE` clause conditionally while keeping values parameterized. Add `ORDER BY session_date DESC`.

### 3. Richer session detail (rounds, drills, intensity)

- **Why:** "60 minutes, boxing" is thin. Rounds, drills, and a perceived-effort score make the data far more useful, and give the AI generator better context.
- **Approach:** add a second table (e.g. `session_entries`) with a foreign key to `sessions`, one row per round or drill. Fetch with a `JOIN` or a second query.

### 4. Data visualization / stats dashboard

- **Why:** It's cool to see your stats.
- **Approach:** add aggregate endpoints using SQL (`GROUP BY`, `DATE_TRUNC('week', session_date)`, `SUM(duration_in_mins)`), and render with a small chart library such as Recharts on the client.

### 5. Smarter AI generation

- **Why:** A workout tailored for you is a lot more beneficial.
- **Approach:** have the server read recent sessions, summarize them, and include that summary in the prompt sent to the Anthropic API. Ask for structured output (e.g. JSON with rounds and drills) so the client can render it reliably. Rate limit the generate route (see item 8) so a bug can't burn your API budget.

### 6. Authentication and multi-user support

- **Why:** Needed so real users can have separate data.
- **Approach:** add a `users` table and a `user_id` foreign key on `sessions` (the migration cost you already weighed). Hash passwords with bcrypt, then pick sessions or JWT. Scope every query with `WHERE user_id = $1`.

### 7. PWA support

- **Why:** So you can use it on your phone without having to download anything. Learning how to make an IOS app and then connecting the website and the app sounds fun so maybe I'll do that later instead. Not sure
- **Approach:** add a web app manifest and a service worker (the Vite PWA plugin handles most of the wiring). Cache the app shell, and consider queuing session logs offline and syncing when back online.

### 8. Caching, idempotency, and rate limiting

- **Why:** these protect the API as it grows. Caching saves repeated work, idempotency stops a retried request from creating a duplicate, and rate limiting stops abuse or a client bug from running up cost (especially on the Anthropic call).
- **Approach:** not really sure how to approach or do this tbh, but I will look into it in the future.

### 9. Quality and polish

- **Input validation** on the server and matching client-side checks. Partly covered already: `POST /sessions` relies on database constraints and maps their errors to `400`s (bad dates, non-positive durations), but there is no validation in the route itself.
- **Error handling middleware** in Express so failures return consistent JSON.
- **Automated tests** (e.g. Vitest or Jest with Supertest for routes) once the API stabilizes.
- **JSDoc annotations** on route handlers and utilities.
- **Mobile-friendly layout** and accessibility pass.

---

## What I learned building this

- JavaScript's async model (Promises, async/await) and arrow functions (pretty different from what I've learned, ie. Java, Python, and C)
- React components and how they work with JSX
- Postgres and how to create a database and modify it
- GET, POST, PUT, and DELETE methods (PUT and DELETE are things I've read, but haven't properly implemented on my own yet)
- How to use Expressjs and make route handlers

- Basic CSS styling things

---

## Challenges

- Had to read a ton of documentation
- Asked Claude guiding questions a lot of the time when I didn't understand material.
- React was really confusing with the useStates, components, and how things were rendered

- Took a while to plan out how things would work together. Starting it was pretty overwhelming until I broke it down

---

## AI Usage

- Orignally had Claude draft the README
- Acted as a socratic tutor. Wouldn't write actual code but rather provide example snippets that I could adopt.
- Provided guiding questions that made sure I understood what I was implementing.

## License

TBD.
