<div align="center">

<img src="frontend/assets/logo2.svg" alt="StudyFlow AI Logo" width="80" />

# RAHVIYA

**The AI-first productivity workspace built for deep student focus.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/atlas)
[![Status](https://img.shields.io/badge/Status-Active%20Development-orange.svg)]()

[Live Demo](#) · [Report Bug](https://github.com/syed-imadulla/SudyFlow-Ai/issues) · [Request Feature](https://github.com/syed-imadulla/SudyFlow-Ai/issues)

</div>

---

## 📖 Description

Rahviya is a full-stack, open-source study productivity suite that combines an AI-guided ideation workflow, smart task planning, focus sessions, and deep analytics — all in a sleek, zero-distraction dark interface inspired by Linear, Raycast, and ChatGPT.

Designed for students who want to work smarter: break down complex subjects into actionable sprints, track focus time, and measure productivity over time.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **IdeaLab** | 8-step AI-guided workflow to break any subject into Kanban-style study sprints |
| 📅 **Smart Planner** | Daily timeline blocks with AI schedule optimization for peak cognitive hours |
| ⏱️ **Focus Sanctuary** | Full-screen Pomodoro timer with distraction logging and ambient soundscapes |
| 📊 **Analytics Dashboard** | Productivity trends, goal completion rates, and session heatmaps |
| ✅ **Task Manager** | Priority-based task CRUD with completion tracking |
| 🎯 **Goal Tracker** | Long-term goal management with milestone breakdowns |
| 🔐 **Auth System** | JWT-based authentication with bcrypt password hashing |
| 🛡️ **Production Security** | Helmet, CORS, rate limiting, and request ID middleware |

---

## 🛠️ Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Markup | Vanilla HTML5 |
| Styling | Tailwind CSS (CDN) + Custom CSS |
| Routing | Custom JS SPA Router |
| State | Vanilla JS Store pattern |
| Icons | Inline SVG |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ (ES Modules) |
| Framework | Express.js 4.x |
| Database | MongoDB Atlas via Mongoose 8.x |
| Auth | JSON Web Tokens (JWT) + bcryptjs |
| Security | Helmet · CORS · express-rate-limit |
| Logging | Morgan |
| Dev | Nodemon |

---

## 📁 Folder Structure

```
StudyFlow-AI/
├── .gitignore              # Monorepo-level ignore rules
├── LICENSE                 # MIT License
├── README.md               # This file
│
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md     # System design & data-flow diagrams
│   ├── API.md              # Full REST API reference
│   └── Sprint-Notes.md     # Development sprint log
│
├── frontend/               # Vanilla HTML/CSS/JS SPA
│   ├── index.html          # Landing page & entry point
│   ├── dashboard.html      # Main productivity dashboard
│   ├── planner.html        # Smart planner view
│   ├── focus.html          # Focus sanctuary timer
│   ├── analytics.html      # Analytics & reporting
│   ├── idealab.html        # AI-guided IdeaLab
│   ├── settings.html       # User settings
│   ├── login.html          # Authentication
│   ├── register.html       # Registration
│   ├── router.js           # Client-side SPA router
│   ├── components/         # Reusable HTML components
│   ├── router/             # Per-page router modules
│   ├── assets/             # SVG icons and static assets
│   └── src/
│       ├── css/            # Base stylesheet
│       └── js/             # Services, store, HTTP client, mocks
│
└── backend/                # Node.js + Express REST API
    ├── src/
    │   ├── app.js          # Express app + security middleware
    │   ├── server.js       # Server bootstrap & DB connection
    │   ├── config/         # Environment config & DB setup
    │   ├── constants/      # HTTP codes, API versioning
    │   ├── controllers/    # Route handler layer
    │   ├── middleware/     # Auth, rate limit, error, request-id
    │   ├── models/         # Mongoose schemas (User, Task, Goal…)
    │   ├── routes/         # Modular Express routers
    │   ├── services/       # Business logic layer
    │   ├── utils/          # AppError, asyncWrapper, jwt helpers
    │   └── validators/     # Input validation schemas
    ├── .env.example        # Environment variable template
    ├── package.json
    └── README.md
```

---

## 🚀 Installation

### Prerequisites
- [Node.js 18+](https://nodejs.org/) and npm
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free tier works)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/syed-imadulla/SudyFlow-Ai.git
cd SudyFlow-Ai
```

---

## 🖥️ Running the Frontend

The frontend is a pure HTML/CSS/JS SPA — no build step required.

### Option A — VS Code Live Server (Recommended)
1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `frontend/index.html` → **Open with Live Server**
3. App opens at `http://127.0.0.1:5500/frontend/index.html`

### Option B — Any static file server
```bash
# Using Python
cd frontend
python3 -m http.server 3000
# Visit http://localhost:3000
```

---

## ⚙️ Running the Backend

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Open .env and fill in your MongoDB URI, JWT secret, etc.

# 4. Start the development server (with hot-reload)
npm run dev

# Production start
npm start
```

The API will be available at `http://localhost:5000/api/v1`

### Verify the server is running
```bash
curl http://localhost:5000/api/v1/health
```
Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": "5.123s",
  "environment": "development"
}
```

---

## 📸 Screenshots

> _Screenshots will be added once the UI is finalized._

| Landing Page | Dashboard | IdeaLab |
|---|---|---|
| _Coming soon_ | _Coming soon_ | _Coming soon_ |

| Smart Planner | Focus Timer | Analytics |
|---|---|---|
| _Coming soon_ | _Coming soon_ | _Coming soon_ |

---

## 🗺️ Project Status & Roadmap

### Completed
- **Phase 2.1**: Base architecture, core data models, user authentication.
- **Phase 2.2**: Goal ↔ Planner Synchronization, scheduling workflows, API error standardization, structured logging, frontend UI consistency.

### Current
**v2.1.0** — Goal ↔ Planner Sync Foundation Complete

### Next (Phase 2.3)
- Focus Mode
- Dashboard Intelligence
- Planner UX
- AI Productivity

### Future Horizons
- AI-generated daily study schedule based on user goals
- Multi-user study rooms & Shared Kanban boards
- Progressive Web App (PWA) / Mobile Apps
- Browser extension for distraction blocking
- Spaced repetition flashcard system

---

## 🤝 Contributing

Contributions are what make open-source projects thrive. Any contribution you make is **greatly appreciated**.

### How to Contribute

1. **Fork** this repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes with a meaningful message
   ```bash
   git commit -m "feat: Add AmazingFeature"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request against `main`

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code restructuring, no feature/fix
- `chore:` — tooling, deps, config

### Code of Conduct
Please be respectful and constructive. See [Contributor Covenant](https://www.contributor-covenant.org/) for guidelines.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for full text.

---

<div align="center">

Made with ❤️ by [syed-imadulla](https://github.com/syed-imadulla)

⭐ Star this repo if you find it useful!

</div>
