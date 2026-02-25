# Frontend

React + TypeScript frontend for Vocab-Track.

## Prerequisite
Make sure you have Node.js installed:

- **Node.js version:** 20.13.1 or later
- **NPM version:** 10.7.0 or later (comes with Node.js)

You can check your versions with:

```bash
node -v
npm -v
```
Make sure to add a `.env` file in `frontend/` if it does not exist and provide `VITE_API_BASE`, which is used by the FE to communicate with the BE. For example:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Setup
```bash
cd frontend
npm install
npm run dev
```

## Testing
The frontend uses Vitest with React Testing Library and jsdom for component tests (UI-level integration in jsdom).

If Vitest not installed:
```bash
npm install -D vitest
```

Run tests once (CI-style):
```bash
npm run test:run
```

Run in watch mode (reruns on file changes):
```bash
npm test
```

Run specific test files:
```bash
npm run test:run -- src/services/bookService.test.ts src/pages/flashcard.test.tsx
```

Tests are colocated with source files under `frontend/src/`:
- `src/pages/starting_page.test.tsx`
- `src/pages/login_page.test.tsx`
- `src/pages/flashcard.test.tsx`
- `src/services/authService.test.ts`
- `src/services/bookService.test.ts`

## CI
Frontend tests run in GitHub Actions via the `Frontend Tests` workflow.
- Triggers: pull requests and pushes to `main` (only when `frontend/**` or the workflow file changes)
- Manual runs: available via Actions → `Frontend Tests` (requires the workflow to be on `main`)
- Command used: `npm run test:run`
