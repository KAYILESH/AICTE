# AICTE Smart Complaint Management System

> **SIH Prototype** — This is a demonstration system built for Smart India Hackathon 2026.  
> It is **not** an official AICTE complaint submission service.  
> All institution data is synthetic. Do not submit real personal data.

---

## 📋 Project Overview

A full-stack student portal allowing students to submit grievances about technical education institutions, receive a unique Complaint ID, and track resolution progress in real time.

After submission, an **AI-powered routing engine** automatically assigns each complaint to:
- **RB** — Regulation Bureau (regulatory/approval matters)
- **PGRC** — Public Grievance Redressal Cell (student welfare matters)
- **Triage** — Manual review queue for ambiguous cases

---

## 🗂️ Repository Structure

```
AICTE/
├── frontend/                 # Next.js 14 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/            # Auth pages
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── student/          # Protected student pages
│   │   │       ├── dashboard/
│   │   │       ├── complaints/
│   │   │       │   ├── new/      # Multi-step complaint form
│   │   │       │   └── [id]/     # Complaint detail + timeline
│   │   │       ├── notifications/
│   │   │       └── profile/
│   │   ├── components/
│   │   │   └── layout/       # Header, Footer
│   │   ├── lib/
│   │   │   ├── api.ts        # Typed API client (JWT-authenticated)
│   │   │   └── supabase/     # Browser + server Supabase clients
│   │   └── middleware.ts     # Auth session refresh + route protection
│   └── .env.local.example
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── main.py           # Application entry point
│   │   ├── config.py         # Pydantic settings
│   │   ├── auth.py           # JWT validation middleware
│   │   ├── database.py       # Supabase admin client
│   │   ├── api/              # Route handlers
│   │   │   ├── complaints.py
│   │   │   ├── institutions.py
│   │   │   ├── notifications.py
│   │   │   └── profile.py
│   │   ├── models/
│   │   │   └── schemas.py    # Pydantic request/response models
│   │   ├── services/
│   │   │   └── complaint_service.py  # Business logic
│   │   └── routing/
│   │       └── engine.py     # AI routing engine (rule-based + NLP)
│   ├── tests/
│   │   └── test_backend.py
│   ├── requirements.txt
│   └── .env.example
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Full schema + RLS policies
│       └── 002_seed_data.sql        # Synthetic institution data
└── docs/
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & setup environment variables

```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local
# Edit: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_BASE_URL

# Backend
cp backend/.env.example backend/.env
# Edit: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
```

### 2. Database setup (Supabase)

1. Go to your Supabase project → SQL Editor
2. Run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/migrations/002_seed_data.sql`
4. In **Storage**, create a private bucket named `complaint-attachments`

### 3. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Run the frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

App: http://localhost:3000

---

## 🔑 Required Environment Variables

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL (e.g. `http://localhost:8000/api/v1`) |

> ⚠️ Only `NEXT_PUBLIC_*` variables are safe to expose to the browser.  
> **Never add `SUPABASE_SERVICE_ROLE_KEY` to frontend env.**

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-side only** |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase Dashboard → Settings → API |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `ROUTING_ENGINE` | `rule_based` or `nlp_model` |
| `NLP_MODEL_PATH` | Path to a trained sklearn `.joblib` model (optional) |

---

## 🧪 Running Tests

