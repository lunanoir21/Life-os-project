# Contributing to Life OS

First off, thank you for considering contributing to Life OS! 🎉 It's people like you who make Life OS a great tool for everyone.

This document provides guidelines and instructions for contributing to the project. Please read it carefully before submitting your first contribution.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [License](#license)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## How Can I Contribute?

### Report Bugs

Bug reports help us improve Life OS for everyone. When you create a bug report, please include as many details as possible.

**Before submitting a bug report:**

1. **Search existing issues** to see if the problem has already been reported
2. **Check the documentation** to ensure it's not an intended behavior
3. **Test with the latest version** to see if the bug has already been fixed

**How to submit a good bug report:**

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples (screenshots, error messages, etc.)
- Describe the behavior you observed and what you expected to see
- Include your environment details (OS, browser, Node.js/Bun version)

### Suggest Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the suggested enhancement
- Explain why this enhancement would be useful to most Life OS users
- List some other applications that have this feature, if applicable
- Include mockups or screenshots if relevant

### Contribute Code

1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feature/my-feature`)
3. **Make your changes** with clear, well-documented code
4. **Add tests** if applicable
5. **Commit your changes** using Conventional Commits
6. **Push** to your fork (`git push origin feature/my-feature`)
7. **Open a Pull Request** against the `main` branch

### Improve Documentation

Documentation improvements are always welcome! Whether it's fixing a typo, clarifying a confusing section, or adding entirely new documentation, your contributions help everyone.

---

## Development Setup

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| [Bun](https://bun.sh/) | Latest | ✅ Recommended |
| [Node.js](https://nodejs.org/) | 18+ | ✅ Alternative |
| [Git](https://git-scm.com/) | Latest | ✅ Required |

### Installation

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/life-os.git
cd life-os

# Install dependencies
bun install

# Set up the database
bun run db:push

# Seed with demo data (optional, recommended for development)
bun run db:seed

# Start the development server
bun run dev
```

The development server will start at [http://localhost:3000](http://localhost:3000).

### Development Workflow

1. **Create a feature branch** from `main`
2. **Make your changes** in small, focused commits
3. **Test your changes** locally across different modules
4. **Run the linter** to ensure code quality: `bun run lint`
5. **Push your branch** and create a Pull Request

### Useful Commands

```bash
# Development
bun run dev              # Start dev server

# Database
bun run db:push          # Push schema changes
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Run migrations
bun run db:reset         # Reset database
bun run db:seed          # Seed with demo data

# Code Quality
bun run lint             # Run ESLint

# Build
bun run build            # Production build
bun run start            # Start production server
```

### Project Architecture

```
src/
├── app/api/           → REST API routes (32+ endpoints)
├── components/ui/     → shadcn/ui base components
├── components/lifeos/ → Application components (per-module)
├── stores/            → Zustand state stores
├── hooks/             → Custom React hooks
└── lib/               → Utilities, API client, i18n
```

- **API Routes**: Each module has its own API route directory under `src/app/api/`
- **Components**: Module-specific components live in `src/components/lifeos/<module>/`
- **State**: Zustand stores are in `src/stores/`, one per module
- **Data Fetching**: TanStack Query hooks are in `src/lib/api/hooks.ts`

---

## Code Style

### TypeScript

- Use **strict TypeScript** — avoid `any` types unless absolutely necessary
- Define proper **interfaces and types** for all data structures
- Use **named exports** as the default export style
- Prefer **const assertions** and **enums** where appropriate
- Use **optional chaining** (`?.`) and **nullish coalescing** (`??`) over manual checks

```typescript
// ✅ Good
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
}

// ❌ Bad
const task: any = { id: '1', title: 'Do stuff' };
```

### React Components

- Use **functional components** with hooks
- Follow the **single responsibility principle** — one component, one job
- Use **named exports** for components
- Keep component files focused — extract sub-components when needed
- Use **TypeScript interfaces** for props, not inline types

```typescript
// ✅ Good
interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  // ...
}
```

### Styling

- Use **Tailwind CSS** utility classes — avoid custom CSS unless necessary
- Follow the **shadcn/ui** patterns for component styling
- Use **CSS variables** for theming (accent colors, variants)
- Ensure **dark mode** compatibility for all new components
- Test with **multiple accent colors** and **theme variants**

### ESLint & Prettier

This project uses ESLint for code quality. Please run the linter before submitting:

```bash
bun run lint
```

Key rules:
- No unused variables
- No console.log in production code (use the logging utility instead)
- Proper TypeScript types required
- React hooks rules enforced

---

## Commit Messages

We follow [**Conventional Commits**](https://www.conventionalcommits.org/) specification. This leads to more readable messages and enables automatic changelog generation.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Changes that do not affect the meaning of the code (formatting, etc.) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding missing tests or correcting existing tests |
| `build` | Changes that affect the build system or external dependencies |
| `ci` | Changes to CI configuration files and scripts |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

### Scopes

Use the module name as the scope when applicable:

- `dashboard`, `tasks`, `notes`, `habits`, `journal`, `finance`
- `health`, `goals`, `learning`, `calendar`, `time`, `settings`
- `api`, `db`, `ui`, `theme`, `i18n`, `search`, `cmd`

### Examples

```
feat(tasks): add drag-and-drop reordering for Kanban board
fix(finance): correct budget calculation for monthly recurring expenses
docs(readme): add installation instructions for Windows
refactor(api): extract common error handling middleware
perf(dashboard): optimize weekly review data aggregation
style(ui): adjust spacing in habit streak calendar
test(journal): add unit tests for mood tracking logic
chore(deps): update Framer Motion to v12
```

### Breaking Changes

Breaking changes must be indicated in the commit footer:

```
feat(api): redesign task API response structure

BREAKING CHANGE: Task API now returns `{ data: Task }` instead of `Task` directly.
Update all consumers accordingly.
```

---

## Pull Requests

### Before Submitting

- [ ] Your code passes the linter (`bun run lint`)
- [ ] You've tested your changes locally
- [ ] Your commits follow Conventional Commits format
- [ ] You've updated documentation if needed
- [ ] You've added appropriate types and interfaces
- [ ] Your changes work in both light and dark mode
- [ ] Your changes are compatible with the theming system

### PR Template

When creating a Pull Request, please include:

1. **Description** — What does this PR do and why?
2. **Type of Change** — Bug fix, new feature, refactoring, etc.
3. **Related Issues** — Link any related issues (`Fixes #123`, `Closes #456`)
4. **Screenshots** — If the change is visual, include before/after screenshots
5. **Testing** — How was this change tested?
6. **Checklist** — Confirmation of all pre-submission checks

### PR Guidelines

- **Keep PRs small and focused** — one feature or fix per PR
- **Write clear descriptions** — explain the "why", not just the "what"
- **Respond to reviews promptly** — address feedback within a reasonable timeframe
- **Keep your branch up to date** — rebase on `main` before final merge
- **Don't force-push** after review has started
- **Close your PR** if it's no longer relevant

### Review Process

1. A maintainer will be automatically assigned to review your PR
2. Address any review feedback with new commits (do not amend)
3. Once approved, a maintainer will merge your PR
4. Your contribution will appear in the next release's changelog

---

## Issue Reporting

### Bug Reports

When filing a bug report, please use the following structure:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain the problem.

**Environment:**
 - OS: [e.g., macOS 14, Windows 11]
 - Browser: [e.g., Chrome 120, Firefox 121]
 - Life OS Version: [e.g., 1.0.0]
 - Runtime: [e.g., Bun 1.0, Node.js 20]

**Additional context**
Any other context about the problem.
```

### Security Vulnerabilities

**Do not report security vulnerabilities through public GitHub issues.** Please see our [Security Policy](SECURITY.md) for information on how to responsibly report security issues.

---

## Feature Requests

When submitting a feature request, please include:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. (e.g., I'm always frustrated when...)

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions or features you've considered.

**Additional context**
Any other context, screenshots, or references to other apps that have this feature.
```

### Feature Request Guidelines

- **Search first** — check if the feature has already been requested
- **Be specific** — vague requests are hard to implement
- **Explain the use case** — why would this be valuable to users?
- **One feature per request** — don't bundle multiple features together
- **Be patient** — maintainers will triage and prioritize

---

## License

By contributing to Life OS, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

<div align="center">

**Thank you for contributing to Life OS! 💚**

[⬆ Back to Top](#contributing-to-life-os)

</div>
