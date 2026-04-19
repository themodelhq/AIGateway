# AI Gateway Platform

A full-stack platform for managing access to multiple AI providers through a single unified API. Features include API key management, usage analytics, an interactive AI playground, and an admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Vite · TailwindCSS v4 · shadcn/ui |
| Backend | Node.js · Express · tRPC |
| Database | MySQL (via Drizzle ORM) |
| Auth | Email/password with JWT session cookies |
| Hosting | Netlify (frontend) + Render (backend) |

---

## Local Development

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A MySQL database (local or remote)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example .env

# 3. Fill in at minimum:
#    DATABASE_URL=mysql://user:pass@localhost:3306/ai_gateway
#    JWT_SECRET=any-long-random-string

# 4. Push schema to your database
pnpm db:push

# 5. Start dev server (frontend + backend together)
pnpm dev
```

Open http://localhost:3000

---

## Deployment

### Architecture

```
Browser → Netlify (React SPA)
              ↓  /api/* requests
         Render (Express API)
              ↓
         MySQL (PlanetScale or Render MySQL)
```

---

### Step 1 — Database

Use any MySQL-compatible provider:
- **[PlanetScale](https://planetscale.com)** (recommended — serverless, free tier)
- **Render MySQL** (add-on in the Render dashboard)
- **Railway**, **Aiven**, or any self-hosted MySQL

Save the connection string — you'll need it as `DATABASE_URL`.

---

### Step 2 — Deploy the Backend to Render

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` automatically. Review and click **Apply**.
5. In **Environment**, set the following variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your MySQL connection string |
| `JWT_SECRET` | A long random secret (Render can generate one) |
| `ADMIN_EMAIL` | Your email — this account gets admin role on first sign-up |
| `APP_ID` | `ai-gateway` (or any identifier) |

6. Click **Deploy**. After it goes live, copy the service URL (e.g. `https://ai-gateway-api.onrender.com`).

> **Free tier note:** Render free instances spin down after inactivity. Upgrade to Starter ($7/mo) for always-on.

---

### Step 3 — Deploy the Frontend to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
2. Connect your GitHub repo.
3. Netlify detects `netlify.toml` — build settings are pre-configured.
4. In **Site configuration → Environment variables**, add ONE variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render URL, e.g. `https://ai-gateway-api.onrender.com` |

5. Click **Deploy site**.

> **That's it.** No editing of any config files needed. `VITE_API_URL` tells the frontend exactly where your backend lives.

---

### Step 4 — Run Database Migrations

After both services are live, run the migrations against your production database:

```bash
DATABASE_URL=<your-production-url> pnpm db:push
```

Or connect to your database directly and run the SQL files in `drizzle/` in order:
1. `0000_moaning_ghost_rider.sql`
2. `0001_empty_mister_fear.sql`
3. `0002_add_password_hash.sql`

---

### Step 5 — Create the First Admin Account

1. Visit your Netlify URL and click **Sign Up**.
2. Register with the email you set as `ADMIN_EMAIL` in Render.
3. That account is automatically granted the `admin` role.
4. Navigate to `/admin` to access the admin panel.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing session JWTs |
| `APP_ID` | Optional | App identifier (default: `ai-gateway`) |
| `ADMIN_EMAIL` | Optional | Email that auto-receives admin role |
| `VITE_API_URL` | Frontend only | Backend URL when hosted separately |
| `FORGE_API_URL` | Optional | URL for built-in proxy utilities |
| `FORGE_API_KEY` | Optional | API key for built-in proxy utilities |

---

## Project Structure

```
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # Home, Login, Dashboard, Playground, AdminPanel
│       ├── components/
│       └── _core/
├── server/          # Express backend
│   ├── _core/       # Auth, env, tRPC setup
│   ├── db.ts        # All database queries
│   └── routers.ts   # tRPC routes
├── drizzle/         # Database schema & migrations
├── shared/          # Types shared between client and server
├── render.yaml      # Render deployment config
└── netlify.toml     # Netlify deployment config
```

---

## Completing Phase 9 (AI Provider Routing)

The platform is ready for provider integration. To add real AI routing:

1. Add provider API keys to `providerConfigs` table via the admin panel (or seed script).
2. Create `server/providers/` — one file per provider implementing a common interface.
3. Wire the playground's chat endpoint to the routing layer in `server/routers.ts`.

---

## License

MIT
