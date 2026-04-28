# Contributing to LaunchIn 48

Thanks for your interest in contributing. Here's how to get started.

## Development Setup

1. Fork and clone the repo
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies: `npm install`
4. Run the dev server: `npm run dev`

## Branch Naming

- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `chore/short-description` — maintenance, deps, config

## Pull Requests

- Keep PRs focused — one concern per PR
- Write a clear description of what changed and why
- Make sure the build passes: `npm run build`
- Run lint before submitting: `npm run lint`

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (OS, Node version, browser)

## Code Style

- TypeScript everywhere (no `.js` in `app/` or `lib/`)
- Prefer named exports
- Keep components small and focused
- No hardcoded secrets or credentials in code
