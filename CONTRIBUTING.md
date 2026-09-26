# Contributing to SkillBadge

Thanks for your interest! SkillBadge is beginner-friendly — small fixes are very welcome, especially during Hacktoberfest.

## Ways to contribute

- **New security heuristics** — detect more risky patterns in `SKILL.md` files (suspicious URLs, hardcoded secrets, prompt-injection phrases, exfiltration patterns)
- **Badge improvements** — better badge designs, a copy-as-markdown button, new badge styles
- **UI polish** — mobile layout, accessibility, result readability
- **Docs & typos** — clarifications make great first PRs

## Dev setup

```bash
npm install
npm run dev
```

Verify the production build before submitting:

```bash
npm run build
```

## Pull request process

1. Fork the repo and create a branch: `git checkout -b fix/my-change`
2. Make your change and verify `npm run build` passes
3. Open a PR describing **what** changed and **why**

## Ground rules

- **Stay local-first.** No network calls without discussing in an issue first.
- Never silently weaken a security heuristic — explain the reasoning in the PR.
- TypeScript + React, styled with Tailwind. Keep the bundle small.