```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

### Test Coverage

| Area | Tests |
|---|---|
| Routing engine — RB routing | ✅ |
| Routing engine — PGRC routing | ✅ |
| Routing engine — triage fallback | ✅ |
| Complaint number format | ✅ |
| Payload validation — subject length | ✅ |
| Payload validation — declaration required | ✅ |
| Payload validation — invalid category | ✅ |
| Payload validation — short description | ✅ |
| API authentication required | ✅ |
| NLP router fallback to rule-based | ✅ |
| Health endpoint | ✅ |

---

## 🌐 Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Student login |
| `/register` | Student registration |
| `/forgot-password` | Password reset |
| `/student/dashboard` | Dashboard with stats + complaint list |
| `/student/complaints` | Full complaint list with filters |
| `/student/complaints/new` | 4-step complaint submission wizard |
| `/student/complaints/[id]` | Complaint detail + status timeline |
| `/student/notifications` | Notification inbox |
| `/student/profile` | Account settings |

---

## 🤖 AI Routing Engine

The routing engine (`backend/app/routing/engine.py`) uses a two-tier approach:

### Tier 1: Rule-Based Classifier (Default)
- Matches complaint category + keywords against configurable rules
- Transparent reasoning — every decision includes a human-readable explanation
- Rules are in `RULE_BASED_RULES` list — easy to update without redeployment

### Tier 2: NLP Model (Optional)
- Set `ROUTING_ENGINE=nlp_model` and `NLP_MODEL_PATH=/path/to/model.joblib`
- Accepts a scikit-learn pipeline with `.predict_proba()` support
- Falls back to rule-based if model is unavailable or confidence < threshold

### Triage Fallback
- When no rule matches or confidence is below threshold, the complaint is placed in a **triage queue** rather than forcing an incorrect assignment
- No complaint is ever lost — triage cases are routed for manual review

> ⚠️ **Demo Notice**: The included routing rules are illustrative only. They must be validated against official AICTE Bureau/Cell responsibilities before production use.

---

## 🛡️ Security

- **Row Level Security (RLS)** — Students can only read/write their own records
- **Service role key** — Only used on the backend (FastAPI), never exposed to frontend
- **JWT validation** — Every protected endpoint verifies the Supabase JWT server-side
- **Route protection** — Next.js middleware redirects unauthenticated users from `/student/*`
- **Idempotency** — Complaint submission is idempotent; duplicate requests return the existing record
- **File validation** — Type and size validated on both client and server
- **Audit logs** — Key events recorded in `audit_logs` table

---

## 🚢 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_BASE_URL`
3. Deploy

### Backend (Render)
1. Create a Web Service, connect repo
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set all backend environment variables in the Render dashboard

---

## 📌 Assumptions & Limitations

### Assumptions
1. Supabase is used for both authentication and database (PostgreSQL)
2. Email verification is handled by Supabase's built-in flow
3. Complaint categories are prototype-only and need official validation
4. Routing rules are illustrative — not official AICTE Bureau responsibilities
5. Attachment download is not implemented in this prototype (storage paths are recorded)

### Known Limitations
1. **No email notifications** — SMTP is not configured by default; in-app only
2. **No real-time updates** — Dashboard requires manual refresh or page reload
3. **NLP model not trained** — Default engine is rule-based; NLP model requires a pre-trained sklearn artifact
4. **No officer portal** — RB/PGRC officer management is out of scope for this prototype
5. **Mobile header nav** — Uses CSS media queries; a native mobile app is not included
6. **Attachment download** — Files are stored in Supabase Storage but download links require signed URL generation (not yet implemented)

### Future Integrations
- RB Portal (separate authorized application)
- PGRC Portal (separate authorized application)
- AICTE Integrated Monitoring Dashboard
- Cross-bureau case transfer workflow
- Deadline monitoring and escalation automation
- Analytics and reporting module
- Real-time status updates via Supabase Realtime

---

## 📄 API Documentation

Interactive API docs (Swagger UI): http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/complaints/dashboard-stats` | Student dashboard counts |
| `GET` | `/api/v1/complaints` | List student's complaints (paginated) |
| `POST` | `/api/v1/complaints` | Submit new complaint |
| `GET` | `/api/v1/complaints/{id}` | Get complaint detail |
| `POST` | `/api/v1/complaints/{id}/attachments` | Upload attachment |
| `GET` | `/api/v1/institutions` | Search institution directory |
| `GET` | `/api/v1/notifications` | List notifications |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark notification read |
| `GET` | `/api/v1/profile/me` | Get student profile |
| `PATCH` | `/api/v1/profile/me` | Update student profile |

All protected endpoints require `Authorization: Bearer <supabase-access-token>`.

---

## 📊 Database Schema Summary

| Table | Purpose |
|---|---|
| `profiles` | Student profile data (extends auth.users) |
| `institutions` | Institution directory (synthetic demo data) |
| `complaints` | Core complaint records |
| `complaint_attachments` | File metadata (stored in Supabase Storage) |
| `complaint_status_history` | Chronological status timeline |
| `routing_decisions` | AI routing decision audit trail |
| `bureau_assignments` | Officer assignment records |
| `notifications` | In-app notification inbox |
| `related_complaints` | Cross-complaint links |
| `audit_logs` | Administrative event audit trail |

---

Built for **Smart India Hackathon 2026** · Team project demo only
