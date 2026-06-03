# Security Policy

## Supported Versions

We actively support the following versions of Life OS with security updates:

| Version | Supported | Status |
| ------- | --------- | ------ |
| 1.0.x   | ✅ Yes    | Active development |
| < 1.0   | ❌ No     | Pre-release — not supported |

> **Note:** Only the latest stable release receives security patches. We encourage all users to keep their installations up to date.

---

## Reporting a Vulnerability

### ⚠️ Do NOT report security vulnerabilities through public GitHub issues.

If you discover a security vulnerability in Life OS, please report it responsibly:

### How to Report

1. **Email** the maintainers directly at the security contact listed in the repository
2. **Use GitHub's private vulnerability reporting** — go to the [Security tab](../../security) and click "Report a vulnerability"
3. **Do not** disclose the vulnerability publicly until it has been addressed

### What to Include

Please provide as much of the following information as possible:

- **Description** of the vulnerability and its potential impact
- **Steps to reproduce** the issue
- **Affected versions** (if known)
- **Proof of concept** or exploit code (if available)
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up questions

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Status update | Every 7 days until resolved |
| Fix developed | Depends on severity and complexity |
| Disclosure | After fix is released and users can update |

### What to Expect

- Your report will be **acknowledged within 48 hours**
- A maintainer will **assess the severity** and **assign a priority level**
- We will **keep you informed** of our progress throughout the process
- Once a fix is ready, we will **coordinate disclosure** with you
- You will receive **credit** in the security advisory (unless you prefer to remain anonymous)

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Remote code execution, data exposure, or complete system compromise | 24 hours |
| **High** | Significant data leak, authentication bypass, or privilege escalation | 72 hours |
| **Medium** | Limited data exposure, CSRF, or XSS with user interaction | 5 business days |
| **Low** | Minor information disclosure or denial of service | 10 business days |

---

## Security Best Practices

### For Users

- **Keep Life OS updated** — always run the latest version
- **Review your data exports** — before sharing, ensure no sensitive data is included
- **Secure your environment** — run Life OS on a trusted network
- **Regular backups** — use the export feature to back up your data regularly
- **Environment variables** — never commit `.env` files or expose secrets

### For Developers

- **Never commit secrets** — use `.env.example` for templates, never real credentials
- **Validate all inputs** — both client-side and server-side (API routes)
- **Use parameterized queries** — Prisma ORM handles this, but be careful with raw queries
- **Sanitize user content** — all user-generated content should be properly escaped
- **Follow the principle of least privilege** — API routes should only access necessary data
- **Review dependencies** — keep all dependencies up to date and audit regularly
- **Run `bun run lint`** — ensure code quality checks pass before committing
- **Test with edge cases** — malformed inputs, oversized payloads, and boundary conditions

### Data Privacy

Life OS is designed as a **local-first** application:

- All data is stored locally in **SQLite** — no data is sent to external servers by default
- The AI Insights feature may make external API calls — this is optional and configurable
- Export files contain all your personal data — handle them with care
- No telemetry or analytics are collected by default

### Dependency Security

We regularly audit our dependencies for known vulnerabilities:

```bash
# Check for known vulnerabilities
bun audit

# Update dependencies
bun update
```

If you discover a vulnerability in a dependency, please report it through the same channels listed above.

---

## Responsible Disclosure

We believe in responsible disclosure and are committed to working with the security community to verify and address potential issues. We ask that you:

- **Give us reasonable time** to fix the issue before public disclosure
- **Do not access or modify** other users' data
- **Do not degrade** the quality of service for other users
- **Act in good faith** to avoid privacy violations and disruption

We are committed to:

- **Acknowledging** your report promptly
- **Treating** vulnerability reporters with respect
- **Credit** security researchers in our advisories
- **Not taking legal action** against good-faith reporters

---

## Security Updates

Security updates will be announced through:

- GitHub [Security Advisories](../../security/advisories)
- GitHub [Releases](../../releases) with appropriate tags
- The project's CHANGELOG.md

---

<div align="center">

**Thank you for helping keep Life OS secure! 🔒**

</div>
