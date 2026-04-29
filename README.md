# AuthentiScan — Forensic Intelligence Platform

A full-stack forensic intelligence platform for marketplace fraud detection with real-time SSE-powered analysis, trust scoring, saved report dashboards, PDF export, comparison engine, and admin moderation workflows.

## Problem Solved

E-commerce platforms are flooded with counterfeit listings, manipulated reviews, and fraudulent sellers. AuthentiScan runs a multi-layer forensic pipeline against any product URL — combining deterministic heuristic scoring with Gemini AI narration — to produce an actionable trust verdict.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│  React Router v6 · Zustand · TanStack Query         │
│  Lazy Routes · Memoization · Skeleton Loaders       │
├─────────────┬───────────────────────────────────────┤
│  Auth Layer │  Feature Pages                        │
│  JWT + bcrypt│  Dashboard · Analyze · Compare       │
│  Protected  │  Admin Panel · Share · Report         │
│  Routes     │                                       │
└─────────────┴───────────────┬───────────────────────┘
                              │ REST + SSE
┌─────────────────────────────▼───────────────────────┐
│               Express API Gateway                   │
│  /api/auth  /api/reports  /api/compare  /api/admin  │
│  Rate limiting · Helmet · Cookie-parser · CORS      │
├──────────────────────┬──────────────────────────────┤
│    Worker Process    │    Core Services             │
│  Job queue poller    │  Scraper (Playwright)        │
│  Forensic pipeline   │  Heuristic scoring           │
│  SSE log streaming   │  Gemini AI verifier          │
└──────────────────────┴──────────┬───────────────────┘
                                  │
                          ┌───────▼───────┐
                          │   MongoDB     │
                          │  users jobs   │
                          │  reports cache│
                          │  intelligence │
                          └───────────────┘
```

---

## Features

| Feature | Details |
|---------|---------|
| **Authentication** | JWT + bcrypt, signup/login/forgot-password, protected routes |
| **Forensic Analysis** | Playwright scraping + heuristic engine + Gemini AI narration, SSE real-time logs |
| **AI Copilot** | Floating chat drawer to explain fraud signals and generate buyer warnings |
| **Saved Reports** | Filter by verdict, search, sort, pin, favorite, delete |
| **PDF Export** | One-click forensic report PDF download via jsPDF + html2canvas |
| **Shareable Links** | Generate public secure share tokens — no auth required to view |
| **Compare Engine** | Side-by-side trust score comparison via saved report IDs or live URLs |
| **Admin Panel** | Recharts heatmap, TanStack Table flagged queue, user management, audit trail |
| **Design System** | Custom `src/ui` library with Input, Drawer, Tabs, Card, StatBox, Table |
| **Forms** | React Hook Form + Zod schema validation |
| **Performance** | Lazy routes, React.memo, Suspense, Lighthouse 95+ optimized |
| **CI/CD** | GitHub Actions — lint → build → test on every PR |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, React Router v6, Zustand, TanStack Query, React Hook Form, Zod |
| Styling | Vanilla CSS, Design System Primitives (`src/ui`), glassmorphism |
| Backend | Node.js, Express 5 |
| Scraping | Playwright + stealth plugin |
| AI | Google Gemini 1.5 Flash |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| CI/CD | GitHub Actions |
| Deployment | Render (`render.yaml`) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas URI
- Google Gemini API key

### Setup

```bash
git clone https://github.com/yourusername/authentiscan-v2
cd authentiscan-v2
npm install
```

Create `.env`:
```env
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=your_key_here
JWT_SECRET=your_super_secret_32_char_string
PORT=3001
NODE_ENV=development
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=Admin1234!
```

```bash
npm run dev
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| User | `demo@authentiscan.io` | `Demo1234!` |
| Admin | Set via `ADMIN_EMAIL` env | Set via `ADMIN_PASSWORD` env |

> Demo user is auto-seeded on first server boot.

---

## Scripts

```bash
npm run dev          # Start all: client + server + worker
npm run build        # Production build
npm run lint         # ESLint check
npm run test         # Run Vitest unit tests
npm run test:watch   # Watch mode
```

---

## Folder Structure

```
src/
├── app/              # Router entry
├── features/         # Domain-driven features
│   ├── auth/         # Login, Signup, ForgotPassword
│   ├── dashboard/    # DashboardPage, ReportCard
│   ├── analyzer/     # AnalyzePage (SSE flow)
│   ├── report/       # ReportPage, SharePage, AICopilot
│   ├── compare/      # ComparePage
│   └── admin/        # AdminPanel (Recharts, TanStack Table)
├── ui/               # Design System Primitives
│   └── Input, Drawer, Tabs, Card, StatBox, Table
├── shared/           # Legacy shared components
├── layouts/          # AppLayout, AuthLayout
├── hooks/            # useAuth, useReports, useDebounce
├── store/            # authStore, uiStore
├── schemas/          # Zod validation schemas
├── services/         # api.js, queryClient.js
└── styles/           # main.css, ui.css, dashboard.css
```

---

## Resume Bullets

> Built a full-stack forensic intelligence platform with SSE-powered real-time analysis, trust scoring engine, fraud anomaly detection, secure report sharing, and admin moderation workflows for marketplace scam detection.

> Architected a custom React design system and implemented React Hook Form + Zod for robust data validation, improving form reliability and reducing boilerplate.

> Engineered a high-performance admin dashboard using TanStack Table and Recharts to visualize 30-day fraud heatmaps and trust score distributions, maintaining 95+ Lighthouse performance scores.

---

## Roadmap

- [ ] Redis job queue (replace MongoDB polling)
- [ ] WebSocket for real-time dashboard updates
- [ ] Image forensics (reverse image search signal)
- [ ] Browser extension
- [ ] Stripe billing for API credits
