<div align="center">

# 🧠 Life OS

### Your Personal Operating System

**A beautiful, local-first personal life management system**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Keyboard Shortcuts](#%EF%B8%8F-keyboard-shortcuts) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

</div>

---

## ✨ Features

### 🧩 11 Powerful Modules

- 📊 **Dashboard** — Overview with stats, weekly activity, mood logger, smart insights, and customizable widgets
- ✅ **Tasks** — Drag-and-drop Kanban board, priorities, smart filtering, and project organization
- 📝 **Notes** — Three-panel layout with folders, markdown editor, tags, and full-text search
- 🔄 **Habits** — Daily tracking, streaks, heatmaps, motivational banners, and completion analytics
- 📔 **Journal** — Timeline view with mood/energy/stress tracking, writing streaks, and guided prompts
- 💰 **Finance** — Accounts, transactions, budgets, categories, and visual charts with trend analysis
- 🎯 **Goals** — Progress rings, milestones, category organization, and deadline tracking
- 📚 **Learning** — Course tracking, progress rings, resource management, and 45+ pre-made learning path templates
- 📅 **Calendar** — Event management with color coding, multiple views, and drag-to-reschedule
- ⏱️ **Time Tracker** — Dual-mode tracking with Pomodoro timer, session history, and productivity analytics
- ⚙️ **Settings** — Profile, appearance, data management, keyboard shortcuts, and import/export

### 🎨 Advanced Theming System

- 🌓 **Dark / Light / System** — Smooth theme transitions that respect your OS preference
- 🎨 **10+ Accent Colors** — Emerald, Teal, Amber, Rose, Violet, Cyan, Indigo, Pink, Lime, Sky + Custom
- 🌈 **8 Theme Variants** — Default, Warm, Cool, Midnight, Forest, Sunset, Lavender, Nord
- 🎯 **Custom Color Picker** — Unlimited personalization with any hex color
- 🔤 **Font Size Control** — Small, Medium, and Large options
- 📐 **UI Density** — Compact, Comfortable, and Spacious layouts
- 🔘 **Border Radius Slider** — Fine-tune corner roundness from sharp to fully rounded
- ✨ **Animation Toggle** — Enable or disable motion for accessibility

### 🚀 Key Capabilities

- ⌘ **Command Palette** — Quick access to everything with `⌘K`
- 🔍 **Global Search** — Search across all modules with highlighted matches
- 🎯 **Focus Mode** — Distraction-free interface (`F11`)
- 📊 **Weekly Review** — Comprehensive analytics and insights across all modules
- 🤖 **AI Insights** — Smart productivity and wellness scoring
- ⌨️ **Keyboard Shortcuts** — Full keyboard navigation for power users
- 💾 **Data Portability** — Export, import, and reset all data with one click
- 🔔 **Notification Center** — Real-time alerts and reminders
- 🏗️ **Setup Wizard** — Personalized onboarding experience
- 📱 **Responsive Design** — Mobile and desktop optimized
- 📚 **Learning Paths** — 45+ pre-made templates for structured skill development
- 📋 **Kanban Board** — Drag-and-drop task management with `@dnd-kit`
- 🍅 **Pomodoro Timer** — Built-in focus sessions with customizable intervals

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) with App Router |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Database** | [Prisma ORM](https://www.prisma.io/) with SQLite |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Runtime** | [Bun](https://bun.sh/) |
| **Deployment** | [Docker](https://www.docker.com/) — multi-stage build, standalone output |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ or [Bun](https://bun.sh/) runtime
- **npm**, **yarn**, or **bun** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/life-os.git
cd life-os

# Install dependencies
bun install

# Set up the database
bun run db:push

# Seed with demo data (optional)
bun run db:seed

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and start managing your life!

### 🐳 Running with Docker

The project ships with a multi-stage `Dockerfile` and a `docker-compose.yml`. The SQLite database is persisted to a named `life-os-data` volume, and the schema is applied automatically on first boot.

```bash
# Build the image and start the container in the background
bun run docker:up        # equivalent to: docker compose up -d --build

# Follow the container logs
bun run docker:logs

# Stop and remove the container
bun run docker:down
```

The app will be available at [http://localhost:3000](http://localhost:3000), with your data stored in the `life-os-data` volume.

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start the development server on port 3000 |
| `bun run build` | Create an optimized production build |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint for code quality checks |
| `bun run db:push` | Push schema changes to the database |
| `bun run db:generate` | Generate the Prisma client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset the database and apply migrations |
| `bun run db:seed` | Seed the database with demo data |
| `bun run docker:build` | Build the production Docker image |
| `bun run docker:up` | Build and start the app with Docker Compose |
| `bun run docker:down` | Stop and remove the Docker containers |
| `bun run docker:logs` | Follow the container logs |

---

## 🏗️ Project Structure

```
life-os/
├── prisma/                    # Database schema and seed data
│   ├── schema.prisma          # Prisma schema definition
│   └── seed.ts                # Demo data seeder
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # 20+ RESTful API endpoints
│   │   │   ├── tasks/         # Task CRUD operations
│   │   │   ├── notes/         # Notes and folders
│   │   │   ├── habits/        # Habit tracking
│   │   │   ├── journal/       # Journal entries
│   │   │   ├── finance/       # Accounts, transactions, budgets
│   │   │   ├── goals/         # Goal management
│   │   │   ├── courses/       # Learning courses
│   │   │   ├── events/        # Calendar events
│   │   │   ├── time-entries/  # Time tracking
│   │   │   ├── data/          # Export, import, reset
│   │   │   ├── ai/            # AI insights
│   │   │   ├── search/        # Global search
│   │   │   └── ...            # And more
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (40+)
│   │   └── lifeos/            # Application components
│   │       ├── dashboard/     # Dashboard widgets and analytics
│   │       ├── tasks/         # Kanban board and task management
│   │       ├── notes/         # Note editor and folder tree
│   │       ├── habits/        # Habit tracker and streaks
│   │       ├── journal/       # Journal timeline and mood tracking
│   │       ├── finance/       # Financial dashboards and charts
│   │       ├── goals/         # Goal progress and milestones
│   │       ├── learning/      # Course tracking and paths
│   │       ├── calendar/      # Calendar views and events
│   │       ├── time/          # Time tracker and Pomodoro
│   │       ├── settings/      # Preferences and data management
│   │       ├── setup/         # Onboarding wizard
│   │       ├── command-palette.tsx
│   │       ├── global-search-panel.tsx
│   │       ├── notification-center.tsx
│   │       ├── focus-mode-overlay.tsx
│   │       ├── keyboard-shortcuts.tsx
│   │       ├── accent-provider.tsx
│   │       ├── app-shell.tsx
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── providers.tsx
│   ├── stores/                # Zustand state stores
│   │   ├── app-store.ts       # Global app state
│   │   ├── task-store.ts      # Tasks state
│   │   ├── note-store.ts      # Notes state
│   │   ├── habit-store.ts     # Habits state
│   │   ├── journal-store.ts   # Journal state
│   │   ├── finance-store.ts   # Finance state
│   │   ├── goal-store.ts      # Goals state
│   │   ├── learning-store.ts  # Learning state
│   │   └── calendar-store.ts  # Calendar state
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-pomodoro.ts    # Pomodoro timer logic
│   │   ├── use-toast.ts       # Toast notifications
│   │   └── use-mobile.ts      # Mobile detection
│   └── lib/                   # Utility functions and API client
│       ├── api/               # API client and TanStack Query hooks
│       ├── i18n/              # Internationalization (EN, TR)
│       ├── learning-paths.ts  # 45+ pre-made learning templates
│       ├── db.ts              # Database client
│       ├── utils.ts           # Utility functions
│       └── toast.ts           # Toast helpers
├── public/                    # Static assets
│   ├── logo.svg               # App logo
│   └── robots.txt             # SEO configuration
├── Dockerfile                 # Multi-stage production image
├── docker-compose.yml         # Container orchestration
├── docker-entrypoint.sh       # Boot script (db push + start)
├── .dockerignore              # Docker build context excludes
├── .env.example               # Environment variables template
├── LICENSE                    # MIT License
└── package.json               # Project manifest
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `⌘K` / `Ctrl+K` | Open Command Palette | Global |
| `F11` | Toggle Focus Mode | Global |
| `⌘/` / `Ctrl+/` | Toggle Dark/Light Theme | Global |
| `Escape` | Close dialogs, palettes, overlays | Global |
| `⌘N` / `Ctrl+N` | Create new item | Module-specific |
| `⌘F` / `Ctrl+F` | Open Global Search | Global |
| `⌘S` / `Ctrl+S` | Save current item | Editor |
| `⌘P` / `Ctrl+P` | Start/Pause Pomodoro | Time Tracker |
| `?` | Show keyboard shortcuts | Global |

---

## 🤝 Contributing

We love contributions! Whether it's a bug fix, new feature, or documentation improvement — every contribution matters.

Please read our [**Contributing Guide**](CONTRIBUTING.md) to get started, and our [**Code of Conduct**](CODE_OF_CONDUCT.md) to understand our community standards.

### Quick Start for Contributors

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/life-os.git
cd life-os

# Install dependencies and set up
bun install
bun run db:push

# Create a feature branch
git checkout -b feature/my-awesome-feature

# Make your changes and commit
git commit -m "feat: add my awesome feature"

# Push and create a Pull Request
git push origin feature/my-awesome-feature
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Life OS Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

Life OS wouldn't be possible without these amazing open-source projects and communities:

- [Next.js](https://nextjs.org/) — The React Framework for the Web
- [shadcn/ui](https://ui.shadcn.com/) — Beautifully designed components
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Prisma](https://www.prisma.io/) — Next-generation ORM
- [Recharts](https://recharts.org/) — Composable charting library
- [Framer Motion](https://www.framer.com/motion/) — Production-ready motion library
- [Zustand](https://zustand.docs.pmnd.rs/) — Bear necessities for state management
- [TanStack Query](https://tanstack.com/query) — Powerful data synchronization
- [@dnd-kit](https://dndkit.com/) — Accessible drag and drop toolkit
- [Lucide](https://lucide.dev/) — Beautiful open-source icons
- [Bun](https://bun.sh/) — Fast JavaScript runtime and toolkit

---

<div align="center">

**Built with ❤️ by [Life OS Contributors](https://github.com/yourusername/life-os/graphs/contributors)**

[⬆ Back to Top](#-life-os)

</div>
