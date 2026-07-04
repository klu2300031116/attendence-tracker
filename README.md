# PS-96 — Attendance Trend Report (Full-Stack)

A full-stack rebuild of the PS-96 Module 6 capstone: a FastAPI backend that
generates/analyzes weekly class-attendance data (pandas resampling +
steady-decline detection via consecutive-week and linear-regression tests),
and a React frontend that visualizes the trend, flags at-risk classes, and
shows an admin summary.

```
ps96-fullstack/
├── backend/            FastAPI service (analysis engine + REST API)
│   ├── app/
│   │   ├── analysis.py   core pandas/numpy/scipy logic
│   │   └── main.py       API routes
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/            React (Vite) dashboard
│   ├── src/
│   │   ├── components/   TrendChart, FlaggedCard, ControlBar, AdminReport
│   │   ├── App.jsx
│   │   └── api.js         talks to the backend
│   ├── Dockerfile
│   └── vercel.json
├── docker-compose.yml    run both services together locally
└── render.yaml           one-click backend deploy blueprint for Render
```

## What it does

- Generates a synthetic dataset (6 classes, 24 weeks, ~6% missing days, one
  class with an injected steady decline) — or accepts your own CSV upload
  (`date, class_id, enrolled, present`).
- Validates and cleans the data (duplicates, negative values, present > enrolled).
- Aggregates to weekly attendance rate per class (`groupby` + `resample`).
- Flags classes with either 6+ consecutive declining weeks, or a
  statistically significant negative trend (linear regression, slope < -0.2
  pts/week, p < 0.1).
- Renders an interactive line chart, a card per flagged class, and an
  admin-facing text summary — all live from the API, no static PNGs.

## Run locally (no Docker)

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Visit `http://localhost:8000/docs` for interactive API docs.

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173`. It's pre-configured (via `.env.local`) to call
the backend at `http://localhost:8000`.

## Run locally with Docker

```bash
docker compose up --build
```
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Deploying it for real (free tiers)

**1. Push this folder to a GitHub repo** — deployment platforms deploy from Git.

**2. Backend → Render**
1. Go to [render.com](https://render.com), sign in with GitHub.
2. New + → Blueprint → pick this repo → Render detects `render.yaml` and
   builds `backend/Dockerfile` automatically. (Or: New + → Web Service →
   pick the repo → set root directory to `backend`, it'll pick up the
   Dockerfile.)
3. Once deployed you'll get a URL like `https://ps96-attendance-backend.onrender.com`.
   Note: Render's free tier spins down when idle, so the first request
   after inactivity takes ~30-60s to wake up — mention this if you demo it live.

**3. Frontend → Vercel**
1. Go to [vercel.com](https://vercel.com), sign in with GitHub, import the repo.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable: `VITE_API_URL` = your Render backend URL
   from step 2 (no trailing slash).
4. Deploy. You'll get a URL like `https://ps96-attendance.vercel.app`.

(Netlify works the same way — root directory `frontend`, build command
`npm run build`, publish directory `dist`, same `VITE_API_URL` env var.)

**4. Lock down CORS (optional but recommended before sharing widely)**
In `backend/app/main.py`, change:
```python
allow_origins=["*"]
```
to your actual Vercel URL, e.g. `allow_origins=["https://ps96-attendance.vercel.app"]`,
then redeploy the backend.

## For your resume / README

Suggested one-liner: *"Full-stack attendance analytics dashboard — FastAPI +
pandas backend for weekly trend aggregation and automated decline detection
(linear regression + consecutive-week tests), React + Recharts frontend,
containerized with Docker and deployed on Render/Vercel."*

## API reference

| Method | Path                      | Description                                  |
|--------|---------------------------|-----------------------------------------------|
| GET    | `/api/health`              | Liveness check                                |
| GET    | `/api/analysis?seed=42`    | Run pipeline on fresh synthetic data           |
| POST   | `/api/analysis/upload`     | Run pipeline on an uploaded CSV (multipart)    |
| GET    | `/api/analysis/csv?seed=42`| Download the synthetic dataset as CSV          |

Full interactive docs at `/docs` (Swagger) once the backend is running.
