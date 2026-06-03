<div align="center">

<br/>

<img src="public/logo.svg" alt="Life OS Logo" width="80" height="80" />

<br/>

# Life OS

**Your Personal Operating System**

A beautiful, local-first life management system — built to keep every corner of your life in one place, without the cloud.

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Bun](https://img.shields.io/badge/Bun-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

<br/>

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Keyboard Shortcuts](#%EF%B8%8F-keyboard-shortcuts) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

<br/>

</div>

---

## ✨ Features

Life OS ships with **11 fully integrated modules** — all offline-first, zero subscriptions, zero data leaving your machine.

### Modules

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Overview stats, weekly activity, mood logger, smart insights, and customizable widgets |
| ✅ **Tasks** | Drag-and-drop Kanban board with priorities, smart filtering, and project organization |
| 📝 **Notes** | Three-panel layout with folders, Markdown editor, tags, and full-text search |
| 🔄 **Habits** | Daily tracking, streaks, heatmaps, motivational banners, and completion analytics |
| 📔 **Journal** | Timeline view with mood/energy/stress tracking, writing streaks, and guided prompts |
| 💰 **Finance** | Accounts, transactions, budgets, categories, and visual charts with trend analysis |
| 🎯 **Goals** | Progress rings, milestones, category organization, and deadline tracking |
| 📚 **Learning** | Course tracking, progress rings, resource management, and 45+ pre-made learning paths |
| 📅 **Calendar** | Event management with color coding, multiple views, and drag-to-reschedule |
| ⏱️ **Time Tracker** | Pomodoro timer, dual-mode tracking, session history, and productivity analytics |
| ⚙️ **Settings** | Profile, appearance, data management, keyboard shortcuts, and import/export |

### Theming

Life OS offers one of the most comprehensive theming systems of any local app:

- **Dark / Light / System** — smooth transitions that respect your OS preference
- **10+ Accent Colors** — Emerald, Teal, Amber, Rose, Violet, Cyan, Indigo, Pink, Lime, Sky, or any custom hex
- **8 Theme Variants** — Default, Warm, Cool, Midnight, Forest, Sunset, Lavender, Nord
- **Font Size** — Small, Medium, Large
- **UI Density** — Compact, Comfortable, Spacious
- **Border Radius** — fine-tune corner roundness with a slider
- **Animation Toggle** — disable motion for accessibility

### Power Features

- **⌘K Command Palette** — jump to anything from anywhere
- **Global Search** — search across all modules with highlighted matches
- **Focus Mode** — distraction-free interface (`F11`)
- **Weekly Review** — comprehensive analytics across all modules
- **AI Insights** — smart productivity and wellness scoring
- **Full Keyboard Navigation** — built for power users
- **Data Portability** — export, import, and reset all data in one click
- **Notification Center** — real-time alerts and reminders
- **Setup Wizard** — guided onboarding on first launch
- **Responsive Design** — fully optimized for mobile and desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) — App Router |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Database** | [Prisma ORM](https://www.prisma.io/) + SQLite |
| **State** | [Zustand](https://zustand.docs.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Runtime** | [Bun](https://bun.sh/) |
| **Deployment** | [Docker](https://www.docker.com/) — multi-stage build, standalone output |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ or [Bun](https://bun.sh/) _(recommended)_

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/life-os.git
cd life-os

# 2. Install dependencies
bun install

# 3. Set up the database
bun run db:push

# 4. (Optional) Seed with demo data
bun run db:seed

# 5. Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're live.

### Docker Setup

The project ships with a multi-stage `Dockerfile` and `docker-compose.yml`. Your SQLite database is persisted to a named `life-os-data` volume and the schema is applied automatically on first boot.

```bash
# Build and start in the background
bun run docker:up

# Follow container logs
bun run docker:logs

# Stop and remove containers
bun run docker:down
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### All Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start the development server on port 3000 |
| `bun run build` | Create an optimized production build |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema changes to the database |
| `bun run db:generate` | Generate the Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset the database and re-apply migrations |
| `bun run db:seed` | Seed the database with demo data |
| `bun run docker:build` | Build the production Docker image |
| `bun run docker:up` | Build and start with Docker Compose |
| `bun run docker:down` | Stop and remove Docker containers |
| `bun run docker:logs` | Follow container logs |

---

## 🏗️ Project Structure

```
life-os/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data seeder
│
├── src/
│   ├── app/
│   │   ├── api/               # 20+ RESTful API endpoints
│   │   │   ├── tasks/
│   │   │   ├── notes/
│   │   │   ├── habits/
│   │   │   ├── journal/
│   │   │   ├── finance/
│   │   │   ├── goals/
│   │   │   ├── courses/
│   │   │   ├── events/
│   │   │   ├── time-entries/
│   │   │   ├── data/          # Export / import / reset
│   │   │   ├── ai/
│   │   │   └── search/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (40+)
│   │   └── lifeos/            # Application components
│   │       ├── dashboard/
│   │       ├── tasks/
│   │       ├── notes/
│   │       ├── habits/
│   │       ├── journal/
│   │       ├── finance/
│   │       ├── goals/
│   │       ├── learning/
│   │       ├── calendar/
│   │       ├── time/
│   │       ├── settings/
│   │       ├── setup/
│   │       ├── command-palette.tsx
│   │       ├── global-search-panel.tsx
│   │       ├── notification-center.tsx
│   │       ├── focus-mode-overlay.tsx
│   │       ├── app-shell.tsx
│   │       ├── sidebar.tsx
│   │       └── header.tsx
│   │
│   ├── stores/                # Zustand state stores
│   │   ├── app-store.ts
│   │   ├── task-store.ts
│   │   ├── note-store.ts
│   │   ├── habit-store.ts
│   │   ├── journal-store.ts
│   │   ├── finance-store.ts
│   │   ├── goal-store.ts
│   │   ├── learning-store.ts
│   │   └── calendar-store.ts
│   │
│   ├── hooks/
│   │   ├── use-pomodoro.ts
│   │   ├── use-toast.ts
│   │   └── use-mobile.ts
│   │
│   └── lib/
│       ├── api/               # API client + TanStack Query hooks
│       ├── i18n/              # Internationalization (EN, TR)
│       ├── learning-paths.ts  # 45+ pre-made learning templates
│       ├── db.ts
│       ├── utils.ts
│       └── toast.ts
│
├── public/
│   ├── logo.svg
│   └── robots.txt
│
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── .env.example
└── package.json
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `⌘F` / `Ctrl+F` | Open Global Search |
| `⌘N` / `Ctrl+N` | Create new item |
| `⌘S` / `Ctrl+S` | Save current item |
| `⌘/` / `Ctrl+/` | Toggle Dark / Light theme |
| `⌘P` / `Ctrl+P` | Start / Pause Pomodoro |
| `F11` | Toggle Focus Mode |
| `?` | Show all keyboard shortcuts |
| `Escape` | Close dialogs, palettes, overlays |

---

## 🤝 Contributing

Contributions of all kinds are welcome — bug fixes, features, documentation, translations.

Please read the [Contributing Guide](CONTRIBUTING.md) before opening a PR, and the [Code of Conduct](CODE_OF_CONDUCT.md) to understand our community standards.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/life-os.git
cd life-os

# Install dependencies
bun install && bun run db:push

# Create a feature branch
git checkout -b feat/my-feature

# Commit and push
git commit -m "feat: add my feature"
git push origin feat/my-feature
```

Then open a Pull Request — we'll review it promptly.

---

## 📄 License

Licensed under the [MIT License](LICENSE). You're free to use, modify, and distribute this software.

---

## 🙏 Acknowledgments

Life OS stands on the shoulders of these excellent open-source projects:

[Next.js](https://nextjs.org/) · [shadcn/ui](https://ui.shadcn.com/) · [Tailwind CSS](https://tailwindcss.com/) · [Prisma](https://www.prisma.io/) · [Recharts](https://recharts.org/) · [Framer Motion](https://www.framer.com/motion/) · [Zustand](https://zustand.docs.pmnd.rs/) · [TanStack Query](https://tanstack.com/query) · [@dnd-kit](https://dndkit.com/) · [Lucide](https://lucide.dev/) · [Bun](https://bun.sh/)

---

<div align="center">

Built with ❤️ by [Life OS Contributors](https://github.com/yourusername/life-os/graphs/contributors)

[⬆ Back to top](#life-os)

</div>
